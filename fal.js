(function(){
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let progress=null;
  try{ progress=Number(localStorage.getItem(window.ZBI.KEY_PROGRESS)||0); }catch(e){}
  if(progress!==null && progress<3){ location.replace('/'); return; }
  const log=(olay,d)=>window.ZBILog&&window.ZBILog(olay,d);
  log('fal_acildi');
  const TAB_LOG={tabTarot:'tarot_sekme',tabKahve:'kahve_sekme',tabEl:'el_sekme'};

  const tabs=[...document.querySelectorAll('.fal-tabs [role=tab]')];
  function selectTab(tab){
    if(tab.getAttribute('aria-selected')!=='true' && TAB_LOG[tab.id]){
      log(TAB_LOG[tab.id]);
      if(tab.id==='tabEl'){ try{ const s=JSON.parse(localStorage.getItem(window.ZBI.KEY_PALM)); if(s&&s.at&&Date.now()<s.at+24*60*60*1000) log('el_tekrar'); }catch(e){} }
    }
    tabs.forEach(t=>{
      const on=t===tab;
      t.setAttribute('aria-selected',on);
      t.tabIndex=on?0:-1;
      document.getElementById(t.getAttribute('aria-controls')).hidden=!on;
    });
  }
  tabs.forEach((t,i)=>{
    t.addEventListener('click',()=>selectTab(t));
    t.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        const n=tabs[(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];
        selectTab(n); n.focus();
      }
    });
  });

  const SYM={
    deli:'<circle cx="50" cy="30" r="8"/><path d="M20 78 Q50 50 80 78"/><path d="M50 38v22M50 60l-10 14M50 60l10 14"/>',
    buyucu:'<path d="M30 50c0-12 16-12 20 0s20 12 20 0-16-12-20 0-20 12-20 0z"/><path d="M50 66v16M42 82h16"/>',
    basrahibe:'<path d="M28 20v62M72 20v62"/><path d="M56 40a12 12 0 1 0 0 20a9 9 0 1 1 0-20z"/>',
    imparatorice:'<circle cx="50" cy="40" r="14"/><path d="M50 54v24M40 68h20"/><path d="M50 14l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/>',
    imparator:'<rect x="30" y="38" width="40" height="40"/><path d="M30 38l8-16 12 10 12-10 8 16"/>',
    basrahip:'<circle cx="50" cy="30" r="10"/><path d="M50 40v40M50 58h12M50 68h8"/>',
    asiklar:'<circle cx="40" cy="50" r="18"/><circle cx="60" cy="50" r="18"/>',
    araba:'<circle cx="50" cy="56" r="20"/><path d="M50 36v40M30 56h40M36 42l28 28M64 42L36 70"/><path d="M50 16l-8 10h16z"/>',
    guc:'<path d="M28 58c0-10 12-10 22 0s22 10 22 0-12-10-22 0-22 10-22 0z"/><path d="M50 22c6 6 6 12 0 18-6-6-6-12 0-18z"/>',
    ermis:'<path d="M40 30h20l-4 30H44z"/><path d="M50 30v-8M44 60h12v8H44z"/><path d="M50 44l-3 6h6z"/>',
    cark:'<circle cx="50" cy="50" r="26"/><circle cx="50" cy="50" r="6"/><path d="M50 24v52M24 50h52M32 32l36 36M68 32L32 68"/>',
    adalet:'<path d="M50 20v58M36 78h28M26 34h48"/><path d="M26 34l-8 18h16zM74 34l-8 18h16z"/>',
    asilan:'<path d="M30 22h40M50 22v18"/><path d="M50 78L36 50h28z"/><circle cx="50" cy="84" r="4"/>',
    olum:'<path d="M36 22h28L50 50l14 28H36l14-28z"/><path d="M42 72h16"/>',
    denge:'<path d="M30 30h16l-3 18h-10zM54 52h16l-3 18h-10z"/><path d="M42 48c6 4 10 4 16 6"/>',
    seytan:'<ellipse cx="38" cy="50" rx="10" ry="14"/><ellipse cx="62" cy="50" rx="10" ry="14"/><path d="M46 50h8"/>',
    kule:'<path d="M38 82V36h24v46M34 36h32l-4-10H38z"/><path d="M58 12l-8 14h8l-6 12"/>',
    yildiz:'<path d="M50 18l6 22 22 0-18 12 7 22-17-13-17 13 7-22-18-12h22z"/>',
    ay:'<path d="M60 22a28 28 0 1 0 0 56a22 22 0 1 1 0-56z"/>',
    gunes:'<circle cx="50" cy="50" r="14"/><path d="M50 22v-8M50 86v-8M22 50h-8M86 50h-8M30 30l-6-6M76 76l-6-6M30 70l-6 6M76 24l-6 6"/>',
    mahkeme:'<path d="M26 64l40-24v28z"/><path d="M66 46c6 0 10 4 10 8s-4 8-10 8"/><path d="M30 30l8 6M46 22v10M62 26l-4 8"/>',
    dunya:'<ellipse cx="50" cy="50" rx="22" ry="30"/><path d="M50 20c-6 10-6 50 0 60M30 40h40M30 60h40"/>'
  };
  const cardFace=(c)=>`
    <div class="tc-face tc-front">
      <span class="tc-no">${c.no}</span>
      <svg class="tc-sym" viewBox="0 0 100 100" aria-hidden="true">${SYM[c.s]||''}</svg>
      <span class="tc-name">${c.ad}</span>
    </div>
    <div class="tc-face tc-back" aria-hidden="true"><span class="tc-moon"></span></div>`;

  const DECK=window.ZBI_DESTE||[];
  const POS=[{k:'gecmis',ad:'Geçmiş'},{k:'simdi',ad:'Şimdi'},{k:'gelecek',ad:'Gelecek'}];
  const DAY=24*60*60*1000;
  const KEY=window.ZBI.KEY_TAROT;
  const spread=document.getElementById('spread');
  const reading=document.getElementById('tarotReading');
  const shuffleBtn=document.getElementById('shuffleBtn');
  const lead=document.getElementById('tarotLead');
  let state=null;
  let timer=0;

  const loadState=()=>{ try{ const v=JSON.parse(localStorage.getItem(KEY)); return v&&Array.isArray(v.cards)&&v.cards.length===3?v:null; }catch(e){ return null; } };
  const saveState=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){} };

  const randInt=(n)=>{ const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; };
  function draw3(){
    const idx=[...DECK.keys()];
    for(let i=idx.length-1;i>0;i--){ const j=randInt(i+1); [idx[i],idx[j]]=[idx[j],idx[i]]; }
    return idx.slice(0,3);
  }

  const isRev=(i)=>!!(state.rev&&state.rev[i]);
  function addReading(i){
    const c=DECK[state.cards[i]], p=POS[i], r=isRev(i);
    const item=document.createElement('article');
    item.className='reading-item'+(r?' is-rev':'');
    item.dataset.order=i;
    const text=r?c['t'+p.k]:c[p.k];
    item.innerHTML=`<div class="ri-pos">${p.ad}${r?' <span class="ri-rev">Ters</span>':''}</div><h3>${c.ad}</h3><div class="ri-keys">${r?c.tanahtar:c.anahtar}</div><p>${text}</p>`;
    const after=[...reading.children].find(el=>Number(el.dataset.order)>i);
    reading.insertBefore(item,after||null);
    return item;
  }

  function updateLead(){
    const n=state?state.open.filter(Boolean).length:0;
    if(!state) lead.textContent='Aklından bir soru geçir ve desteyi karıştır.';
    else if(n<3) lead.textContent='Kartlara sırayla dokun.';
    else lead.textContent='Bugünün kartları açıldı.';
  }

  function render(animate){
    spread.innerHTML=''; reading.innerHTML='';
    spread.classList.remove('dealt');
    if(!state){ updateLead(); return; }
    POS.forEach((p,i)=>{
      const c=DECK[state.cards[i]];
      const slot=document.createElement('div');
      slot.className='slot-card';
      slot.innerHTML=`<div class="slot-label">${p.ad}</div>
        <button type="button" class="tcard${isRev(i)?' rev':''}" aria-label="${p.ad} kartını aç" style="--i:${i}">${cardFace(c)}</button>`;
      const btn=slot.querySelector('.tcard');
      if(state.open[i]){
        btn.classList.add('open'); btn.disabled=true; btn.setAttribute('aria-label',`${p.ad}: ${c.ad}${isRev(i)?', ters':''}`);
        addReading(i);
      }else{
        btn.addEventListener('click',()=>reveal(i,btn),{once:true});
      }
      spread.appendChild(slot);
    });
    if(animate) requestAnimationFrame(()=>spread.classList.add('dealt'));
    else spread.classList.add('dealt');
    updateLead();
    renderSummary(false);
  }

  function renderSummary(animate){
    const old=document.getElementById('tarotSummary'); if(old) old.remove();
    if(!state || state.open.some(o=>!o)) return;
    const z=[0,1,2].map(i=>{ const c=DECK[state.cards[i]]; return isRev(i)?c.tozet:c.ozet; });
    const n=[0,1,2].filter(isRev).length;
    const cap=(t)=>t.charAt(0).toLocaleUpperCase('tr')+t.slice(1);
    const T=[
      `${cap(z[0])} seni bugüne taşıdı. Şimdi hayatında ${z[1]} var ve önünde ${z[2]} seni bekliyor. Kartlar aynı yöne bakıyor: yolun açık, akış senden yana.`,
      `${cap(z[0])} ile başlayan yol, bugün ${z[1]} ile sürüyor; yarın ise ${z[2]} getiriyor. Kartlardan biri ters: hikâyenin bir yerinde küçük bir duraksama var, ama yönü değiştirmiyor.`,
      `Geçmişte ${z[0]}, bugün ${z[1]}, gelecekte ${z[2]}. İki kart ters geldi: enerjinin bir kısmı içe dönmüş. Acele etmeden, kendine zaman tanıdığında düğümler kendiliğinden çözülecek.`,
      `${cap(z[0])}, ${z[1]} ve ${z[2]}. Üç kart da ters: şu an dışarıya değil içeriye bakma zamanı. Bu bir uyarı değil, bir dinlenme çağrısı; yeniden başlamadan önce nefes al.`
    ];
    const el=document.createElement('article');
    el.id='tarotSummary';
    el.className='tarot-summary'+(animate?'':' no-anim');
    el.innerHTML=`<div class="ri-pos">Üç kartın hikâyesi</div><p>${T[n]}</p>`;
    reading.appendChild(el);
    if(animate && !reduceMotion) setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'nearest'}),700);
  }

  function reveal(i,btn){
    btn.classList.add('open');
    btn.disabled=true;
    btn.setAttribute('aria-label',`${POS[i].ad}: ${DECK[state.cards[i]].ad}${isRev(i)?', ters':''}`);
    state.open[i]=true; saveState();
    const item=addReading(i);
    updateLead();
    renderSummary(true);
    if(state.open.every(Boolean)) log('tarot_acildi',{kartlar:POS.map((p,k)=>`${p.ad}: ${DECK[state.cards[k]].ad}${isRev(k)?' (ters)':''}`).join(' · ')});
    if(!reduceMotion) setTimeout(()=>item.scrollIntoView({behavior:'smooth',block:'nearest'}),450);
  }

  function updateButton(){
    clearTimeout(timer);
    const left=state?state.at+DAY-Date.now():0;
    if(left>0){
      const total=Math.ceil(left/60000), h=Math.floor(total/60), m=total%60;
      const txt=h>0?(m?`${h} sa ${m} dk`:`${h} sa`):`${m} dk`;
      shuffleBtn.disabled=true;
      shuffleBtn.textContent=`Yeni açılım ${txt} sonra`;
      timer=setTimeout(updateButton,30000);
    }else{
      shuffleBtn.disabled=false;
      shuffleBtn.textContent='Desteyi karıştır';
    }
  }

  function deal(){
    if(state && Date.now()<state.at+DAY) return;
    state={at:Date.now(),cards:draw3(),rev:[0,1,2].map(()=>randInt(2)===1),open:[false,false,false]};
    saveState();
    log('tarot_karistirildi');
    render(true);
    updateButton();
  }
  shuffleBtn.addEventListener('click',deal);

  state=loadState();
  if(state && Date.now()>=state.at+DAY) state=null;
  if(state && state.open.some(Boolean)) log('tarot_tekrar');
  render(false);
  updateButton();

  const CUPS=window.ZBI_KAHVE||[];
  const cupsEl=document.getElementById('cups');
  const esc=(t)=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const paras=(t)=>esc(t).split(/\n\s*\n/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  CUPS.forEach((cup,ci)=>{
    const el=document.createElement('article');
    el.className='cup';
    const tabsId=`cup${ci}`;
    el.innerHTML=`
      <button type="button" class="cup-head" aria-expanded="false" aria-controls="${tabsId}">
        <span class="cup-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 18h24v10a12 12 0 0 1-24 0z"/><path d="M34 21h3a5 5 0 0 1 0 10h-4"/><path d="M8 42h30"/><path d="M18 8c-2 3 2 4 0 7M26 8c-2 3 2 4 0 7"/></svg></span>
        <span class="cup-title">${esc(cup.baslik)}${cup.tarih?`<small>${esc(cup.tarih)}</small>`:''}</span>
        <span class="cup-arrow" aria-hidden="true"></span>
      </button>
      <div class="cup-body" id="${tabsId}" inert><div class="cup-inner">
        <div class="cup-tabs" role="tablist" aria-label="${esc(cup.baslik)} yorumları">
          ${cup.yorumlar.map((y,yi)=>`<button type="button" role="tab" aria-selected="${yi===0}" data-y="${yi}">${esc(y.kim)}</button>`).join('')}
        </div>
        <div class="cup-text" role="tabpanel" aria-live="polite">${paras(cup.yorumlar[0]?.metin||'')}</div>
      </div></div>`;
    const head=el.querySelector('.cup-head'), body=el.querySelector('.cup-body'), text=el.querySelector('.cup-text');
    head.addEventListener('click',()=>{
      const open=head.getAttribute('aria-expanded')!=='true';
      head.setAttribute('aria-expanded',open); body.inert=!open; el.classList.toggle('open',open);
      if(open){
        log('kahve_fincan',{fincan:ci+1});
        const sel=el.querySelector('.cup-tabs [aria-selected=true]');
        if(sel) log('kahve_okundu',{fincan:ci+1,ai:cup.yorumlar[Number(sel.dataset.y)].kim});
      }
    });
    el.querySelectorAll('.cup-tabs [role=tab]').forEach(b=>b.addEventListener('click',()=>{
      if(b.getAttribute('aria-selected')!=='true') log('kahve_okundu',{fincan:ci+1,ai:cup.yorumlar[Number(b.dataset.y)].kim});
      el.querySelectorAll('.cup-tabs [role=tab]').forEach(x=>x.setAttribute('aria-selected',x===b));
      text.classList.remove('fade'); void text.offsetWidth; text.classList.add('fade');
      text.innerHTML=paras(cup.yorumlar[Number(b.dataset.y)].metin);
    }));
    cupsEl.appendChild(el);
  });
})();
