/* =========================================================
   El falı — avuç fotoğrafını Claude'a gönderir, Türkçe yorum döndürür.
   - API anahtarı Netlify ortam değişkeninden okunur: ANTHROPIC_API_KEY
   - Yalnızca bu sitenin sayfalarından gelen istekler kabul edilir.
   - Yanıt sabit bir JSON şemasıyla gelir (el_mi, mesaj, hayat, kalp, akil, kader, genel).
   ========================================================= */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // ANTHROPIC_API_KEY ortam değişkenini kullanır

const MAX_IMAGE_CHARS = 2_500_000; // ~1.8 MB'lık JPEG (base64)

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

  let body;
  try { body = await req.json(); } catch { return json(400, { hata: "Geçersiz istek." }); }
  const image = typeof body?.image === "string" ? body.image : "";
  if (!image || image.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return json(400, { hata: "Fotoğraf okunamadı ya da çok büyük." });
  }

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // güvenlik nedeniyle reddedilirse Anthropic'in önerdiği modelde yeniden dener
      output_config: {
        effort: "low", // kısa bir yorum: beklemeyi kısaltır
        format: { type: "json_schema", schema: SCHEMA }
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "Bu avucun falına bakar mısın?" }
          ]
        }
      ]
    });

    if (response.stop_reason === "refusal") {
      return json(422, { hata: "Bu fotoğrafla fal bakılamadı. Başka bir fotoğraf dener misin?" });
    }
    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) return json(502, { hata: "Yorum alınamadı. Biraz sonra tekrar dene." });
    return json(200, JSON.parse(text));
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY eksik ya da geçersiz");
      return json(500, { hata: "Fal servisi henüz ayarlanmadı." });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return json(429, { hata: "Şu an çok yoğun. Birkaç dakika sonra tekrar dene." });
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("Hatalı istek:", error.message);
      return json(400, { hata: "Fotoğraf işlenemedi. Başka bir fotoğraf dener misin?" });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`API hatası ${error.status}:`, error.message);
      return json(502, { hata: "Fal servisine ulaşılamadı. Biraz sonra tekrar dene." });
    }
    console.error(error);
    return json(500, { hata: "Beklenmedik bir hata oluştu." });
  }
};

export const config = { path: "/api/el-fali" };
