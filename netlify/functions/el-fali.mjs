/* =========================================================
   El falı — avuç fotoğrafını Gemini'ye gönderir, Türkçe yorum döndürür.
   - API anahtarı Netlify ortam değişkeninden okunur: GEMINI_API_KEY
   - Model isteğe bağlı olarak GEMINI_MODEL ile değiştirilebilir.
   - Yalnızca bu sitenin sayfalarından gelen istekler kabul edilir.
   - Yanıt sabit bir JSON şemasıyla gelir (el_mi, mesaj, hayat, kalp, akil, kader, genel).
   ========================================================= */
import { GoogleGenAI, ApiError, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const MAX_IMAGE_CHARS = 2_500_000; // ~1.8 MB'lık JPEG (base64)
// Netlify fonksiyonu ~30 sn'de kesilir; Gemini'ye ondan önce dolan bir süre tanı
const GEMINI_TIMEOUT_MS = 22_000;

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

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
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
        // Kısa bir yorum için uzun düşünmeye gerek yok: yanıt süresini kısaltır
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        // Süreyi sınırla; yoğunlukta en fazla bir kez, kısa bekleyerek yeniden dene
        httpOptions: {
          timeout: GEMINI_TIMEOUT_MS,
          retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 2 }
        }
      }
    });

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
        return json(503, { hata: "Fal servisi şu an çok yoğun. Birkaç dakika sonra tekrar dene." });
      }
      if (error.status === 401 || error.status === 403 || /API key/i.test(error.message)) {
        return json(500, { hata: "Fal servisi henüz ayarlanmadı." });
      }
      if (error.status === 400) return json(400, { hata: "Fotoğraf işlenemedi. Başka bir fotoğraf dener misin?" });
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
