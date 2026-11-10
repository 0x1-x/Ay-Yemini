/* Yalnızca telefon: sayfa çizilmeden önce çalışır.
   Telefon değilse <html> öğesine .not-phone eklenir ve CSS mektubu gizler.
   Not: Bu bir deneyim kuralıdır, tam bir güvenlik önlemi değildir. */
(function(){
  var ua=navigator.userAgent||'';
  var shortSide=Math.min(screen.width,screen.height);
  var coarse=window.matchMedia&&matchMedia('(pointer: coarse)').matches;
  var mobileUA=/iPhone|iPod|Android.+Mobile|Mobile.+Android|Windows Phone/i.test(ua);
  // iPhone'da "Masaüstü sitesini iste" açıksa Safari kendini Mac olarak tanıtır
  var iPhoneAsDesktop=/Macintosh/.test(ua)&&navigator.maxTouchPoints>1&&shortSide<=540;
  var isPhone=(mobileUA||iPhoneAsDesktop)&&coarse&&shortSide<=540;
  if(!isPhone) document.documentElement.classList.add('not-phone');
})();
