(function(){
  var ua=navigator.userAgent||'';
  var shortSide=Math.min(screen.width,screen.height);
  var coarse=window.matchMedia&&matchMedia('(pointer: coarse)').matches;
  var mobileUA=/iPhone|iPod|Android.+Mobile|Mobile.+Android|Windows Phone/i.test(ua);
  var iPhoneAsDesktop=/Macintosh/.test(ua)&&navigator.maxTouchPoints>1&&shortSide<=540;
  var isPhone=(mobileUA||iPhoneAsDesktop)&&coarse&&shortSide<=540;
  if(!isPhone) document.documentElement.classList.add('not-phone');
  if(isPhone && document.documentElement.dataset.kapi==='gerekli'){
    var ok=true;
    try{ ok=localStorage.getItem('zamandan-bir-iz:kapi')==='1'; }catch(e){}
    if(!ok) location.replace('/'+location.search);
  }
})();
