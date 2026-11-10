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

// Gerçek dosyalar yüklenene kadar deneme sesleri çalar.
// Yüklenecek dosya adları: kor.mp3, col.mp3, kasagi.mp3, dem.mp3, paha.mp3,
// hos-geldin.mp3, yar-ve-efsun.mp3, gel.mp3
window.ZBI_LISTE={
  past:[
    { baslik:'Kör',          sanatci:'Canfeza', dosya:'/muzik/ornek-1.mp3' }, // → /muzik/kor.mp3
    { baslik:'Çöl',          sanatci:'Canfeza', dosya:'/muzik/ornek-2.mp3' }  // → /muzik/col.mp3
  ],
  now:[
    { baslik:'Kaşağı',       sanatci:'Canfeza', dosya:'/muzik/ornek-3.mp3' }, // → /muzik/kasagi.mp3
    { baslik:'Dem',          sanatci:'Canfeza', dosya:'/muzik/ornek-1.mp3' }, // → /muzik/dem.mp3
    { baslik:'Paha',         sanatci:'Canfeza', dosya:'/muzik/ornek-2.mp3' }  // → /muzik/paha.mp3
  ],
  future:[
    { baslik:'Hoş geldin',   sanatci:'Canfeza', dosya:'/muzik/ornek-3.mp3' }, // → /muzik/hos-geldin.mp3
    { baslik:'Yar ve Efsun', sanatci:'Canfeza', dosya:'/muzik/ornek-1.mp3' }, // → /muzik/yar-ve-efsun.mp3
    { baslik:'Gel',          sanatci:'Canfeza', dosya:'/muzik/ornek-2.mp3' }  // → /muzik/gel.mp3
  ]
};
