/* =========================================================
   Zamandan bir iz — her sayfada çalışan ortak kod
   ========================================================= */
// Telefonda saklanan bilgilerin anahtarları
window.ZBI={
  KEY_PROGRESS:'zamandan-bir-iz:acilan', // açılan en son mektup
  KEY_GATE:'zamandan-bir-iz:kapi',       // şifre bir kez doğru girildi mi
  KEY_MUSIC:'zamandan-bir-iz:muzik',     // çalan şarkı, yeri, ses düzeyi
  KEY_DONE:'zamandan-bir-iz:tamamlandi'   // üçüncü mektubun saat sahnesi sonuna kadar izlendi mi
};

// Hediyeden önce deneme yapabilmek için: adresin sonuna ?sifirla eklenirse
// ilerleme, şifre ve müzik bilgisi silinir.
if(new URLSearchParams(location.search).has('sifirla')){
  try{ Object.values(window.ZBI).forEach(k=>localStorage.removeItem(k)); }catch(e){}
  history.replaceState(null,'',location.pathname);
}

/* ---------- Yıldızlar: birlikte geçen her ay için bir yıldız ----------
   Başlangıç tarihi <html data-since="YYYY-MM-DD">'den okunur. Sayı
   telefonun tarihine göre hesaplanır; her ay bir yıldız eklenir.
   Konumlar sabittir: aynı yıldız her açılışta aynı yerde durur. */
(function(){
  const since=(document.documentElement.dataset.since||'2026-10-17').split('-').map(Number);
  const now=new Date();
  let months=(now.getFullYear()-since[0])*12+(now.getMonth()-(since[1]-1));
  if(now.getDate()<since[2]) months--;
  const count=Math.max(1,Math.min(months+1,120)); // içinde bulunulan ay da sayılır
  // Basit, tohumlu rastgele sayı üreteci: her yıldız hep aynı yere düşer
  let seed=1710;
  const rand=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
  const sky=document.createElement('div');
  sky.className='sky';
  sky.setAttribute('aria-hidden','true');
  for(let i=0;i<count;i++){
    const s=document.createElement('span');
    const size=1+rand()*1.4;
    s.style.left=(4+rand()*92).toFixed(2)+'%';
    s.style.top=(3+rand()*62).toFixed(2)+'%';
    s.style.width=s.style.height=size.toFixed(2)+'px';
    s.style.setProperty('--o',(0.35+rand()*0.4).toFixed(2));
    s.style.animationDelay=(-rand()*8).toFixed(2)+'s';
    s.style.animationDuration=(6+rand()*6).toFixed(2)+'s';
    sky.appendChild(s);
  }
  document.body.prepend(sky);
})();
