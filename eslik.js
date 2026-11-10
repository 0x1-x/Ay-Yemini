/* =========================================================
   Zamandan bir iz — "Benimle bu müziğe eşlik eder misin?" sayfası
   - Şarkı yalnızca bu sayfada çalar (mektuplardaki listede yoktur).
   - Sözler eslik/sozler.lrc dosyasından okunur ve şarkıyla birlikte akar.
   - Bir satıra dokununca şarkı o satıra atlar.
   - ?zamanla ile açılınca sözleri zamanlamak için araç görünür.
   ========================================================= */
(function(){
  const sing=document.getElementById('sing');
  const timerMode=new URLSearchParams(location.search).has('zamanla');
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sayfaya yalnızca üçüncü mektup açıldıktan sonra gelinir
  if(!timerMode){
    let progress=null;
    try{ progress=Number(localStorage.getItem(window.ZBI.KEY_PROGRESS)||0); }catch(e){}
    if(progress!==null && progress<3){ location.replace('/'); return; }
  }

  /* ---------- Ses: iPhone'da ses düzeyi için Web Audio kazancı ---------- */
  const audio=new Audio(sing.dataset.src);
  audio.preload='auto';
  let ctx=null, gain=null, vol=0.85;
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
  function ensureGraph(){
    if(ctx) return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    try{
      ctx=new AC();
      const src=ctx.createMediaElementSource(audio);
      gain=ctx.createGain(); gain.gain.value=vol;
      src.connect(gain).connect(ctx.destination);
    }catch(e){ ctx=null; gain=null; }
  }
  const applyVol=()=>{ if(gain) gain.gain.value=vol; else audio.volume=vol; };
  function play(){ ensureGraph(); if(ctx&&ctx.state==='suspended') ctx.resume(); applyVol(); return audio.play().catch(()=>{}); }
  function pause(){ audio.pause(); }

  /* ---------- Zamanlama aracı ---------- */
  if(timerMode){
    sing.hidden=true;
    const timer=document.getElementById('timer');
    timer.hidden=false;
    const input=document.getElementById('timerInput');
    const out=document.getElementById('timerOutput');
    const startB=document.getElementById('timerStart');
    const undoB=document.getElementById('timerUndo');
    const tapB=document.getElementById('timerTap');
    const copyB=document.getElementById('timerCopy');
    const now=document.getElementById('timerNow');
    let lines=[], stamps=[];
    const fmt=(t)=>{ const m=Math.floor(t/60), s=t-m*60; return `[${String(m).padStart(2,'0')}:${s.toFixed(2).padStart(5,'0')}]`; };
    const show=()=>{
      out.value=stamps.map((t,i)=>`${fmt(t)} ${lines[i]}`).join('\n');
      const next=lines[stamps.length];
      now.textContent=next!==undefined?`Sıradaki satır (${stamps.length+1}/${lines.length}): ${next||'♪'}`:'Bitti. Metni kopyalayabilirsin.';
      tapB.disabled=next===undefined;
      undoB.disabled=!stamps.length;
      copyB.disabled=!stamps.length;
    };
    startB.addEventListener('click',()=>{
      lines=input.value.split('\n').map(l=>l.trim());
      while(lines.length && !lines[lines.length-1]) lines.pop();
      if(!lines.length){ now.textContent='Önce sözleri yapıştır.'; return; }
      stamps=[]; audio.currentTime=0; play(); show();
    });
    tapB.addEventListener('click',()=>{ stamps.push(audio.currentTime); show(); });
    undoB.addEventListener('click',()=>{ stamps.pop(); show(); });
    copyB.addEventListener('click',async()=>{
      try{ await navigator.clipboard.writeText(out.value); copyB.textContent='Kopyalandı'; }
      catch(e){ out.select(); copyB.textContent='Seçildi, kopyala'; }
    });
    return;
  }

  /* ---------- Sözler ---------- */
  document.getElementById('singTitle').textContent=sing.dataset.title||'';
  document.getElementById('singArtist').textContent=sing.dataset.artist||'';
  const list=document.getElementById('lyrics');
  let lines=[]; // {t, text, el}

  function parseLRC(txt){
    const out=[];
    txt.split(/\r?\n/).forEach(row=>{
      if(!row.trim() || row.trim().startsWith('#')) return;
      const times=[...row.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      if(!times.length) return;
      const text=row.replace(/\[[^\]]*\]/g,'').trim();
      times.forEach(m=>out.push({t:Number(m[1])*60+Number(m[2]),text}));
    });
    return out.sort((a,b)=>a.t-b.t);
  }
  function renderLyrics(){
    list.innerHTML='';
    lines.forEach((l,i)=>{
      const li=document.createElement('li');
      li.className='lyric'+(l.text&&l.text!=='♪'?'':' lyric-gap');
      li.textContent=l.text||'♪';
      li.addEventListener('click',()=>{ audio.currentTime=l.t+0.01; if(audio.paused) begin(); });
      l.el=li; list.appendChild(li);
    });
  }
  fetch(sing.dataset.lyrics,{cache:'no-cache'}).then(r=>r.ok?r.text():'').then(t=>{
    lines=parseLRC(t||'');
    if(!lines.length) lines=[{t:0,text:'♪'}];
    renderLyrics(); sync(true);
  }).catch(()=>{ lines=[{t:0,text:'♪'}]; renderLyrics(); });

  let current=-1;
  function sync(force){
    const t=audio.currentTime;
    let i=-1;
    for(let k=0;k<lines.length;k++){ if(lines[k].t<=t+0.05) i=k; else break; }
    if(i===current && !force) return;
    current=i;
    lines.forEach((l,k)=>{
      l.el.classList.toggle('is-active',k===i);
      l.el.classList.toggle('is-past',k<i);
    });
    // Çalan satırı ortaya kaydır
    const target=lines[Math.max(i,0)].el;
    const top=target.offsetTop-list.clientHeight/2+target.offsetHeight/2;
    list.scrollTo({top,behavior:reduceMotion||force?'auto':'smooth'});
  }
  let raf=0;
  const loop=()=>{ sync(false); renderTime(); raf=audio.paused?0:requestAnimationFrame(loop); };
  audio.addEventListener('play',()=>{ if(!raf) raf=requestAnimationFrame(loop); render(); });
  audio.addEventListener('pause',render);
  audio.addEventListener('seeked',()=>sync(true));
  audio.addEventListener('ended',()=>{ render(); sing.classList.add('ended'); });
  audio.addEventListener('loadedmetadata',renderTime);

  /* ---------- Çalar ---------- */
  const startB=document.getElementById('singStart');
  const playB=document.getElementById('singPlay');
  const bar=document.getElementById('singBar');
  const fill=bar.querySelector('.pl-fill');
  const curEl=document.getElementById('singCur'), durEl=document.getElementById('singDur');
  const downB=document.getElementById('singDown'), upB=document.getElementById('singUp');
  const ICON_PLAY='<svg viewBox="0 0 24 24" class="i-fill"><path d="M8 5.5l11 6.5-11 6.5z"/></svg>';
  const ICON_PAUSE='<svg viewBox="0 0 24 24"><path d="M8.5 5.5v13M15.5 5.5v13"/></svg>';
  const fmt=(s)=>{ s=Math.max(0,Math.floor(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };

  function begin(){ sing.classList.add('started'); sing.classList.remove('ended'); play(); }
  startB.addEventListener('click',begin);
  playB.addEventListener('click',()=>{ if(audio.paused) begin(); else pause(); });
  const setVol=(v)=>{ vol=Math.max(0,Math.min(1,Math.round(v*10)/10)); applyVol(); render(); };
  downB.addEventListener('click',()=>setVol(vol-0.1));
  upB.addEventListener('click',()=>setVol(vol+0.1));
  const seek=(x)=>{ const r=bar.getBoundingClientRect(); if(audio.duration) audio.currentTime=Math.max(0,Math.min(1,(x-r.left)/r.width))*audio.duration; };
  bar.addEventListener('click',e=>seek(e.clientX));
  bar.addEventListener('keydown',e=>{ if(e.key==='ArrowRight') audio.currentTime+=5; if(e.key==='ArrowLeft') audio.currentTime-=5; });

  function renderTime(){
    const d=audio.duration||0, c=audio.currentTime||0;
    fill.style.width=(d?c/d*100:0)+'%';
    curEl.textContent=fmt(c); durEl.textContent=fmt(d);
    bar.setAttribute('aria-valuenow',Math.round(c)); bar.setAttribute('aria-valuemax',Math.round(d));
  }
  function render(){
    const playing=!audio.paused;
    playB.innerHTML=playing?ICON_PAUSE:ICON_PLAY;
    playB.setAttribute('aria-label',playing?'Durdur':'Oynat');
    sing.classList.toggle('is-playing',playing);
    downB.disabled=vol<=0; upB.disabled=vol>=1;
    renderTime();
  }
  render();

  // Kilit ekranı kontrolleri
  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.metadata=new MediaMetadata({title:sing.dataset.title||'',artist:sing.dataset.artist||'',album:'Zamandan bir iz',artwork:[{src:'/muzik/kapak.jpg'}]});
      navigator.mediaSession.setActionHandler('play',begin);
      navigator.mediaSession.setActionHandler('pause',pause);
    }catch(e){}
  }
})();
