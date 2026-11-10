/* =========================================================
   Zamandan bir iz — şifre ekranı (giriş sayfası)
   Doğru tarih girilince giriş sahnesi ve müzik açılır. Tarih kodda açık
   yazılmaz; yalnızca kısa bir özeti (FNV-1a) karşılaştırılır. */
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const entry=document.getElementById('entry');
  const unlock=()=>{
    field.classList.add('right');
    msg.textContent='';
    input.blur();
    try{ localStorage.setItem(window.ZBI.KEY_GATE,'1'); }catch(e){}
    setTimeout(()=>gate.classList.add('leaving'),reduceMotion?0:700);
    setTimeout(()=>{
      gate.hidden=true;
      entry.hidden=false;
      if(window.ZBIMuzik) window.ZBIMuzik.show(); // müzik kendiliğinden başlamaz
      entry.classList.add('from-gate');
      window.scrollTo({top:0,behavior:'auto'});
      entry.focus({preventScroll:true});
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
