/* =========================================================
   El falı — avuç fotoğrafını Gemini'ye gönderir, Türkçe yorum döndürür.
   - API anahtarı Netlify ortam değişkeninden okunur: GEMINI_API_KEY
   - Model isteğe bağlı olarak GEMINI_MODEL ile değiştirilebilir.
   - Yalnızca bu sitenin sayfalarından gelen istekler kabul edilir.
   - Yanıt sabit bir JSON şemasıyla gelir (el_mi, mesaj, hayat, kalp, akil, kader, genel).
   ========================================================= */
import { GoogleGenAI, ApiError, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Ana model yoğunsa sırayla yedeklere geçilir (Netlify'da GEMINI_MODEL / GEMINI_FALLBACK_MODELS ile değiştirilebilir)
// Hafif "flash-lite" modelleri hızlı ve yoğunluktan daha az etkileniyor; ana flash modelleri yedekte
const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  ...(process.env.GEMINI_FALLBACK_MODELS || "gemini-3.1-flash-lite,gemini-3.8-flash,gemini-3.5-flash").split(",")
].map((m) => m.trim()).filter((m, i, a) => m && a.indexOf(m) === i);

const MAX_IMAGE_CHARS = 2_500_000; // ~1.8 MB'lık JPEG (base64)
// Netlify fonksiyonu ~30 sn'de kesilir; bütün denemeler bu ortak süre içinde biter
const TOTAL_BUDGET_MS = 25_000;
// Tek bir model bütün süreyi tüketmesin: her deneme en fazla bu kadar sürer
const PER_MODEL_MS = 12_000;

// Düşünme ayarı model ailesine göre: lite modellerde gönderilmez (zaten az düşünürler),
// 2.x'te kapalı, diğer 3.x modellerinde düşük seviye (MINIMAL desteklenmiyor)
const thinkingFor = (model) =>
  /lite/.test(model) ? undefined
  : /gemini-2\./.test(model) ? { thinkingBudget: 0 }
  : { thinkingLevel: ThinkingLevel.LOW };

// Yoğunluk, kota, zaman aşımı ya da modelin bulunamaması: bir sonraki modele geç
const isRetryable = (error) =>
  (error instanceof ApiError && [404, 429, 500, 503, 504].includes(error.status)) ||
  error?.name === "AbortError" || error?.name === "TimeoutError" ||
  /timed? ?out|aborted/i.test(String(error?.message));

const SCHEMA = {
  type: "object",
  properties: {
    el_mi:  { type: "boolean", description: "Fotoğrafta okunabilir bir avuç içi var mı" },
    mesaj:  { type: "string",  description: "el_mi false ise kısa, nazik bir açıklama; değilse boş" },
    hayat:  { type: "string",  description: "Hayat çizgisi: görünen özellik ve yorumu" },
    kalp:   { type: "string",  description: "Kalp çizgisi: görünen özellik ve yorumu" },
    akil:   { type: "string",  description: "Akıl çizgisi: görünen özellik ve yorumu" },
    kader:  { type: "string",  description: "Kader çizgisi: görünen özellik ve yorumu; belirgin değilse bunu söyle" },
    genel:  { type: "string",  description: "Elin bütününden kısa, sıcak bir kapanış yorumu" }
  },
  required: ["el_mi", "mesaj", "hayat", "kalp", "akil", "kader", "genel"],
  additionalProperties: false
};

const SYSTEM = `Sen sıcak, zarif ve şiirsel bir dille el falı bakan bir yorumcusun. Bu okuma, sevgilisine hediye olarak hazırlanmış kişisel bir sitede, eğlence ve keyif amaçlı yapılıyor.

Fotoğraftaki avucu geleneksel el falı (palmistri) bilgisiyle oku: hayat, kalp, akıl ve kader çizgilerinin uzunluğuna, derinliğine, kıvrımına, başlangıç ve bitiş noktalarına, kesintilerine ve dallanmalarına bak. Her bölümde önce o çizgide gerçekten gördüğün özelliği kısaca söyle, sonra geleneksel anlamına göre yorumla. Gerçekten görmediğin bir ayrıntıyı uydurma; bir çizgi belirgin değilse bunu nazikçe belirt.

Ton: Türkçe, "sen" diye hitap eden, yumuşak, umutlu ve içten. Her bölüm 2-3 cümle. Sağlık, hastalık, ölüm, ömür süresi, çocuk sayısı veya ayrılık gibi kehanetlerde bulunma; zor görünen bir işareti büyüme ve güç olarak anlat.

Fotoğrafta okunabilir bir avuç içi yoksa (el yoksa, elin arkası görünüyorsa, çok bulanık ya da karanlıksa) el_mi false yap, mesaj alanına nasıl daha iyi bir fotoğraf çekileceğini tek cümleyle yaz ve diğer alanları boş bırak.`;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

// Yalnızca bu sitenin kendi adreslerinden gelen istekleri kabul et
function allowedOrigin(req) {
  const origin = req.headers.get("origin") || "";
  if (!origin) return false;
  const allowed = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL]
    .filter(Boolean)
    .map((u) => new URL(u).origin);
  if (process.env.CONTEXT === "dev") allowed.push("http://localhost:8888");
  return allowed.includes(origin);
}

export default async (req) => {
  // GEÇİCİ teşhis: x-teshis başlığıyla yapılan GET, anahtarla kullanılabilen modelleri listeler
  if (req.method === "GET" && req.headers.get("x-teshis") === "1" && process.env.GEMINI_API_KEY) {
    try {
      const names = [];
      for await (const m of await ai.models.list()) {
        if ((m.supportedActions || []).includes("generateContent")) names.push(m.name);
      }
      return json(200, { modeller: names });
    } catch (e) {
      return json(500, { hata: String(e?.message || e).slice(0, 300) });
    }
  }
  if (req.method !== "POST") return json(405, { hata: "Yalnızca POST kabul edilir." });
  if (!allowedOrigin(req)) return json(403, { hata: "Bu istek kabul edilmedi." });
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY tanımlı değil");
    return json(500, { hata: "Fal servisi henüz ayarlanmadı." });
  }

  let body;
  try { body = await req.json(); } catch { return json(400, { hata: "Geçersiz istek." }); }
  const image = typeof body?.image === "string" ? body.image : "";
  if (!image || image.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return json(400, { hata: "Fotoğraf okunamadı ya da çok büyük." });
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const generate = async (model) => {
    const left = deadline - Date.now();
    if (left < 2500) throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
    return ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: image } },
            { text: "Bu avucun falına bakar mısın?" }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseJsonSchema: SCHEMA,
        maxOutputTokens: 1500,
        thinkingConfig: thinkingFor(model),
        // Kalan süreyi kullan; yeniden denemeyi SDK yerine model değiştirerek yap
        httpOptions: { timeout: Math.min(left - 500, PER_MODEL_MS), retryOptions: { attempts: 1 } }
      }
    });
  };

  try {
    let response, lastError;
    const attempts = []; // GEÇİCİ teşhis için her denemenin özeti
    for (const model of MODELS) {
      const t0 = Date.now();
      try {
        response = await generate(model);
        attempts.push({ model, sonuc: "ok", ms: Date.now() - t0 });
        console.log(`El falı yanıtı: ${model}`);
        break;
      } catch (error) {
        lastError = error;
        attempts.push({ model, sonuc: error?.status || error?.name, ms: Date.now() - t0, mesaj: String(error?.message).slice(0, 160) });
        console.warn(`${model} kullanılamadı:`, error?.status || error?.name, String(error?.message).slice(0, 200));
        if (!isRetryable(error) || deadline - Date.now() < 2500) break;
      }
    }
    if (!response) {
      if (req.headers.get("x-teshis") === "1") return json(502, { hata: "Teşhis", denemeler: attempts });
      throw lastError;
    }

    // Güvenlik filtresi istemi ya da yanıtı durdurduysa metin boş gelir
    const text = response.text;
    if (response.promptFeedback?.blockReason || !text) {
      return json(422, { hata: "Bu fotoğrafla fal bakılamadı. Başka bir fotoğraf dener misin?" });
    }
    return json(200, JSON.parse(text));
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Gemini API hatası ${error.status}:`, error.message);
      if (error.status === 429 || error.status === 503) {
        // GEÇİCİ teşhis: yalnızca x-teshis başlığıyla gelen isteklerde Google'ın mesajını döndür
        const detay = req.headers.get("x-teshis") === "1" ? `${error.status} ${String(error.message).slice(0, 800)}` : undefined;
        return json(503, { hata: "Fal servisi şu an çok yoğun. Birkaç dakika sonra tekrar dene.", detay });
      }
      if (error.status === 401 || error.status === 403 || /API key/i.test(error.message)) {
        return json(500, { hata: "Fal servisi henüz ayarlanmadı." });
      }
      if (error.status === 400) {
        // GEÇİCİ teşhis: yalnızca x-teshis başlığıyla gelen isteklerde Google'ın mesajını döndür
        const detay = req.headers.get("x-teshis") === "1" ? String(error.message).slice(0, 600) : undefined;
        return json(400, { hata: "Fotoğraf işlenemedi. Başka bir fotoğraf dener misin?", detay });
      }
      return json(502, { hata: "Fal servisine ulaşılamadı. Biraz sonra tekrar dene." });
    }
    // Gemini süre sınırı içinde yanıt vermedi
    if (error?.name === "AbortError" || error?.name === "TimeoutError" || /timed? ?out|aborted/i.test(String(error?.message))) {
      console.error("Gemini zaman aşımı");
      return json(504, { hata: "Yorum beklenenden uzun sürdü. Birkaç dakika sonra tekrar dene." });
    }
    if (error instanceof SyntaxError) {
      console.error("Yanıt JSON olarak okunamadı");
      return json(502, { hata: "Yorum alınamadı. Biraz sonra tekrar dene." });
    }
    console.error(error);
    return json(500, { hata: "Beklenmedik bir hata oluştu." });
  }
};

export const config = { path: "/api/el-fali" };
