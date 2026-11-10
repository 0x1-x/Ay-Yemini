/* =========================================================
   Zamandan bir iz — "Benimle bu müziğe eşlik eder misin?" sayfası
   - Şarkı yalnızca bu sayfada çalar (mektuplardaki listede yoktur).
   - Sözler eslik/sozler.lrc dosyasından okunur ve şarkıyla birlikte akar.
   - Bir satıra dokununca şarkı o satıra atlar.
   - ?zamanla ile açılınca sözleri zamanlamak için araç görünür.
   ========================================================= */
(function(){
  const sing=document.getElementById('sing');
  const params=new URLSearchParams(location.search);
  const timerMode=params.has('zamanla');
  const editMode=params.has('duzenle');
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sayfaya yalnızca üçüncü mektup açıldıktan sonra gelinir
  if(!timerMode && !editMode){
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
      dlB.disabled=stamps.length<lines.length;
    };
    // Bazı söz sitelerinin kopyalamaya karşı kullandığı Kiril benzeri harfleri Türkçe harflere çevir
    const LOOK={'а':'a','е':'e','о':'o','р':'p','с':'c','у':'y','х':'x','і':'i','ј':'j','ѕ':'s','ԁ':'d','ɡ':'g',
                'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','І':'I','Ј':'J','Ѕ':'S'};
    const normalize=(t)=>t.replace(/[аеорсухіјѕԁɡАВЕКМНОРСТХІЈЅ]/g,ch=>LOOK[ch]||ch).replace(/[\u200B-\u200D\uFEFF]/g,'');
    // Ekranda iki satırı geçecek uzun dizeleri virgülden ya da kelime arasından böl
    const MAX=40;
    function splitLong(line){
      if(line.length<=MAX) return [line];
      const mid=line.length/2;
      let best=-1;
      [...line.matchAll(/[,;:]\s/g)].forEach(m=>{ const p=m.index+1; if(best<0||Math.abs(p-mid)<Math.abs(best-mid)) best=p; });
      if(best<0||Math.abs(best-mid)>line.length*0.3){
        best=-1;
        [...line.matchAll(/\s/g)].forEach(m=>{ if(best<0||Math.abs(m.index-mid)<Math.abs(best-mid)) best=m.index; });
      }
      if(best<=0) return [line];
      return [...splitLong(line.slice(0,best).trim()),...splitLong(line.slice(best).trim())];
    }
    startB.addEventListener('click',()=>{
      lines=normalize(input.value).split('\n').map(l=>l.trim()).flatMap(l=>l?splitLong(l):['']);
      // Art arda boş satırları teke indir; boş satır ekranda ♪ (müzikli ara) olur
      lines=lines.filter((l,i)=>l||lines[i-1]);
      while(lines.length && !lines[lines.length-1]) lines.pop();
      input.value=lines.join('\n');
      if(!lines.length){ now.textContent='Önce sözleri yapıştır.'; return; }
      stamps=[]; audio.currentTime=0; play(); show();
    });
    tapB.addEventListener('click',()=>{ stamps.push(audio.currentTime); show(); });
    undoB.addEventListener('click',()=>{ stamps.pop(); show(); });
    const dlB=document.getElementById('timerDownload');
    dlB.addEventListener('click',()=>{
      const blob=new Blob([out.value+'\n'],{type:'text/plain;charset=utf-8'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download='sozler.lrc';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    });
    copyB.addEventListener('click',async()=>{
      try{ await navigator.clipboard.writeText(out.value); copyB.textContent='Kopyalandı'; }
      catch(e){ out.select(); copyB.textContent='Seçildi, kopyala'; }
    });
    return;
  }

  /* ---------- Düzenleme aracı (?duzenle) ----------
     Mevcut sozler.lrc dosyasını yükler; satırların zamanları tek tek ya da
     hep birlikte kaydırılabilir, sonra düzeltilmiş dosya indirilir. */
  if(editMode){
    sing.hidden=true;
    const ed=document.getElementById('editor');
    ed.hidden=false;
    const tbody=document.getElementById('edRows');
    const shiftLbl=document.getElementById('edShift');
    const playB=document.getElementById('edPlay');
    const clock=document.getElementById('edClock');
    let rows=[]; // {t, text, tr, timeEl}
    const fmtT=(t)=>{ t=Math.max(0,t); const m=Math.floor(t/60), s=t-m*60; return `${m}:${s.toFixed(2).padStart(5,'0')}`; };
    const lrcT=(t)=>{ t=Math.max(0,t); const m=Math.floor(t/60), s=t-m*60; return `[${String(m).padStart(2,'0')}:${s.toFixed(2).padStart(5,'0')}]`; };
    let totalShift=0;
    const refresh=()=>{ rows.forEach(r=>r.timeEl.textContent=fmtT(r.t)); shiftLbl.textContent=(totalShift>=0?'+':'')+totalShift.toFixed(2)+' sn'; };
    const playFrom=(t)=>{ audio.currentTime=Math.max(0,t); play(); };
    function build(){
      tbody.innerHTML='';
      rows.forEach((r,i)=>{
        const tr=document.createElement('div');
        tr.className='ed-row';
        tr.innerHTML=`<div class="ed-top"><span class="ed-n">${i+1}</span><span class="ed-time"></span><span class="ed-text"></span></div>
          <div class="ed-btns">
            <button type="button" data-a="from" aria-label="${i+1}. satırın 2 saniye öncesinden çal">▶ Dinle</button>
            <button type="button" data-a="-" aria-label="0,1 saniye öne al">−0,1</button>
            <button type="button" data-a="+" aria-label="0,1 saniye geri al">+0,1</button>
            <button type="button" data-a="now" class="ed-now" aria-label="Şu anki ana ayarla">Şimdi</button>
          </div>`;
        tr.querySelector('.ed-text').textContent=r.text||'♪';
        r.tr=tr; r.timeEl=tr.querySelector('.ed-time');
        tr.addEventListener('click',e=>{
          const a=e.target.dataset&&e.target.dataset.a; if(!a) return;
          if(a==='from') playFrom(r.t-2);
          if(a==='-') r.t=Math.max(0,r.t-0.1);
          if(a==='+') r.t+=0.1;
          if(a==='now') r.t=audio.currentTime;
          refresh();
        });
        tbody.appendChild(tr);
      });
      refresh();
    }
    fetch(sing.dataset.lyrics,{cache:'no-cache'}).then(r=>r.text()).then(txt=>{
      txt.split(/\r?\n/).forEach(row=>{
        if(!row.trim()||row.trim().startsWith('#')) return;
        const m=row.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
        if(m) rows.push({t:Number(m[1])*60+Number(m[2]),text:m[3]});
      });
      build();
    });
    // Bütün satırları birlikte kaydır (ör. dokunma gecikmesini telafi etmek için)
    document.querySelectorAll('[data-shift]').forEach(b=>b.addEventListener('click',()=>{
      const d=Number(b.dataset.shift); totalShift+=d; rows.forEach(r=>r.t=Math.max(0,r.t+d)); refresh();
    }));
    playB.addEventListener('click',()=>{ audio.paused?play():audio.pause(); });
    audio.addEventListener('play',()=>playB.textContent='Durdur');
    audio.addEventListener('pause',()=>playB.textContent='Oynat');
    // Çalan satırı vurgula
    let active=-1;
    const tick=()=>{
      const t=audio.currentTime; clock.textContent=fmtT(t);
      let i=-1; for(let k=0;k<rows.length;k++){ if(rows[k].t<=t) i=k; }
      if(i!==active){
        if(rows[active]) rows[active].tr.classList.remove('is-active');
        active=i;
        if(rows[i]){ rows[i].tr.classList.add('is-active'); if(!audio.paused) rows[i].tr.scrollIntoView({block:'center',behavior:'smooth'}); }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    document.getElementById('edDownload').addEventListener('click',()=>{
      const sorted=[...rows].sort((a,b)=>a.t-b.t);
      const out=sorted.map(r=>`${lrcT(r.t)} ${r.text}`).join('\n')+'\n';
      const a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([out],{type:'text/plain;charset=utf-8'}));
      a.download='sozler.lrc'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),2000);
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
