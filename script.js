const scene=document.getElementById('scene');
const openBtn=document.getElementById('openBtn');
const nextBtn=document.getElementById('nextBtn');
const note=document.getElementById('note');
const hint=document.getElementById('hint');
// Sayfaya özel yazılar HTML'deki data- alanlarından gelir
const readingHint=scene.dataset.hintReading;
const sealedHint=scene.dataset.hintSealed;
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let opened=false;

function revealNote(){
  scene.classList.add('revealed');
  hint.textContent=readingHint;
  window.scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});
  note.focus({preventScroll:true});
}

function openLetter(){
  if(opened) return;
  opened=true;
  openBtn.setAttribute('aria-expanded','true');
  scene.classList.add('opening');
  if(reduceMotion){ revealNote(); return; }
  setTimeout(()=>scene.classList.add('leaving'),1350);
  setTimeout(revealNote,1900);
}

openBtn.addEventListener('click',openLetter);
document.getElementById('envelope').addEventListener('click',openLetter);

// Mektubu mühürle: mektup zarfa geri girer, kapak kapanır, mühür yerine oturur
function sealLetter(){
  nextBtn.disabled=true;
  openBtn.setAttribute('aria-expanded','false');

  // Zarfı açık hâliyle geri getir
  const showOpenEnvelope=()=>{
    scene.classList.remove('closing','revealed','leaving');
    scene.classList.add('sealing');
    hint.textContent=sealedHint;
    window.scrollTo({top:0,behavior:'auto'});
  };
  // Kâğıt iner, kapak kapanır, mühür belirir
  const closeEnvelope=()=>{
    scene.classList.remove('opening');
    hint.focus({preventScroll:true});
    // Son mektupta mühürden sonra final sahnesi başlar
    if(finale) setTimeout(startFinale,reduceMotion?0:3600);
  };

  if(reduceMotion){ showOpenEnvelope(); closeEnvelope(); return; }
  scene.classList.add('closing');
  setTimeout(showOpenEnvelope,600);
  setTimeout(closeEnvelope,1350);
}

nextBtn.addEventListener('click',sealLetter);

// Final sahnesi: dolunay, kapaklı saat ve 04:38 (yalnızca #finale olan sayfada)
const finale=document.getElementById('finale');
function startFinale(){
  const show=()=>{
    scene.hidden=true;
    finale.hidden=false;
    finale.classList.add('play');
    window.scrollTo({top:0,behavior:'auto'});
    finale.focus({preventScroll:true});
    if(!reduceMotion) spinHands();
  };
  if(reduceMotion){ show(); return; }
  scene.classList.add('fade-away');
  setTimeout(show,900);
}

// Akrep ve yelkovan: kapak açıldıktan sonra hızla döner, yavaşlar ve 04:38'de durur.
// Yelkovan 38 dk → 228°, akrep 4 sa 38 dk → 139°; akrep yelkovanın 1/12 hızıyla döner.
function spinHands(){
  const handM=document.getElementById('handM');
  const handH=document.getElementById('handH');
  const END_M=228, END_H=139;
  const SPEED=600;          // derece/saniye (yaklaşık 0,6 sn'de bir tur)
  const FAST=1.4;           // sabit hızlı dönüş süresi (sn)
  const SLOW=4.4;           // yavaşlayarak durma süresi (sn)
  const TOTAL=SPEED*(FAST+SLOW/2); // toplam yelkovan yolu: 2160° = 6 tur
  const DELAY=5600;         // kapağın açılmasının bitişi (ms)
  const set=(travelled)=>{
    const left=TOTAL-travelled;
    handM.setAttribute('transform',`rotate(${END_M-left} 120 160)`);
    handH.setAttribute('transform',`rotate(${END_H-left/12} 120 160)`);
  };
  set(0);
  setTimeout(()=>{
    let t0=null;
    const frame=(now)=>{
      if(t0===null) t0=now;
      const t=(now-t0)/1000;
      let d;
      if(t<FAST) d=SPEED*t;
      else if(t<FAST+SLOW){ const u=t-FAST; d=SPEED*FAST+SPEED*u-SPEED*u*u/(2*SLOW); }
      else d=TOTAL;
      set(d);
      if(d<TOTAL) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },DELAY);
}

// Şifre ekranı (yalnızca #gate olan sayfada): doğru tarih girilince zarf sahnesi açılır.
// Tarih kodda açık yazılmaz; yalnızca kısa bir özeti (FNV-1a) karşılaştırılır.
const gate=document.getElementById('gate');
if(gate){
  const input=document.getElementById('dateInput');
  const field=document.getElementById('dateField');
  const slots=[...gate.querySelectorAll('.slot')];
  const msg=document.getElementById('gateMsg');
  const clue=document.getElementById('gateClue');
  // İpuçları: 2. denemeden itibaren, yanlış sayısı arttıkça biraz daha belirginleşir
  const clues=[
    'İpucu: Gün, ay ve yıl olarak yaz.',
    'İpucu: 2026 yılının ekim ayı.'
  ];
  let wrongCount=0, busy=false;

  const digest=(str)=>{
    let h=0x811c9dc5;
    for(const c of str){ h^=c.charCodeAt(0); h=Math.imul(h,16777619)>>>0; }
    return h.toString(16);
  };
  const render=()=>{
    const n=input.value.length;
    slots.forEach((s,i)=>{
      s.classList.toggle('filled',i<n);
      s.classList.toggle('current',i===n);
    });
  };
  const unlock=()=>{
    field.classList.add('right');
    msg.textContent='';
    input.blur();
    setTimeout(()=>gate.classList.add('leaving'),reduceMotion?0:700);
    setTimeout(()=>{
      gate.hidden=true;
      scene.hidden=false;
      scene.classList.add('from-gate');
      window.scrollTo({top:0,behavior:'auto'});
      openBtn.focus({preventScroll:true});
    },reduceMotion?0:1600);
  };
  const fail=()=>{
    wrongCount++;
    busy=true;
    field.classList.add('wrong');
    msg.textContent='Bu tarih değil.';
    if(wrongCount>=1) clue.textContent=clues[Math.min(wrongCount,clues.length)-1];
    setTimeout(()=>{
      field.classList.remove('wrong');
      input.value='';
      render();
      busy=false;
    },650);
  };
  const check=()=>{
    if(input.value.length<8) return;
    if(digest(input.value)===gate.dataset.key) unlock(); else fail();
  };

  input.addEventListener('input',()=>{
    if(busy){ input.value=''; return; }
    input.value=input.value.replace(/\D/g,'').slice(0,8);
    if(input.value.length<8 && !field.classList.contains('wrong')) msg.textContent='';
    render();
    check();
  });
  input.addEventListener('keydown',(e)=>{ if(e.key==='Enter') check(); });
  input.addEventListener('focus',()=>field.classList.add('focused'));
  input.addEventListener('blur',()=>field.classList.remove('focused'));
  render();
  // Masaüstünde doğrudan yazılabilsin (telefonda klavye ancak dokununca açılır)
  if(window.matchMedia('(hover: hover)').matches) input.focus({preventScroll:true});
}
