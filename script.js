/* =========================================================
   Zamandan bir iz — ortak sayfa kodu
   Her sayfa <html data-step="1|2|3" data-era="past|now|future"> taşır.
   ========================================================= */
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

const root=document.documentElement;
const STEP=Number(root.dataset.step||1);
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

/* ---------- Sıra kilidi: kartlar yalnızca sırayla açılır ----------
   Telefon, açılan en son mektubun numarasını hatırlar. Depolama
   kullanılamazsa (ör. bazı gizli sekmeler) kilit devre dışı kalır. */
const PROGRESS_KEY='zamandan-bir-iz:acilan';
const storage={
  get(){ try{ return Number(localStorage.getItem(PROGRESS_KEY)||0); }catch(e){ return null; } },
  set(n){ try{ if(n>(Number(localStorage.getItem(PROGRESS_KEY))||0)) localStorage.setItem(PROGRESS_KEY,String(n)); }catch(e){} },
  clear(){ try{ localStorage.removeItem(PROGRESS_KEY); }catch(e){} }
};
// Hediyeden önce deneme yapabilmek için: adresin sonuna ?sifirla eklenirse ilerleme silinir
if(new URLSearchParams(location.search).has('sifirla')){
  storage.clear();
  history.replaceState(null,'',location.pathname);
}
const ORDINAL=['','ilk','ikinci','üçüncü'];
const progress=storage.get();
const locked=STEP>1 && progress!==null && progress<STEP-1;
if(locked){
  scene.classList.add('locked');
  hint.textContent=`Bu zarfın zamanı henüz gelmedi. Önce ${ORDINAL[progress+1]} zarfı aç.`;
  openBtn.hidden=true;
}

function revealNote(){
  scene.classList.add('revealed');
  hint.textContent=readingHint;
  storage.set(STEP);
  window.scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});
  note.focus({preventScroll:true});
}

function openLetter(){
  if(opened||locked) return;
  opened=true;
  openBtn.setAttribute('aria-expanded','true');
  scene.classList.add('opening');
  if(reduceMotion){ revealNote(); return; }
  setTimeout(()=>scene.classList.add('leaving'),1350);
  setTimeout(revealNote,1900);
}

/* ---------- Mührü kırmak: basılı tutunca halka dolar, mühür kırılır ----------
   Zarfa ya da butona basılı tutulur. Klavye ve ekran okuyucuyla
   butona basmak (tıklama, detail=0) mührü doğrudan kırar. */
const envelope=document.getElementById('envelope');
const sealEl=envelope.querySelector('.seal');
const HOLD_MS=1300;
const RING_C=2*Math.PI*27;
const ring=document.createElement('div');
ring.className='hold-ring';
ring.setAttribute('aria-hidden','true');
ring.innerHTML=`<svg viewBox="0 0 64 64"><circle class="ring-track" cx="32" cy="32" r="27"/><circle class="ring-fill" cx="32" cy="32" r="27" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${RING_C.toFixed(2)}"/></svg>`;
envelope.appendChild(ring);
const ringFill=ring.querySelector('.ring-fill');
let holdStart=null, holdRaf=null, holdDone=false;
const holdNudge='Mührü kırmak için biraz daha basılı tut.';

const setRing=(p)=>ringFill.setAttribute('stroke-dashoffset',(RING_C*(1-p)).toFixed(2));

function breakSeal(){
  if(opened||locked||holdDone) return;
  holdDone=true;
  setRing(1);
  scene.classList.remove('holding');
  scene.classList.add('seal-broken');
  // Mührün iki parçası ayrılır
  ['left','right'].forEach(side=>{
    const shard=sealEl.cloneNode(true);
    shard.className='seal seal-shard seal-shard-'+side;
    envelope.appendChild(shard);
  });
  setTimeout(openLetter,reduceMotion?0:420);
}

function holdFrame(now){
  const p=Math.min((now-holdStart)/HOLD_MS,1);
  setRing(p);
  if(p>=1){ holdStart=null; breakSeal(); return; }
  holdRaf=requestAnimationFrame(holdFrame);
}

function holdBegin(e){
  if(opened||locked||holdDone) return;
  if(e.button!==undefined && e.button!==0) return;
  e.preventDefault();
  try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}
  holdStart=performance.now();
  ring.classList.remove('releasing');
  if(hint.textContent===holdNudge) hint.textContent=scene.dataset.hintStart||'';
  scene.classList.add('holding');
  holdRaf=requestAnimationFrame(holdFrame);
}

function holdEnd(){
  if(holdStart===null) return;
  const p=(performance.now()-holdStart)/HOLD_MS;
  holdStart=null;
  cancelAnimationFrame(holdRaf);
  scene.classList.remove('holding');
  ring.classList.add('releasing');
  setRing(0);
  if(p<0.5){ if(!scene.dataset.hintStart) scene.dataset.hintStart=hint.textContent; hint.textContent=holdNudge; }
}

[envelope,openBtn].forEach(el=>{
  el.addEventListener('pointerdown',holdBegin);
  el.addEventListener('pointerup',holdEnd);
  el.addEventListener('pointercancel',holdEnd);
  el.addEventListener('contextmenu',e=>e.preventDefault());
});
// Klavye / ekran okuyucu: tıklama olayı işaretçi olmadan gelirse doğrudan kır
openBtn.addEventListener('click',e=>{ if(e.detail===0) breakSeal(); });

/* ---------- Mektubu mühürle ---------- */
function sealLetter(){
  nextBtn.disabled=true;
  openBtn.setAttribute('aria-expanded','false');
  // Zarfı açık hâliyle geri getir
  const showOpenEnvelope=()=>{
    scene.classList.remove('closing','revealed','leaving','seal-broken');
    envelope.querySelectorAll('.seal-shard').forEach(s=>s.remove());
    ring.hidden=true;
    scene.classList.add('sealing');
    hint.textContent=''; // Kapanış cümlesi yalnızca saat sahnesinde, bir kez görünür
    window.scrollTo({top:0,behavior:'auto'});
  };
  // Kâğıt iner, kapak kapanır, mühür belirir; ardından saat sahnesi
  const closeEnvelope=()=>{
    scene.classList.remove('opening');
    hint.focus({preventScroll:true});
    if(finale) setTimeout(startFinale,reduceMotion?0:3200);
  };
  if(reduceMotion){ showOpenEnvelope(); closeEnvelope(); return; }
  scene.classList.add('closing');
  setTimeout(showOpenEnvelope,600);
  setTimeout(closeEnvelope,1350);
}
nextBtn.addEventListener('click',sealLetter);

/* ---------- Köstekli saat ----------
   data-mode="past"   : ibreler geriye döner, data-time'da durur
   data-mode="now"    : ibreler gerçek saate gelir ve saniye ibresiyle işler
   data-mode="future" : ibreler ileri döner, data-time'da durur */
const finale=document.getElementById('finale');
const SVG_NS='http://www.w3.org/2000/svg';
const CX=120, CY=160;

function buildWatch(container,withSeconds){
  const ticks=[], nums=[];
  for(let i=0;i<60;i++){
    const a=i*Math.PI/30, r1=i%5?72:70, r2=78, s=Math.sin(a), c=Math.cos(a);
    ticks.push(`<line x1="${(CX+r1*s).toFixed(2)}" y1="${(CY-r1*c).toFixed(2)}" x2="${(CX+r2*s).toFixed(2)}" y2="${(CY-r2*c).toFixed(2)}" stroke-width="${i%5?.55:1.1}"/>`);
  }
  ['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI'].forEach((n,i)=>{
    const a=i*Math.PI/6;
    nums.push(`<text x="${(CX+59*Math.sin(a)).toFixed(2)}" y="${(CY-59*Math.cos(a)+4.3).toFixed(2)}">${n}</text>`);
  });
  container.innerHTML=`
  <svg class="watch-face" viewBox="0 0 240 290" xmlns="${SVG_NS}" role="img" aria-label="Kapaklı köstekli saat">
    <defs>
      <radialGradient id="caseGrad" cx="38%" cy="32%" r="75%">
        <stop offset="0" stop-color="#ead39f"/><stop offset=".45" stop-color="#c5a36a"/><stop offset="1" stop-color="#6e5532"/>
      </radialGradient>
      <linearGradient id="bezelGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f0dcab"/><stop offset=".5" stop-color="#a88a55"/><stop offset="1" stop-color="#d9bf88"/>
      </linearGradient>
      <radialGradient id="dialGrad" cx="45%" cy="40%" r="70%">
        <stop offset="0" stop-color="#f6eedc"/><stop offset=".75" stop-color="#ece0c6"/><stop offset="1" stop-color="#d8c6a2"/>
      </radialGradient>
    </defs>
    <circle cx="120" cy="34" r="19" fill="none" stroke="url(#bezelGrad)" stroke-width="4.5"/>
    <rect x="113" y="50" width="14" height="10" rx="2" fill="url(#caseGrad)"/>
    <rect x="108" y="56" width="24" height="9" rx="3" fill="url(#caseGrad)" stroke="#6e5532" stroke-width=".6"/>
    <circle cx="120" cy="160" r="100" fill="url(#caseGrad)"/>
    <circle cx="120" cy="160" r="99.5" fill="none" stroke="#5c4629" stroke-width="1"/>
    <circle cx="120" cy="160" r="92" fill="url(#bezelGrad)"/>
    <circle cx="120" cy="160" r="86" fill="url(#dialGrad)" stroke="#9c8058" stroke-width=".8"/>
    <circle cx="120" cy="160" r="78" fill="none" stroke="#29251f" stroke-width=".5" opacity=".7"/>
    <circle cx="120" cy="160" r="72" fill="none" stroke="#29251f" stroke-width=".4" opacity=".5"/>
    <g stroke="#29251f" opacity=".85">${ticks.join('')}</g>
    <g class="numerals" fill="#29251f" text-anchor="middle">${nums.join('')}</g>
    <g id="handH">
      <path d="M120 166 L118.3 160 L119.3 133 L120 118 L120.7 133 L121.7 160 Z" fill="#29251f"/>
      <circle cx="120" cy="129" r="4.2" fill="none" stroke="#29251f" stroke-width="1.6"/>
    </g>
    <g id="handM">
      <path d="M120 168 L118.8 160 L119.5 108 L120 90 L120.5 108 L121.2 160 Z" fill="#29251f"/>
      <circle cx="120" cy="106" r="3.2" fill="none" stroke="#29251f" stroke-width="1.3"/>
    </g>
    ${withSeconds?'<g id="handS" class="hand-s"><path d="M119.6 176 L120 86 L120.4 176 Z" fill="#8a5a3c"/><circle cx="120" cy="160" r="2.2" fill="#8a5a3c"/></g>':''}
    <circle cx="120" cy="160" r="4.6" fill="url(#bezelGrad)" stroke="#5c4629" stroke-width=".6"/>
    <circle cx="120" cy="160" r="1.4" fill="#29251f"/>
  </svg>
  <div class="watch-lid" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path fill="none" stroke="#5c4629" stroke-width=".7" d="M15.2 3.4A9 9 0 1 0 20.6 17 7.4 7.4 0 0 1 15.2 3.4Z"/></svg>
  </div>`;
}

const pad=(n)=>String(n).padStart(2,'0');
const anglesFor=(h,m,s=0)=>({
  h:(h%12)*30+m*0.5+s/120,
  m:m*6+s/10,
  s:s*6
});

function setHands(a){
  const t=(id,deg)=>{ const el=document.getElementById(id); if(el) el.setAttribute('transform',`rotate(${deg} ${CX} ${CY})`); };
  t('handH',a.h); t('handM',a.m); if(a.s!==undefined) t('handS',a.s);
}

// İbreleri döndürür: sabit hızla döner, sonra yavaşlayarak hedefte durur.
// dir: 1 ileri, -1 geri. Akrep yelkovanın 1/12 hızıyla döner.
function spinHands(end,dir,delay,done,opts={}){
  const SPEED=600, FAST=opts.fast??1.4, SLOW=opts.slow??4.4;
  const TOTAL=SPEED*(FAST+SLOW/2);
  const at=(d)=>{ const left=TOTAL-d; setHands({h:end.h-dir*left/12,m:end.m-dir*left}); };
  at(0);
  setTimeout(()=>{
    let t0=null;
    const frame=(now)=>{
      if(t0===null) t0=now;
      const t=(now-t0)/1000;
      let d;
      if(t<FAST) d=SPEED*t;
      else if(t<FAST+SLOW){ const u=t-FAST; d=SPEED*FAST+SPEED*u-SPEED*u*u/(2*SLOW); }
      else d=TOTAL;
      at(d);
      if(d<TOTAL) requestAnimationFrame(frame); else done&&done();
    };
    requestAnimationFrame(frame);
  },delay);
  return (FAST+SLOW)*1000+delay;
}

function startFinale(){
  const mode=finale.dataset.mode||'future';
  const hasMoon=!!finale.querySelector('.finale-moon');
  const watch=document.getElementById('watch');
  const timeEl=document.getElementById('finaleTime');
  const textEl=document.getElementById('finaleText');
  if(!textEl.textContent.trim()) textEl.textContent=sealedHint;
  // Son cümle: kelimeler tek tek belirsin
  if(textEl.classList.contains('finale-quote')){
    const words=textEl.textContent.trim().split(/\s+/);
    textEl.setAttribute('aria-label',words.join(' '));
    textEl.innerHTML=words.map((w,i)=>`<span class="w" style="--i:${i}" aria-hidden="true">${w}</span>`).join(' ');
  }
  buildWatch(watch,mode==='now');
  if(!hasMoon) finale.classList.add('no-moon');

  // Kapağın açılışının bittiği an (CSS'teki gecikmelerle aynı)
  const lidEnd=hasMoon?5600:2800;
  const finish=()=>finale.classList.add('done');

  let tickTimer=null;
  const showNow=()=>{
    const d=new Date();
    setHands(anglesFor(d.getHours(),d.getMinutes(),d.getSeconds()));
    timeEl.textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const show=()=>{
    scene.hidden=true;
    finale.hidden=false;
    finale.classList.add('play');
    window.scrollTo({top:0,behavior:'auto'});
    finale.focus({preventScroll:true});

    if(mode==='now'){
      if(reduceMotion){ showNow(); tickTimer=setInterval(showNow,1000); finish(); return; }
      // Döndükten sonra varılacak gerçek saat
      const dur=spinHands((()=>{ const d=new Date(Date.now()+lidEnd+5800); return anglesFor(d.getHours(),d.getMinutes(),d.getSeconds()); })(),1,lidEnd,()=>{
        finale.classList.add('ticking');
        showNow(); tickTimer=setInterval(showNow,1000); finish();
      });
      return dur;
    }
    if(mode==='past' && !finale.dataset.time){
      // Geçmiş (saat verilmemişse): ibreler bugünkü saatten geriye döner (ilk ana geri sarılır),
      // kısa bir duraksamadan sonra ileri akar ve bugünkü saatte durur.
      const nowAngles=(ms=0)=>{ const d=new Date(Date.now()+ms); return anglesFor(d.getHours(),d.getMinutes(),d.getSeconds()); };
      if(reduceMotion){ setHands(nowAngles()); finish(); return; }
      const opts={fast:1.0,slow:2.6};
      const TRAVEL=600*(opts.fast+opts.slow/2); // yelkovanın her yöndeki yolu
      const legMs=(opts.fast+opts.slow)*1000, pause=600;
      const start=nowAngles(lidEnd);
      const back={h:start.h-TRAVEL/12,m:start.m-TRAVEL};
      spinHands(back,-1,lidEnd,()=>{
        const target=nowAngles(pause+legMs);
        spinHands(target,1,pause,()=>setTimeout(finish,400),opts);
      },opts);
      return;
    }
    const [hh,mm]=(finale.dataset.time||'04:38').split(':').map(Number);
    const end=anglesFor(hh,mm);
    if(finale.dataset.showTime!=='false') timeEl.textContent=`${pad(hh)}:${pad(mm)}`;
    if(reduceMotion){ setHands(end); finish(); return; }
    spinHands(end,mode==='past'?-1:1,lidEnd,()=>setTimeout(finish,400));
  };
  if(reduceMotion){ show(); return; }
  scene.classList.add('fade-away');
  setTimeout(show,900);
}

/* ---------- Zaman kapsülü (yalnızca .capsule olan sayfada) ----------
   data-open="YYYY-MM-DD" tarihine kadar mühürlü kalır; telefonun
   tarihine göre açılır. */
const capsule=document.querySelector('.capsule');
if(capsule){
  const [y,mo,d]=capsule.dataset.open.split('-').map(Number);
  const openDate=new Date(y,mo-1,d);
  const today=new Date(); today.setHours(0,0,0,0);
  const days=Math.round((openDate-today)/86400000);
  const MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const dateText=`${d} ${MONTHS[mo-1]} ${y}`;
  if(days<=0){
    capsule.classList.add('open');
  }else{
    capsule.querySelector('.capsule-when').textContent=`Bu satır ${dateText}'de açılacak.`;
    capsule.querySelector('.capsule-count').textContent=`${days} gün kaldı`;
  }
}

/* ---------- Şifre ekranı (yalnızca #gate olan sayfada) ----------
   Doğru tarih girilince zarf sahnesi açılır. Tarih kodda açık
   yazılmaz; yalnızca kısa bir özeti (FNV-1a) karşılaştırılır. */
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
    clue.textContent=clues[Math.min(wrongCount,clues.length)-1];
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
}
