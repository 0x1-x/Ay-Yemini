/* =========================================================
   Zamandan bir iz — müzik çalar
   - Çalma listesi muzik/liste.js'ten gelir.
   - Giriş sayfasında büyük çalar (#player), mektuplarda alttaki küçük çalar.
   - Telefon çalan şarkıyı, yerini ve ses düzeyini hatırlar; yeni sayfada
     ilk dokunuşta kaldığı yerden devam eder (tarayıcılar sesin kendiliğinden
     başlamasına izin vermez).
   - iPhone'da ses düzeyi kodla değiştirilemediği için ses Web Audio
     üzerinden bir kazanç düğümüyle ayarlanır.
   ========================================================= */
(function(){
  const LIST=window.ZBI_LISTE||[];
  if(!LIST.length) return;
  const KEY=window.ZBI.KEY_MUSIC;

  /* ---------- Durum ---------- */
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } };
  const saved=load();
  const st={
    i: Number.isInteger(saved.i)&&saved.i<LIST.length ? saved.i : 0,
    t: typeof saved.t==='number' ? saved.t : 0,
    playing: !!saved.playing,
    vol: typeof saved.vol==='number' ? saved.vol : 0.8
  };
  const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify({i:st.i,t:audio.currentTime||0,playing:st.playing,vol:st.vol})); }catch(e){} };

  /* ---------- Ses motoru ---------- */
  const audio=new Audio();
  audio.preload='metadata';
  audio.src=LIST[st.i].dosya;
  let ctx=null, gain=null;
  // Sessiz düğmesi açıkken de çalsın (Safari 16.4+)
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
  function applyVolume(){
    if(gain) gain.gain.value=st.vol; else audio.volume=st.vol;
  }

  let resumeAt=st.t;
  audio.addEventListener('loadedmetadata',()=>{
    if(resumeAt>0 && resumeAt<audio.duration){ audio.currentTime=resumeAt; }
    resumeAt=0;
    render();
  });

  function play(){
    ensureGraph();
    if(ctx && ctx.state==='suspended') ctx.resume();
    applyVolume();
    const p=audio.play();
    st.playing=true;
    if(p&&p.catch) p.catch(()=>{ st.playing=false; render(); armResume(); });
    render(); save();
  }
  function pause(){ audio.pause(); st.playing=false; render(); save(); }
  function toggle(){ audio.paused?play():pause(); }
  function go(n){
    st.i=(n+LIST.length)%LIST.length;
    resumeAt=0;
    const wasPlaying=st.playing;
    audio.src=LIST[st.i].dosya;
    if(wasPlaying) play(); else { render(); save(); }
    setMeta();
  }
  const next=()=>go(st.i+1);
  const prev=()=>{ if(audio.currentTime>3){ audio.currentTime=0; } else go(st.i-1); };
  function setVol(v){ st.vol=Math.max(0,Math.min(1,Math.round(v*10)/10)); applyVolume(); render(); save(); }

  audio.addEventListener('ended',next);
  audio.addEventListener('play',()=>{ st.playing=true; render(); });
  audio.addEventListener('pause',()=>{ if(!audio.ended){ render(); } });
  let lastSave=0;
  audio.addEventListener('timeupdate',()=>{
    renderTime();
    const n=Date.now(); if(n-lastSave>2000){ lastSave=n; save(); }
  });
  window.addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) save(); });

  /* ---------- Kilit ekranı / bildirim merkezi kontrolleri ---------- */
  function setMeta(){
    if(!('mediaSession' in navigator)) return;
    const s=LIST[st.i];
    try{
      navigator.mediaSession.metadata=new MediaMetadata({
        title:s.baslik, artist:s.sanatci||'', album:'Zamandan bir iz',
        artwork:[{src:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]
      });
    }catch(e){}
  }
  if('mediaSession' in navigator){
    const h=(a,f)=>{ try{ navigator.mediaSession.setActionHandler(a,f); }catch(e){} };
    h('play',play); h('pause',pause); h('nexttrack',next); h('previoustrack',prev);
  }
  setMeta();

  /* ---------- Önceki sayfada çalıyorduysa ilk dokunuşta devam et ---------- */
  function armResume(){
    const evs=['pointerup','touchend','keydown','click'];
    const go=(e)=>{
      evs.forEach(ev=>document.removeEventListener(ev,go,true));
      // Çaların kendi düğmelerine dokunulduysa işi düğmeye bırak
      if(e && e.target && e.target.closest && e.target.closest('.pl-btn')) return;
      if(audio.paused) play();
    };
    evs.forEach(e=>document.addEventListener(e,go,{capture:true,once:false}));
  }

  /* ---------- Arayüz ---------- */
  const I={
    prev:'<svg viewBox="0 0 24 24"><path d="M6 5v14M18 6l-9 6 9 6z"/></svg>',
    next:'<svg viewBox="0 0 24 24"><path d="M18 5v14M6 6l9 6-9 6z"/></svg>',
    play:'<svg viewBox="0 0 24 24"><path d="M8 5.5l11 6.5-11 6.5z"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path d="M8.5 5.5v13M15.5 5.5v13"/></svg>',
    down:'<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 12h4"/></svg>',
    up:'<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 12h5M18 9.5v5"/></svg>'
  };
  const btn=(cls,label,icon)=>`<button type="button" class="pl-btn ${cls}" aria-label="${label}">${icon}</button>`;
  const fmt=(s)=>{ s=Math.max(0,Math.floor(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };

  const full=document.getElementById('player');
  let el;
  if(full){
    full.innerHTML=`
      <div class="pl-eyebrow">Şimdi çalıyor</div>
      <div class="pl-title" aria-live="polite"></div>
      <div class="pl-artist"></div>
      <div class="pl-bar" role="slider" aria-label="Şarkının ilerleyişi" tabindex="0"><span class="pl-fill"></span></div>
      <div class="pl-times"><span class="pl-cur">0:00</span><span class="pl-dur">0:00</span></div>
      <div class="pl-controls">
        ${btn('pl-prev','Önceki şarkı',I.prev)}
        ${btn('pl-play','Oynat',I.play)}
        ${btn('pl-next','Sonraki şarkı',I.next)}
      </div>
      <div class="pl-volume">
        ${btn('pl-down','Sesi kıs',I.down)}
        <div class="pl-vol" aria-hidden="true"><span class="pl-vol-fill"></span></div>
        ${btn('pl-up','Sesi aç',I.up)}
      </div>`;
    el=full;
  }else{
    el=document.createElement('div');
    el.className='mini-player';
    el.setAttribute('role','region');
    el.setAttribute('aria-label','Müzik çalar');
    el.innerHTML=`
      <div class="mini-info"><div class="pl-title"></div><div class="mini-track"><span class="pl-fill"></span></div></div>
      <div class="mini-controls">
        ${btn('pl-down','Sesi kıs',I.down)}
        ${btn('pl-prev','Önceki şarkı',I.prev)}
        ${btn('pl-play','Oynat',I.play)}
        ${btn('pl-next','Sonraki şarkı',I.next)}
        ${btn('pl-up','Sesi aç',I.up)}
      </div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('has-mini');
  }
  const $=(s)=>el.querySelector(s);
  $('.pl-play').addEventListener('click',toggle);
  $('.pl-prev').addEventListener('click',prev);
  $('.pl-next').addEventListener('click',next);
  $('.pl-down').addEventListener('click',()=>setVol(st.vol-0.1));
  $('.pl-up').addEventListener('click',()=>setVol(st.vol+0.1));
  const bar=el.querySelector('.pl-bar');
  if(bar){
    const seek=(x)=>{ const r=bar.getBoundingClientRect(); if(audio.duration) audio.currentTime=Math.max(0,Math.min(1,(x-r.left)/r.width))*audio.duration; };
    bar.addEventListener('click',e=>seek(e.clientX));
    bar.addEventListener('keydown',e=>{ if(e.key==='ArrowRight') audio.currentTime+=5; if(e.key==='ArrowLeft') audio.currentTime-=5; });
  }

  function renderTime(){
    const d=audio.duration||0, c=audio.currentTime||0;
    el.querySelectorAll('.pl-fill').forEach(f=>f.style.width=(d?c/d*100:0)+'%');
    const cur=el.querySelector('.pl-cur'), dur=el.querySelector('.pl-dur');
    if(cur) cur.textContent=fmt(c);
    if(dur) dur.textContent=fmt(d);
    if(bar){ bar.setAttribute('aria-valuenow',Math.round(c)); bar.setAttribute('aria-valuemax',Math.round(d)); }
  }
  function render(){
    const s=LIST[st.i];
    el.querySelectorAll('.pl-title').forEach(t=>t.textContent=s.baslik);
    const a=el.querySelector('.pl-artist'); if(a) a.textContent=s.sanatci||'';
    const playing=!audio.paused;
    const pb=$('.pl-play');
    pb.innerHTML=playing?I.pause:I.play;
    pb.setAttribute('aria-label',playing?'Durdur':'Oynat');
    el.classList.toggle('is-playing',playing);
    const vf=el.querySelector('.pl-vol-fill'); if(vf) vf.style.width=(st.vol*100)+'%';
    $('.pl-down').disabled=st.vol<=0;
    $('.pl-up').disabled=st.vol>=1;
    renderTime();
  }
  render();

  // Başka bir sayfada çalıyorduysa, ilk dokunuşta devam et
  if(st.playing){ st.playing=false; armResume(); st.playing=true; }

  // Şifre ekranından çağrılır
  window.ZBIMuzik={ start(){ if(audio.paused) play(); } };
})();
