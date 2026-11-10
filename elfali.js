(function(){
  const panel=document.getElementById('panelEl');
  if(!panel) return;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY=window.ZBI.KEY_PALM;
  const DAY=24*60*60*1000;

  const stage=document.getElementById('palmStage');
  const video=document.getElementById('palmVideo');
  const shot=document.getElementById('palmShot');
  const placeholder=document.getElementById('palmPlaceholder');
  const status=document.getElementById('palmStatus');
  const lead=document.getElementById('palmLead');
  const camBtn=document.getElementById('palmCamera');
  const capBtn=document.getElementById('palmCapture');
  const fileInput=document.getElementById('palmFile');
  const fileLabel=document.getElementById('palmFileLabel');
  const readingEl=document.getElementById('palmReading');
  let stream=null, busy=false;
  const log=(olay,d)=>window.ZBILog&&window.ZBILog(olay,d);

  const load=()=>{ try{ const v=JSON.parse(localStorage.getItem(KEY)); return v&&v.at&&v.okuma?v:null; }catch(e){ return null; } };
  const save=(v)=>{ try{ localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){} };
  const esc=(t)=>String(t||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  const PARTS=[['hayat','Hayat çizgisi'],['kalp','Kalp çizgisi'],['akil','Akıl çizgisi'],['kader','Kader çizgisi'],['genel','Elinin hikâyesi']];
  function showReading(okuma,animate){
    readingEl.innerHTML='';
    PARTS.forEach(([k,ad],i)=>{
      if(!okuma[k]) return;
      const el=document.createElement('article');
      el.className='reading-item palm-item'+(k==='genel'?' palm-summary':'');
      el.style.animationDelay=animate?`${i*0.35}s`:'0s';
      if(!animate) el.style.animation='none';
      el.innerHTML=`<div class="ri-pos">${ad}</div><p>${esc(okuma[k])}</p>`;
      readingEl.appendChild(el);
    });
  }

  function lockUntil(at){
    const left=at+DAY-Date.now();
    const total=Math.ceil(left/60000), h=Math.floor(total/60), m=total%60;
    const txt=h>0?(m?`${h} sa ${m} dk`:`${h} sa`):`${m} dk`;
    camBtn.hidden=true; capBtn.hidden=true; fileLabel.hidden=true;
    status.textContent=`Yeni okuma ${txt} sonra.`;
  }

  function stopCamera(){
    if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
    video.srcObject=null;
  }
  async function startCamera(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
      status.textContent='Bu tarayıcı kamerayı açamıyor. Fotoğraf seçerek devam edebilirsin.';
      return;
    }
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1280}}});
      video.srcObject=stream;
      await video.play().catch(()=>{});
      stage.classList.add('live'); stage.classList.remove('has-shot');
      placeholder.hidden=true; shot.hidden=true;
      camBtn.hidden=true; capBtn.hidden=false;
      status.textContent='Avucunu siluete hizala ve ışığın iyi geldiğinden emin ol.';
    }catch(e){
      status.textContent='Kameraya izin verilmedi. Ayarlardan izin verebilir ya da fotoğraf seçebilirsin.';
    }
  }
  camBtn.addEventListener('click',()=>{ if(camBtn.textContent==='Tekrar dene') log('el_yeniden'); startCamera(); });

  function toJpeg(source,w,h){
    const scale=Math.min(1,1024/Math.max(w,h));
    const c=document.createElement('canvas');
    c.width=Math.round(w*scale); c.height=Math.round(h*scale);
    c.getContext('2d').drawImage(source,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',0.85);
  }

  async function read(dataUrl){
    if(busy) return;
    busy=true;
    stopCamera();
    shot.src=dataUrl; shot.hidden=false;
    stage.classList.remove('live'); stage.classList.add('has-shot','scanning');
    placeholder.hidden=true;
    capBtn.hidden=true; camBtn.hidden=true; fileLabel.hidden=true;
    status.textContent='Çizgilerin okunuyor…';
    readingEl.innerHTML='';
    try{
      const r=await fetch('/api/el-fali',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image:dataUrl.split(',')[1]})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(data.hata||'Fal servisine ulaşılamadı. Biraz sonra tekrar dene.');
      if(!data.el_mi){
        log('el_gecersiz');
        status.textContent=data.mesaj||'Avucun net görünmedi. Biraz daha ışıkta tekrar dener misin?';
        camBtn.hidden=false; camBtn.textContent='Tekrar dene'; fileLabel.hidden=false;
        return;
      }
      const v={at:Date.now(),okuma:data};
      save(v);
      log('el_analiz');
      status.textContent='';
      lead.textContent='Avucunun hikâyesi';
      showReading(data,!reduceMotion);
      lockUntil(v.at);
    }catch(e){
      log('el_hata');
      status.textContent=e.message;
      camBtn.hidden=false; camBtn.textContent='Tekrar dene'; fileLabel.hidden=false;
    }finally{
      stage.classList.remove('scanning');
      busy=false;
    }
  }

  capBtn.addEventListener('click',()=>{
    if(!video.videoWidth||busy) return;
    log('el_foto',{kaynak:'kamera'});
    read(toJpeg(video,video.videoWidth,video.videoHeight));
  });
  fileInput.addEventListener('change',()=>{
    const f=fileInput.files&&fileInput.files[0]; if(!f) return;
    const img=new Image();
    img.onload=()=>{ if(!busy) log('el_foto',{kaynak:'dosya'}); read(toJpeg(img,img.naturalWidth,img.naturalHeight)); URL.revokeObjectURL(img.src); };
    img.onerror=()=>{ status.textContent='Bu fotoğraf açılamadı.'; };
    img.src=URL.createObjectURL(f);
    fileInput.value='';
  });

  document.querySelectorAll('.fal-tabs [role=tab]').forEach(t=>t.addEventListener('click',()=>{
    if(t.id==='tabEl' || busy || !stream) return;
    stopCamera();
    stage.classList.remove('live');
    placeholder.hidden=false;
    capBtn.hidden=true;
    camBtn.hidden=false;
  }));
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopCamera(); });

  const saved=load();
  if(saved && Date.now()<saved.at+DAY){
    placeholder.hidden=true;
    stage.classList.add('done');
    lead.textContent='Bugün avucunun hikâyesi okundu.';
    showReading(saved.okuma,false);
    lockUntil(saved.at);
  }
})();
