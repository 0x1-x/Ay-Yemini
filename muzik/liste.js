/* =========================================================
   Çalma listeleri — her mektup kendi temasının şarkılarını çalar
   - past   (Geçmiş): giriş sayfası ve ilk mektup
   - now    (Şimdi):  ikinci mektup
   - future (Gelecek): üçüncü mektup
   Her liste kendi içinde sırayla çalar, bitince başa döner.
   Şarkı dosyalarını bu klasöre (muzik/) koy ve "dosya" alanına yolunu yaz.
   ========================================================= */
// Çalarda yuvarlağın içinde duran kapak fotoğrafı (şarkı değişse de aynı kalır).
// Boş bırakılırsa (null) hilal görünür.
window.ZBI_KAPAK='/muzik/kapak.jpg';

// Her temada tek şarkı vardır; şarkı bitince başa dönüp yeniden çalar.
window.ZBI_LISTE={
  past:  [ { baslik:'Kör',        sanatci:'Canfeza', dosya:'/muzik/kor.mp3' } ],
  now:   [ { baslik:'Dem',        sanatci:'Canfeza', dosya:'/muzik/dem.mp3' } ],
  future:[ { baslik:'Hoş geldin', sanatci:'Canfeza', dosya:'/muzik/hos-geldin.mp3' } ]
};
