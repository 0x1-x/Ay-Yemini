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
  // Söz zamanlama ve düzenleme araçları (/eslik?zamanla, /eslik?duzenle) bilgisayarda da açılabilsin
  var timerTool=/[?&](zamanla|duzenle)/.test(location.search);
  if(!isPhone && !timerTool) document.documentElement.classList.add('not-phone');
  // Şifre gerektiren sayfa (ilk mektup) şifre girilmeden açılırsa giriş sayfasına dön
  if(isPhone && document.documentElement.dataset.kapi==='gerekli'){
    var ok=true;
    try{ ok=localStorage.getItem('zamandan-bir-iz:kapi')==='1'; }catch(e){}
    if(!ok) location.replace('/'+location.search);
  }
})();
