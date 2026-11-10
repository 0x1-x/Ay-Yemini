(function(){
  const KEY=window.ZBI.KEY_MUSIC;
  const isEntry=document.documentElement.dataset.page==='giris';
  const ERA=isEntry?'past':(document.documentElement.dataset.era||'past');
  const LISTS=window.ZBI_LISTE||{};
  const LIST=Array.isArray(LISTS)?LISTS:(LISTS[ERA]||[]);
  if(!LIST.length) return;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } };
  const saved=load();
  const st={
    i: Number.isInteger(saved.i)&&saved.i<LIST.length ? saved.i : 0,
    t: typeof saved.t==='number' ? saved.t : 0,
    playing: !!saved.playing,
    vol: typeof saved.vol==='number' ? saved.vol : 0.8,
    open: typeof saved.open==='boolean' ? saved.open : isEntry,
    pos: saved.pos && typeof saved.pos.x==='number' ? saved.pos : null
  };
  if(saved.era!==ERA){ st.i=0; st.t=0; }
  if(isEntry){ st.i=0; st.t=0; st.playing=false; st.open=true; }

  const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify({era:ERA,i:st.i,t:audio.currentTime||0,playing:st.playing,vol:st.vol,open:st.open,pos:st.pos})); }catch(e){} };

  const audio=new Audio();
  audio.preload='metadata';
  audio.src=LIST[st.i].dosya;
  let ctx=null, gain=null;
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}

  function ensureGraph(){
    if(ctx) return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    try{
      ctx=new AC();
      const src=ctx.createMediaElementSource(audio);
      gain=ctx.createGain();
      gain.gain.value=st.vol;
      src.connect(gain).connect(ctx.destination);
    }catch(e){ ctx=null; gain=null; }
  }
  const applyVolume=()=>{ if(gain) gain.gain.value=st.vol; else audio.volume=st.vol; };

  let resumeAt=st.t;
  audio.addEventListener('loadedmetadata',()=>{
    if(resumeAt>0 && resumeAt<audio.duration) audio.currentTime=resumeAt;
    resumeAt=0;
    render();
  });

  function play(){
    ensureGraph();
    if(ctx && ctx.state==='suspended') ctx.resume();
    applyVolume();
    st.playing=true;
    const p=audio.play();
    if(p&&p.catch) p.catch(()=>{ st.playing=false; render(); save(); });
    render(); save();
  }
  function pause(){ audio.pause(); st.playing=false; render(); save(); }
  const toggle=()=>audio.paused?play():pause();
  function go(n){
    st.i=(n+LIST.length)%LIST.length;
    resumeAt=0;
    const wasPlaying=st.playing;
    audio.src=LIST[st.i].dosya;
    if(wasPlaying) play(); else { render(); save(); }
    setMeta();
  }
  const next=()=>go(st.i+1);
  const prev=()=>{ if(audio.currentTime>3) audio.currentTime=0; else go(st.i-1); };
  function setVol(v){ st.vol=Math.max(0,Math.min(1,Math.round(v*10)/10)); applyVolume(); render(); save(); }

  audio.loop=LIST.length===1;
  audio.addEventListener('ended',next);
  audio.addEventListener('play',render);
  const musicNote=document.getElementById('musicNote');
  if(musicNote) audio.addEventListener('play',()=>musicNote.classList.add('shown'),{once:true});
  audio.addEventListener('pause',render);
  let lastSave=0;
  audio.addEventListener('timeupdate',()=>{
    renderTime();
    const n=Date.now(); if(n-lastSave>2000){ lastSave=n; save(); }
  });
  window.addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) save(); });

  function setMeta(){
    if(!('mediaSession' in navigator)) return;
    const s=LIST[st.i];
    try{
      navigator.mediaSession.metadata=new MediaMetadata({
        title:s.baslik, artist:s.sanatci||'', album:'Zamandan bir iz',
        artwork:[{src:window.ZBI_KAPAK||'/apple-touch-icon.png'}]
      });
    }catch(e){}
  }
  if('mediaSession' in navigator){
    const h=(a,f)=>{ try{ navigator.mediaSession.setActionHandler(a,f); }catch(e){} };
    h('play',play); h('pause',pause); h('nexttrack',next); h('previoustrack',prev);
  }
  setMeta();

  function armResume(){
    const evs=['pointerup','touchend','keydown','click'];
    const onFirst=(e)=>{
      evs.forEach(ev=>document.removeEventListener(ev,onFirst,true));
      if(e && e.target && e.target.closest && e.target.closest('.mw')) return;
      if(audio.paused) play();
    };
    evs.forEach(ev=>document.addEventListener(ev,onFirst,true));
  }
  if(!isEntry && st.playing) armResume();

  const I={
    prev:'<svg viewBox="0 0 24 24"><path d="M6 5v14M18 6l-9 6 9 6z"/></svg>',
    next:'<svg viewBox="0 0 24 24"><path d="M18 5v14M6 6l9 6-9 6z"/></svg>',
    play:'<svg viewBox="0 0 24 24" class="i-fill"><path d="M8 5.5l11 6.5-11 6.5z"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path d="M8.5 5.5v13M15.5 5.5v13"/></svg>',
    down:'<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 12h4"/></svg>',
    up:'<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 12h5M18 9.5v5"/></svg>',
    shrink:'<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>'
  };
  const btn=(cls,label,icon)=>`<button type="button" class="pl-btn ${cls}" aria-label="${label}">${icon}</button>`;
  const fmt=(s)=>{ s=Math.max(0,Math.floor(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
  const cover=()=>window.ZBI_KAPAK?`<img src="${window.ZBI_KAPAK}" alt="" draggable="false">`:'';
  const RING_C=2*Math.PI*31;

  const el=document.createElement('div');
  el.className='mw';
  el.innerHTML=`
    <section class="mw-panel" role="region" aria-label="Müzik çalar">
      <div class="mw-head">
        <button type="button" class="mw-cover mw-cover-sm" aria-label="Çaları küçült">${cover()}</button>
        <div class="mw-meta">
          <div class="pl-eyebrow">Şimdi çalıyor</div>
          <div class="pl-title" aria-live="polite"></div>
          <div class="pl-artist"></div>
        </div>
        ${btn('mw-shrink','Çaları küçült',I.shrink)}
      </div>
      <div class="pl-bar" role="slider" aria-label="Şarkının ilerleyişi" tabindex="0"><span class="pl-fill"></span></div>
      <div class="pl-times"><span class="pl-cur">0:00</span><span class="pl-dur">0:00</span></div>
      <div class="pl-controls">
        ${btn('pl-down','Sesi kıs',I.down)}
        ${btn('pl-prev','Önceki şarkı',I.prev)}
        ${btn('pl-play','Oynat',I.play)}
        ${btn('pl-next','Sonraki şarkı',I.next)}
        ${btn('pl-up','Sesi aç',I.up)}
      </div>
      <div class="pl-vol" aria-hidden="true"><span class="pl-vol-fill"></span></div>
    </section>
    <button type="button" class="mw-bubble" aria-label="Müzik çaları aç">
      <span class="mw-cover">${cover()}</span>
      <svg class="mw-ring" viewBox="0 0 68 68" aria-hidden="true">
        <circle class="mw-ring-track" cx="34" cy="34" r="31"/>
        <circle class="mw-ring-fill" cx="34" cy="34" r="31" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${RING_C.toFixed(2)}"/>
      </svg>
    </button>`;
  document.body.appendChild(el);
  if(LIST.length===1) el.classList.add('single');
  el.querySelectorAll('.mw-cover img').forEach(img=>img.addEventListener('error',()=>img.remove()));

  const $=(s)=>el.querySelector(s);
  const bubble=$('.mw-bubble');
  const ringFill=$('.mw-ring-fill');
  $('.pl-play').addEventListener('click',toggle);
  $('.pl-prev').addEventListener('click',prev);
  $('.pl-next').addEventListener('click',next);
  $('.pl-down').addEventListener('click',()=>setVol(st.vol-0.1));
  $('.pl-up').addEventListener('click',()=>setVol(st.vol+0.1));
  $('.mw-shrink').addEventListener('click',()=>setOpen(false));
  $('.mw-cover-sm').addEventListener('click',()=>setOpen(false));
  const bar=$('.pl-bar');
  const seek=(x)=>{ const r=bar.getBoundingClientRect(); if(audio.duration) audio.currentTime=Math.max(0,Math.min(1,(x-r.left)/r.width))*audio.duration; };
  bar.addEventListener('click',e=>seek(e.clientX));
  bar.addEventListener('keydown',e=>{ if(e.key==='ArrowRight') audio.currentTime+=5; if(e.key==='ArrowLeft') audio.currentTime-=5; });

  const panel=$('.mw-panel');
  const SIZE=64, MARGIN=10, GAP=12;
  const bounds=()=>{
    const vv=window.visualViewport;
    return {w:vv?vv.width:innerWidth, h:vv?vv.height:innerHeight};
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let bx=0, by=0;
  const safeProbe=document.createElement('div');
  safeProbe.style.cssText='position:fixed;left:0;bottom:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none';
  el.appendChild(safeProbe);

  function placePanel(){
    const {w,h}=bounds();
    const pw=panel.offsetWidth, ph=panel.offsetHeight;
    const safeBottom=safeProbe.offsetHeight;
    let left,top;
    if(!st.pos){
      left=(w-pw)/2; top=h-ph-Math.max(12,safeBottom);
    }else{
      const cx=bx+SIZE/2;
      left=clamp(cx-pw/2,GAP,w-pw-GAP);
      top=(by+SIZE/2>h/2) ? by+SIZE-ph : by;
      top=clamp(top,GAP,h-ph-Math.max(GAP,safeBottom));
    }
    panel.style.left=left+'px';
    panel.style.top=top+'px';
    panel.style.transformOrigin=`${bx+SIZE/2-left}px ${by+SIZE/2-top}px`;
  }

  function setOpen(open,focus=true){
    st.open=open;
    if(open) placePanel();
    el.classList.toggle('is-open',open);
    el.classList.toggle('is-bubble',!open);
    document.documentElement.classList.toggle('mw-open',open && !st.pos);
    save();
    if(focus){ (open?$('.pl-play'):bubble).focus({preventScroll:true}); }
  }

  const setBubble=(x,y)=>{ bx=x; by=y; bubble.style.transform=`translate3d(${x}px,${y}px,0)`; };
  function placeBubble(){
    const {w,h}=bounds();
    let x,y;
    if(st.pos){ x=st.pos.x*w; y=st.pos.y*h; }
    else{ x=w-SIZE-16; y=h-SIZE-28; }
    setBubble(clamp(x,MARGIN,w-SIZE-MARGIN),clamp(y,MARGIN,h-SIZE-MARGIN));
    if(st.open) placePanel();
  }
  let drag=null, lastDragEnd=0;
  bubble.addEventListener('pointerdown',e=>{
    if(e.button!==undefined && e.button!==0) return;
    drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,ox:bx,oy:by,x:bx,y:by,moved:false};
    try{ bubble.setPointerCapture(e.pointerId); }catch(_){}
  });
  bubble.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id) return;
    const dx=e.clientX-drag.sx, dy=e.clientY-drag.sy;
    if(!drag.moved){
      if(Math.hypot(dx,dy)<6) return;
      drag.moved=true;
      bubble.classList.add('dragging');
    }
    const {w,h}=bounds();
    drag.x=clamp(drag.ox+dx,MARGIN,w-SIZE-MARGIN);
    drag.y=clamp(drag.oy+dy,MARGIN,h-SIZE-MARGIN);
    setBubble(drag.x,drag.y);
  });
  const endDrag=(e)=>{
    if(!drag||e.pointerId!==drag.id) return;
    const d=drag; drag=null;
    bubble.classList.remove('dragging');
    if(d.moved){
      setBubble(d.x,d.y);
      lastDragEnd=Date.now();
      const {w,h}=bounds();
      st.pos={x:d.x/w,y:d.y/h}; save();
    }
  };
  bubble.addEventListener('pointerup',endDrag);
  bubble.addEventListener('pointercancel',endDrag);
  bubble.addEventListener('click',()=>{ if(Date.now()-lastDragEnd<400) return; setOpen(true); });
  bubble.addEventListener('contextmenu',e=>e.preventDefault());
  bubble.addEventListener('touchmove',e=>{ if(e.cancelable) e.preventDefault(); },{passive:false});
  window.addEventListener('resize',placeBubble);
  if(window.visualViewport) visualViewport.addEventListener('resize',placeBubble);

  function renderTime(){
    const d=audio.duration||0, c=audio.currentTime||0, p=d?c/d:0;
    el.querySelector('.pl-fill').style.width=(p*100)+'%';
    ringFill.setAttribute('stroke-dashoffset',(RING_C*(1-p)).toFixed(2));
    $('.pl-cur').textContent=fmt(c);
    $('.pl-dur').textContent=fmt(d);
    bar.setAttribute('aria-valuenow',Math.round(c)); bar.setAttribute('aria-valuemax',Math.round(d));
  }
  function render(){
    const s=LIST[st.i];
    $('.pl-title').textContent=s.baslik;
    $('.pl-artist').textContent=s.sanatci||'';
    const playing=!audio.paused;
    const pb=$('.pl-play');
    pb.innerHTML=playing?I.pause:I.play;
    pb.setAttribute('aria-label',playing?'Durdur':'Oynat');
    el.classList.toggle('is-playing',playing);
    bubble.setAttribute('aria-label',`Müzik çaları aç: ${s.baslik}${playing?' (çalıyor)':''}`);
    $('.pl-vol-fill').style.width=(st.vol*100)+'%';
    $('.pl-down').disabled=st.vol<=0;
    $('.pl-up').disabled=st.vol>=1;
    renderTime();
  }

  placeBubble();
  setOpen(st.open,false);
  render();
  const gate=document.getElementById('gate');
  if(gate && !gate.hidden) el.hidden=true;
  if(!reduceMotion) requestAnimationFrame(()=>el.classList.add('ready'));

  window.ZBIMuzik={
    show(){ el.hidden=false; placeBubble(); }
  };
})();
