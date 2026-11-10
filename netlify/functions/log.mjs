const MEKTUP = { 1: "İlk", 2: "İkinci", 3: "Üçüncü" };

const OLAYLAR = {
  giris:            () => "🌙 Siteye giriş yapıldı",
  sifre:            () => "🔑 Şifre doğru girildi",
  mektuba_gec:      () => "✉️ “Mektuba geç” düğmesine basıldı",
  mektup_acildi:    (e) => `📄 ${MEKTUP[e.mektup]} mektup sayfası açıldı`,
  mektup_kilitli:   (e) => `🔒 ${MEKTUP[e.mektup]} mektup sayfası sırası gelmeden açıldı`,
  muhur_kirildi:    (e) => `🔓 ${MEKTUP[e.mektup]} mektubun mührü kırıldı`,
  mektup_okundu:    (e) => `📖 ${MEKTUP[e.mektup]} mektup açıldı`,
  mektup_muhurlendi:(e) => `🕯️ ${MEKTUP[e.mektup]} mektup tekrar mühürlendi`,
  saat_bitti:       (e) => `🕰️ ${MEKTUP[e.mektup]} mektubun saat sahnesi tamamlandı`,
  menu_acildi:      () => "🌕 Üçüncü kart yeniden okutuldu, menü açıldı",
  son_acildi:       () => "🎶 Son sayfa açıldı",
  muzik_basladi:    () => "▶️ Son şarkı başlatıldı",
  muzik_bitti:      () => "⏹️ Son şarkı bitti",
  fal_dugme:        () => "✨ “Geleceğe bir de yıldızlarla bakalım mı?” düğmesine basıldı",
  fal_acildi:       () => "🔮 Fal sayfası açıldı",
  tarot_sekme:      () => "🃏 Tarot bölümüne geçildi",
  tarot_karistirildi: () => "🃏 Tarot destesi karıştırıldı",
  tarot_acildi:     (e) => `🃏 Tarot kartları açıldı: ${e.kartlar}`,
  tarot_tekrar:     () => "🃏 Günün tarot açılımına yeniden bakıldı",
  kahve_sekme:      () => "☕ Kahve falı bölümüne geçildi",
  kahve_fincan:     (e) => `☕ ${e.fincan}. fincan açıldı`,
  kahve_okundu:     (e) => `☕ ${e.fincan}. fincan · ${e.ai} yorumu okundu`,
  el_sekme:         () => "✋ El falı bölümüne geçildi",
  el_foto:          (e) => e.kaynak === "dosya" ? "✋ El falı için dosya seçildi" : "✋ El falı için fotoğraf çekildi",
  el_analiz:        () => "✋ El falı analizi yapıldı",
  el_gecersiz:      () => "✋ El falı: fotoğrafta avuç seçilemedi, yeniden istendi",
  el_hata:          () => "✋ El falı: servis yanıt vermedi",
  el_yeniden:       () => "✋ El falına yeniden bakılmak istendi",
  el_tekrar:        () => "✋ Günün el falı okumasına yeniden bakıldı"
};

const TAROT = /^[A-Za-zÇĞİÖŞÜçğıöşüÂâ ·:()]{1,160}$/;
const AI = ["Claude", "Gemini", "ChatGPT"];

const json = (status, body) =>
  new Response(body ? JSON.stringify(body) : null, { status, headers: { "content-type": "application/json; charset=utf-8" } });

function allowedOrigin(req) {
  const origin = req.headers.get("origin") || "";
  if (!origin) return false;
  const allowed = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL]
    .filter(Boolean)
    .map((u) => new URL(u).origin);
  return allowed.includes(origin);
}

function clean(body) {
  const e = {};
  if ([1, 2, 3].includes(Number(body.mektup))) e.mektup = Number(body.mektup);
  if ([1, 2].includes(Number(body.fincan))) e.fincan = Number(body.fincan);
  if (AI.includes(body.ai)) e.ai = body.ai;
  if (["kamera", "dosya"].includes(body.kaynak)) e.kaynak = body.kaynak;
  if (typeof body.kartlar === "string" && TAROT.test(body.kartlar)) e.kartlar = body.kartlar;
  return e;
}

function needs(olay, e) {
  if (["mektup_acildi", "mektup_kilitli", "muhur_kirildi", "mektup_okundu", "mektup_muhurlendi", "saat_bitti"].includes(olay)) return !!e.mektup;
  if (olay === "kahve_fincan") return !!e.fincan;
  if (olay === "kahve_okundu") return !!(e.fincan && e.ai);
  if (olay === "tarot_acildi") return !!e.kartlar;
  return true;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { hata: "Yalnızca POST kabul edilir." });
  if (!allowedOrigin(req)) return json(403, { hata: "Bu istek kabul edilmedi." });
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return json(204);

  let body;
  try { body = await req.json(); } catch { return json(400, { hata: "Geçersiz istek." }); }
  const olay = typeof body?.olay === "string" ? body.olay : "";
  const yaz = OLAYLAR[olay];
  const e = clean(body || {});
  if (!yaz || !needs(olay, e)) return json(400, { hata: "Bilinmeyen olay." });

  const zaman = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
  }).format(new Date());
  const content = `${yaz(e)} · ${zaman}`;

  try {
    const r = await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "Zamandan bir iz", content, allowed_mentions: { parse: [] } })
    });
    if (!r.ok) console.error("Discord webhook hatası:", r.status);
  } catch (err) {
    console.error("Discord webhook'a ulaşılamadı:", err?.message);
  }
  return json(204);
};

export const config = { path: "/api/log" };
