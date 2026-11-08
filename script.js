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
  };
  if(reduceMotion){ show(); return; }
  scene.classList.add('fade-away');
  setTimeout(show,900);
}
