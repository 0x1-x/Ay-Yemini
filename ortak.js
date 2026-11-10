window.ZBI={
  KEY_PROGRESS:'zamandan-bir-iz:acilan',
  KEY_GATE:'zamandan-bir-iz:kapi',
  KEY_MUSIC:'zamandan-bir-iz:muzik',
  KEY_DONE:'zamandan-bir-iz:tamamlandi',
  KEY_TAROT:'zamandan-bir-iz:tarot',
  KEY_PALM:'zamandan-bir-iz:elfali'
};

if(new URLSearchParams(location.search).has('sifirla')){
  try{ Object.values(window.ZBI).forEach(k=>localStorage.removeItem(k)); }catch(e){}
  history.replaceState(null,'',location.pathname);
}

(function(){
  const since=(document.documentElement.dataset.since||'2026-10-17').split('-').map(Number);
  const now=new Date();
  let months=(now.getFullYear()-since[0])*12+(now.getMonth()-(since[1]-1));
  if(now.getDate()<since[2]) months--;
  const count=Math.max(1,Math.min(months+1,120));
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
