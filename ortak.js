window.ZBI={
  KEY_PROGRESS:'zamandan-bir-iz:acilan',
  KEY_GATE:'zamandan-bir-iz:kapi',
  KEY_MUSIC:'zamandan-bir-iz:muzik',
  KEY_DONE:'zamandan-bir-iz:tamamlandi',
  KEY_TAROT:'zamandan-bir-iz:tarot',
  KEY_PALM:'zamandan-bir-iz:elfali'
};

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

window.ZBILog=function(olay,detay){
  try{
    if(document.documentElement.classList.contains('not-phone')) return;
    const body=JSON.stringify(Object.assign({olay},detay||{}));
    fetch('/api/log',{method:'POST',headers:{'content-type':'application/json'},body,keepalive:true}).catch(()=>{});
  }catch(e){}
};

(function(){
  const IZLER=[
    {url:'https://merakinotesi.vercel.app',ad:'Sana bir şey daha hazırladım'},
    {url:'https://birtesaduf.vercel.app',ad:'Sana bir şey hazırladım'},
    {url:'https://bir-cocukluk.vercel.app',ad:'Bu gece lunapark senin'},
    {url:'https://firtinadan-sonra.vercel.app',ad:'Fırtınadan Sonra'}
  ];
  if(document.documentElement.classList.contains('not-phone')) return;
  const log=(olay,d)=>window.ZBILog&&window.ZBILog(olay,d);

  const star=document.createElement('button');
  star.type='button';
  star.className='iz-star';
  star.setAttribute('aria-label','Parlayan yıldız');
  star.innerHTML='<span aria-hidden="true"></span>';

  const dlg=document.createElement('dialog');
  dlg.className='iz-dialog';
  dlg.setAttribute('aria-labelledby','izTitle');
  dlg.innerHTML=`
    <div class="iz-inner" tabindex="-1" autofocus>
      <button type="button" class="iz-close" aria-label="Kapat">×</button>
      <div class="eyebrow">Zamandan bir iz</div>
      <h2 id="izTitle">Daha eski izler</h2>
      <p class="iz-lead">Bu izden önce de izler vardı.</p>
      <ol class="iz-list">
        ${IZLER.map((z,i)=>`<li><a href="${z.url}" target="_blank" rel="noopener" data-i="${i+1}"><span class="iz-no">${['I','II','III','IV'][i]}</span><span class="iz-ad">${z.ad}<small>${new URL(z.url).hostname.split('.')[0]}</small></span><span class="iz-go" aria-hidden="true">↗</span></a></li>`).join('')}
      </ol>
    </div>`;

  document.body.append(star,dlg);
  const open=()=>{
    if(typeof dlg.showModal==='function') dlg.showModal(); else dlg.setAttribute('open','');
    star.classList.add('found');
    log('iz_yildiz');
  };
  const close=()=>{ if(dlg.open) dlg.close(); else dlg.removeAttribute('open'); };
  star.addEventListener('click',open);
  dlg.querySelector('.iz-close').addEventListener('click',close);
  dlg.addEventListener('click',e=>{ if(e.target===dlg) close(); });
  dlg.querySelectorAll('.iz-list a').forEach(a=>a.addEventListener('click',()=>log('iz_site',{site:Number(a.dataset.i)})));
})();

(function(){
  const START={y:2026,m:9,d:17};
  const NOT='';
  if(document.documentElement.classList.contains('not-phone')) return;
  const log=(olay,d)=>window.ZBILog&&window.ZBILog(olay,d);
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const now=new Date();
  let ay=(now.getFullYear()-START.y)*12+(now.getMonth()-START.m);
  if(now.getDate()<START.d) ay--;
  if(ay<0) return;
  const last=new Date(START.y,START.m+ay,START.d);
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const gun=Math.round((today-last)/86400000);
  const yeminGunu=gun===0 && ay>=1;
  if(yeminGunu) document.documentElement.classList.add('yemin-gunu');

  const MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const sure=yeminGunu?`Bugün ay yemininin ${ay}. ayı doldu.`
    :ay>0?`Ay yemininden bu yana ${ay} ay${gun?` ${gun} gün`:''} geçti.`
    :`Ay yemininden bu yana ${gun} gün geçti.`;
  const esc=(t)=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  let dlg=null;
  function openDialog(){
    if(!dlg){
      dlg=document.createElement('dialog');
      dlg.className='iz-dialog yemin-dialog';
      dlg.setAttribute('aria-labelledby','yeminTitle');
      dlg.innerHTML=`
        <div class="iz-inner" tabindex="-1" autofocus>
          <button type="button" class="iz-close" aria-label="Kapat">×</button>
          <div class="eyebrow">Ay yemini</div>
          <div class="yemin-moon" aria-hidden="true"></div>
          <h2 id="yeminTitle">${START.d} ${MONTHS[START.m]} ${START.y}</h2>
          <p class="yemin-sure">${sure}</p>
          ${NOT?`<p class="yemin-not">${esc(NOT).replace(/\n/g,'<br>')}</p>`:''}
        </div>`;
      document.body.appendChild(dlg);
      const close=()=>{ if(dlg.open) dlg.close(); else dlg.removeAttribute('open'); };
      dlg.querySelector('.iz-close').addEventListener('click',close);
      dlg.addEventListener('click',e=>{ if(e.target===dlg) close(); });
    }
    if(typeof dlg.showModal==='function') dlg.showModal(); else dlg.setAttribute('open','');
    log('yemin_acildi',{ay,bugun:yeminGunu});
  }

  const HOLD_MS=1300, C=2*Math.PI*54;
  function arm(moon){
    if(moon.dataset.yemin) return;
    moon.dataset.yemin='1';
    moon.classList.add('yemin-ay');
    moon.removeAttribute('aria-hidden');
    moon.setAttribute('role','button');
    moon.setAttribute('tabindex','0');
    moon.setAttribute('aria-label','Ay');
    const fill=document.createElement('span');
    fill.className='moon-fill';
    const ring=document.createElement('span');
    ring.className='moon-ring';
    ring.innerHTML=`<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}"/></svg>`;
    moon.append(fill,ring);
    const arc=ring.querySelector('circle');
    let t0=null, raf=0;
    const set=(p)=>{ arc.setAttribute('stroke-dashoffset',(C*(1-p)).toFixed(2)); moon.style.setProperty('--p',p.toFixed(3)); };
    const done=()=>{
      t0=null; set(1); moon.classList.add('full'); moon.classList.remove('holding');
      setTimeout(()=>{ openDialog(); moon.classList.remove('full'); set(0); },reduceMotion?0:450);
    };
    const frame=(t)=>{ const p=Math.min((t-t0)/HOLD_MS,1); set(p); if(p>=1){ done(); return; } raf=requestAnimationFrame(frame); };
    moon.addEventListener('pointerdown',e=>{
      if(e.button!==undefined && e.button!==0) return;
      e.preventDefault();
      try{ moon.setPointerCapture(e.pointerId); }catch(_){}
      t0=performance.now(); moon.classList.add('holding');
      raf=requestAnimationFrame(frame);
    });
    const end=()=>{ if(t0===null) return; t0=null; cancelAnimationFrame(raf); moon.classList.remove('holding'); set(0); };
    moon.addEventListener('pointerup',end);
    moon.addEventListener('pointercancel',end);
    moon.addEventListener('contextmenu',e=>e.preventDefault());
    moon.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openDialog(); } });
  }
  const scan=()=>document.querySelectorAll('.entry .moon, .revisit .moon').forEach(arm);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',scan); else scan();
})();
