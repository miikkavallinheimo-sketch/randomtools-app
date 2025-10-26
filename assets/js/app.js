/* RandomTools.app — kaikki työkalut yhdessä tiedostossa (Cloudflare-safe) */
(function(){
  // -------------------- Helpers --------------------
  const $ = (sel,root=document)=>root.querySelector(sel);
  const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const show = el => { if(el) el.style.display='flex'; };
  const hide = el => { if(el) el.style.display='none'; };
  const isEditableFocused = () => {
    const ae = document.activeElement;
    return ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.isContentEditable);
  };

  // Audio & haptics
  let audioCtx;
  function getCtx(){ if(!audioCtx){ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } return audioCtx; }
  function beep(freq=600, dur=70, type='sine', gain=0.04){
    try{ const ctx=getCtx(), o=ctx.createOscillator(), g=ctx.createGain();
      o.type=type; o.frequency.value=freq; g.gain.value=gain; o.connect(g); g.connect(ctx.destination);
      o.start(); setTimeout(()=>o.stop(), dur);
    }catch(e){}
  }
  function tick(){ beep(900,40,'square',0.03); }
  function thud(){ beep(120,120,'sine',0.06); }
  function vibrate(ms=30){ if(navigator.vibrate) try{ navigator.vibrate(ms); }catch(e){} }

  // -------------------- Global state --------------------
  const stats = {
    numbers:{ total:0, sum:0, saved:0 },
    dice:{ total:0, sum:0, highest:0 },
    cards:{ total:0, red:0, black:0, jokers:0 },
    coin:{ total:0, heads:0, tails:0 },
    roulette:{ total:0, red:0, black:0, zero:0 },
    wheel:{ total:0, results:{} }
  };

  // SPA nav
  function showPage(pageId){
    $$('.page').forEach(p=>p.classList.remove('active'));
    const target = $('#'+pageId); if(target) target.classList.add('active');
    $$('.nav-item').forEach(a=>a.classList.toggle('active', a.dataset.page===pageId));
    if(pageId==='wheel'){ ensureWheelInit(); drawWheel(); }
    if(pageId==='roulette'){ ensureRouletteFrames(); }
  }

  function bindNav(){
    $('#navMenu').addEventListener('click', e=>{
      const a = e.target.closest('a.nav-item'); if(!a) return; e.preventDefault();
      showPage(a.dataset.page);
    });
    $$('.game-card').forEach(c=>c.addEventListener('click',()=>showPage(c.dataset.jump)));
  }

  // Close overlay buttons (delegoitu)
  document.addEventListener('click', e=>{
    if(e.target.matches('.delete-btn')){
      const i = +e.target.dataset.idx;
      memory.splice(i,1); stats.numbers.saved=Math.max(0,stats.numbers.saved-1);
      updateMemoryDisplay(); updateNumberStats();
    }
    if(e.target.matches('[data-close]')){
      const sel = e.target.getAttribute('data-close'); const ov = $(sel); hide(ov);
    }
  });

  // SPACE = primary action / accelerate
  document.addEventListener('keydown', e=>{
    if(e.code==='Space' && !isEditableFocused()){ e.preventDefault(); onPrimaryAction(); }
  });

  function onPrimaryAction(){
    // Fullscreen overlayt ensin
    if($('#fullscreenOverlay').style.display==='flex'){ if(cardFlipping) accelerateCards(); else $('#btnDrawCardFs').click(); return; }
    if($('#overlayNumber').style.display==='flex'){ if(numbersRunning){ numbersAccel=true; } else $('#btnGenerate').click(); return; }
    if($('#overlayDice').style.display==='flex'){ if(diceRunning) accelerateDice(); else $('#btnRollDice').click(); return; }
    if($('#overlayCoin').style.display==='flex'){ if(coinRunning) accelerateCoin(); else $('#btnFlipCoin').click(); return; }
    if($('#overlayRoulette').style.display==='flex'){ if(rouletteRunning) accelerateRoulette(); else $('#btnSpinRoulette').click(); return; }
    if($('#overlayWheel').style.display==='flex'){ if(isSpinningWheel) accelerateWheel(); else $('#spinBtn').click(); return; }

    // Muuten aktiivisen sivun mukaan
    const page = $('.page.active')?.id;
    if(page==='numbers'){ if(numbersRunning){ numbersAccel=true; } else $('#btnGenerate').click(); }
    else if(page==='dice'){ if(diceRunning) accelerateDice(); else $('#btnRollDice').click(); }
    else if(page==='cards'){ if(cardFlipping) accelerateCards(); else $('#btnDrawCard').click(); }
    else if(page==='coin'){ if(coinRunning) accelerateCoin(); else $('#btnFlipCoin').click(); }
    else if(page==='roulette'){ if(rouletteRunning) accelerateRoulette(); else $('#btnSpinRoulette').click(); }
    else if(page==='wheel'){ if(isSpinningWheel) accelerateWheel(); else $('#spinBtn').click(); }
  }

  // Tärkeimmät “klikattavat” alueet myös laukaisemaan
  ;['numberResult','diceDisplay','cardDisplay','coinDisplay','rouletteDisplay'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return; el.addEventListener('click', onPrimaryAction);
  });
  ;['overlayNumber','overlayDice','overlayCoin','overlayRoulette','overlayWheel','fullscreenOverlay'].forEach(id=>{
    const ov = document.getElementById(id);
    ov.addEventListener('click', (e)=>{ if(e.target.closest('.controls')) return; onPrimaryAction(); });
  });

  // -------------------- NUMBERS --------------------
  let memory=[], lastRandomNumber=null, numbersRunning=false, numbersAccel=false;

  function updateNumberStats(){
    $('#totalGenerated').textContent = stats.numbers.total;
    $('#averageNumber').textContent = stats.numbers.total? (stats.numbers.sum/stats.numbers.total).toFixed(1):'-';
    $('#savedCount').textContent = stats.numbers.saved;
  }
  function updateMemoryDisplay(){
    const list=$('#memoryList'); list.innerHTML='';
    memory.forEach((item,idx)=>{
      const el=document.createElement('div');
      el.className='memory-item';
      el.innerHTML=`<span>${item.value} (${item.timestamp})</span><button class="delete-btn" data-idx="${idx}">Delete</button>`;
      list.appendChild(el);
    });
  }

  function spinNumberTo(el, final){
    return new Promise(resolve=>{
      numbersRunning=true; let t=0; numbersAccel=false;
      const min=parseInt($('#minNumber').value), max=parseInt($('#maxNumber').value);
      const steps= Math.max(12, 18);
      const h=setInterval(()=>{
        el.textContent = Math.floor(Math.random()*(max-min+1))+min;
        if(Math.random()<0.15) tick(); t++;
        if(numbersAccel || t>=steps){
          clearInterval(h); el.textContent=final; el.style.animation='none'; void el.offsetWidth;
          el.style.animation='pop-in .45s ease'; numbersRunning=false; resolve();
        }
      }, 35);
    });
  }

  function bindNumbers(){
    $('#btnGenerate').addEventListener('click',async()=>{
      const min = parseInt($('#minNumber').value), max = parseInt($('#maxNumber').value);
      if(!Number.isFinite(min)||!Number.isFinite(max)||min>=max){ alert('Maximum must be greater than minimum.'); return;}
      const resultDiv=$('#numberResult'); resultDiv.style.display='flex';
      const n = Math.floor(Math.random()*(max-min+1))+min;
      beep(700,60); vibrate(25);
      const fsOpen = $('#overlayNumber').style.display==='flex';
      const tasks=[spinNumberTo(resultDiv,n)];
      if(fsOpen){ const fsEl=$('#overlayNumberInner'); tasks.push(spinNumberTo(fsEl,n)); }
      await Promise.all(tasks);
      lastRandomNumber=n; stats.numbers.total++; stats.numbers.sum+=n; updateNumberStats(); thud(); vibrate(40); $('#saveBtn').style.display='inline-block';
    });
    $('#saveBtn').addEventListener('click',()=>{
      if(lastRandomNumber!==null){
        memory.push({value:lastRandomNumber,timestamp:new Date().toLocaleTimeString('en-GB')});
        stats.numbers.saved++; updateMemoryDisplay(); updateNumberStats(); beep(500,50); vibrate(20);
      }
    });
    $('#clearMemoryBtn').addEventListener('click',()=>{
      memory=[]; stats.numbers.saved=0; updateMemoryDisplay(); updateNumberStats(); beep(320,60,'square'); vibrate(20);
    });
    $('#btnFsNumber').addEventListener('click',()=>{
      $('#overlayNumberInner').textContent = lastRandomNumber ?? '—'; show($('#overlayNumber'));
    });
  }

  // -------------------- DICE --------------------
  let diceRunning=false, diceIntervals=[], currentDiceFinals=null;

  function getDiceSymbol(n){ return ['⚀','⚁','⚂','⚃','⚄','⚅'][n-1]; }
  function updateDiceStats(){
    $('#totalRolls').textContent=stats.dice.total;
    $('#averageRoll').textContent=stats.dice.total? (stats.dice.sum/stats.dice.total).toFixed(1):'-';
    $('#highestRoll').textContent=stats.dice.highest||'-';
  }
  function animateDice(displayEl, finalResults){
    displayEl.innerHTML=''; const spans=[];
    finalResults.forEach(()=>{
      const s=document.createElement('span'); s.textContent='⚀';
      displayEl.appendChild(s); spans.push(s);
    });
    diceIntervals = [];
    finalResults.forEach((final, idx)=>{
      let ticks=0;
      const handle=setInterval(()=>{
        const r=Math.floor(Math.random()*6)+1;
        spans[idx].textContent=getDiceSymbol(r);
        spans[idx].style.transform='scale(1.2)'; spans[idx].style.transition='transform .08s';
        setTimeout(()=>spans[idx].style.transform='scale(1)',80);
        if(Math.random()<0.12) tick();
        if(++ticks> 10 + idx*4){
          clearInterval(handle); spans[idx].textContent=getDiceSymbol(final);
          diceIntervals[idx]=null; checkDiceFinished(finalResults);
        }
      }, 60);
      diceIntervals.push(handle);
    });
  }
  function checkDiceFinished(finals){
    if(diceIntervals.every(h=>!h)){
      diceRunning=false; const total = finals.reduce((a,b)=>a+b,0);
      stats.dice.total++; stats.dice.sum+=total; stats.dice.highest=Math.max(stats.dice.highest,total); updateDiceStats();
      const resultDiv=$('#diceResult'); resultDiv.textContent=`Result: ${finals.join(' + ')} = ${total}`;
      resultDiv.style.display='flex'; thud(); vibrate(60);
    }
  }
  function accelerateDice(){
    if(!diceRunning) return;
    diceIntervals.forEach((h,i)=>{ if(h){ clearInterval(h); diceIntervals[i]=null; } });
    const container=$('#overlayDice').style.display==='flex'? $('#overlayDiceInner'): $('#diceDisplay');
    const spans=[...container.querySelectorAll('span')];
    if(spans.length && currentDiceFinals){ spans.forEach((s,i)=> s.textContent=getDiceSymbol(currentDiceFinals[i])); }
    checkDiceFinished(currentDiceFinals);
  }
  function rollDice(count, syncResults){
    const finals = syncResults || Array.from({length:count},()=>Math.floor(Math.random()*6)+1);
    currentDiceFinals=finals; diceRunning=true; beep(750,60); vibrate(30);
    const mainEl=$('#diceDisplay'); const fsOpen=$('#overlayDice').style.display==='flex';
    animateDice(mainEl, finals); if(fsOpen){ animateDice($('#overlayDiceInner'), finals); }
    return finals;
  }
  function bindDice(){
    $('#btnRollDice').addEventListener('click',()=>{ const diceCount=parseInt($('#diceCount').value)||1; rollDice(diceCount); });
    $('#btnFsDice').addEventListener('click',()=>{ $('#overlayDiceInner').textContent='—'; show($('#overlayDice')); });
  }

  // -------------------- CARDS --------------------
  let cardDeck = [], drawnCards = [], totalDeckSize = 0;
  let cardFlipping=false, cardFlipTimer=null, pendingCard=null, pendingCardTarget=null;

  function createDeck(){
    const deckCount=parseInt($('#deckCount').value)||1;
    const jokerCount=parseInt($('#jokerCount').value)||0;
    cardDeck=[]; const suits=['♠','♥','♦','♣'], values=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    for(let d=0; d<deckCount; d++){
      for(const s of suits){ for(const v of values){ cardDeck.push({value:v,suit:s,isJoker:false}); } }
      for(let j=0;j<jokerCount;j++){ cardDeck.push({value:'JOKER',suit:'🃏',isJoker:true}); }
    }
    totalDeckSize=cardDeck.length; drawnCards=[];
    for(let i=cardDeck.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [cardDeck[i],cardDeck[j]]=[cardDeck[j],cardDeck[i]]; }
  }
  function resetDeck(){
    stats.cards={ total:0, red:0, black:0, jokers:0 };
    createDeck(); updateCardStats();
    $('#cardDisplay').textContent='Press Space or tap';
    $('#cardResult').style.display='none';
    $('#fullscreenCard').textContent='Press Space or tap'; $('#fullscreenCard').style.color='#888';
  }
  function updateCardStats(){
    const removeDrawn = $('#removeDrawn').checked;
    $('#totalCards').textContent=stats.cards.total;
    $('#cardsLeft').textContent = removeDrawn ? cardDeck.length : totalDeckSize;
    $('#redCards').textContent=stats.cards.red; $('#blackCards').textContent=stats.cards.black; $('#jokersDrawn').textContent=stats.cards.jokers;
    $('#removeDrawnPill').classList.toggle('active', removeDrawn);
  }
  function cardFrontHTML(card){
    const isRed = card.suit==='♥' || card.suit==='♦', color = isRed ? 'var(--orange)' : '#000000';
    return card.isJoker
      ? `<div style="background:#fff;width:80%;height:85%;border:2px solid var(--gold);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:28px;font-family:'JetBrains Mono',monospace;color:var(--orange);"><div>JOKER</div><div style="font-size:54px;margin-top:4px;">🃏</div></div>`
      : `<div style="background:#fff;width:80%;height:85%;border:2px solid var(--gold);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:40px;font-family:'JetBrains Mono',monospace;color:${color};"><div style="margin-bottom:4px;">${card.value}</div><div style="font-size:56px;">${card.suit}</div></div>`;
  }
  function cardBackHTML(){
    return `<div style="background:linear-gradient(135deg,#0f0f0f,#1c1c1c);width:80%;height:85%;border:2px solid var(--gold);border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;font-family:'JetBrains Mono',monospace;color:var(--gold);">◆◆◆</div>`;
  }
  async function renderCardFlip(targetEl, card, duration=750){
    cardFlipping=true; pendingCard=card; pendingCardTarget=targetEl;
    targetEl.innerHTML = cardBackHTML();
    targetEl.style.animation='shake .5s'; setTimeout(()=>targetEl.style.animation='none',520);
    clearTimeout(cardFlipTimer);
    cardFlipTimer = setTimeout(()=>{
      targetEl.innerHTML = cardFrontHTML(card);
      targetEl.firstElementChild.style.animation='pop-in .45s ease';
      cardFlipping=false;
    }, duration);
  }
  function accelerateCards(){
    if(!cardFlipping) return;
    clearTimeout(cardFlipTimer);
    if(pendingCard && pendingCardTarget){
      pendingCardTarget.innerHTML = cardFrontHTML(pendingCard);
      pendingCardTarget.firstElementChild.style.animation='pop-in .3s ease';
      cardFlipping=false;
    }
  }
  function drawFromDeck(){
    const removeDrawn = $('#removeDrawn').checked;
    if(removeDrawn && cardDeck.length===0){ alert('Deck is empty. Reset it.'); return null; }
    let card;
    if(removeDrawn){ card = cardDeck.pop(); }
    else { if(cardDeck.length===0) createDeck(); card = cardDeck[Math.floor(Math.random()*cardDeck.length)]; }
    return card;
  }
  async function drawCardCommon(targetEl){
    $('#cardResult').style.display='none'; const card = drawFromDeck(); if(!card) return;
    beep(800,50); vibrate(25);
    await renderCardFlip(targetEl, card, 700);
    $('#cardResult').textContent = card.isJoker ? `Drew: Joker` : `Drew: ${card.value}${card.suit}`;
    $('#cardResult').style.display='flex';
    stats.cards.total++; if(card.isJoker) stats.cards.jokers++; else ((card.suit==='♥'||card.suit==='♦')?stats.cards.red++:stats.cards.black++);
    updateCardStats(); thud(); vibrate(40);
    return card;
  }
  function bindCards(){
    $('#deckCount').addEventListener('change', resetDeck);
    $('#jokerCount').addEventListener('change', resetDeck);
    $('#removeDrawn').addEventListener('change', updateCardStats);
    $('#btnResetDeck').addEventListener('click', resetDeck);
    $('#btnDrawCard').addEventListener('click',()=>{ drawCardCommon($('#cardDisplay')); });

    const overlayCards=$('#fullscreenOverlay');
    $('#btnFullscreen').addEventListener('click',()=>{ show(overlayCards); });
    $('#btnExitFs').addEventListener('click',()=>{ hide(overlayCards); });
    $('#btnDrawCardFs').addEventListener('click',async()=>{
      const card = drawFromDeck(); if(!card) return;
      $('#cardResult').style.display='none'; beep(800,50); vibrate(25);
      await renderCardFlip($('#fullscreenCard'), card, 700);
      $('#cardResult').textContent = card.isJoker ? `Drew: Joker` : `Drew: ${card.value}${card.suit}`;
      $('#cardResult').style.display='flex';
      stats.cards.total++; if(card.isJoker) stats.cards.jokers++; else ((card.suit==='♥'||card.suit==='♦')?stats.cards.red++:stats.cards.black++);
      updateCardStats(); thud(); vibrate(40);
    });
  }

  // -------------------- COIN --------------------
  let flipHistory=[]; let coinRunning=false, coinTimer=null, coinDoneRef=null;

  function updateCoinStats(){
    $('#totalFlips').textContent=stats.coin.total;
    $('#headsCount').textContent=stats.coin.heads;
    $('#tailsCount').textContent=stats.coin.tails;
    $('#headsPercentage').textContent = stats.coin.total? ((stats.coin.heads/stats.coin.total)*100).toFixed(1)+'%' : '50.0%';
  }
  function updateFlipHistory(){
    const div=$('#flipHistory'); div.innerHTML='';
    flipHistory.forEach(e=>{
      const item=document.createElement('div'); item.className='memory-item';
      const emoji = e.result==='Heads' ? '👑' : '⚔️';
      item.innerHTML=`<span>${emoji} ${e.result} (${e.timestamp})</span>`;
      div.appendChild(item);
    });
  }
  function coinMarkupPlaceholder(){
    return `<div class="coin-display" style="animation:coin-spin 1.2s cubic-bezier(.2,.9,.22,1) infinite"><div class="coin-face"><div style="font-size:2.1em">❓</div><div style="font-size:12px;font-weight:800;opacity:.7">SPINNING…</div></div></div>`;
  }
  function coinMarkupFinal(isHeads){
    return `<div class="coin-display" style="animation:pop-in .45s ease both;${isHeads? 'background:radial-gradient(circle at 30% 30%, #FFD27A, #B88400);color:#1a1a1a' : 'background:radial-gradient(circle at 30% 30%, #C96F6F, #7A1E1E);color:#fff'}"><div class="coin-face"><div style="font-size:2.1em">${isHeads?'👑':'⚔️'}</div><div style="font-size:12px;font-weight:800">${isHeads?'HEADS':'TAILS'}</div></div></div>`;
  }
  function accelerateCoin(){
    if(!coinRunning) return;
    clearTimeout(coinTimer); coinTimer=null; coinRunning=false; if(typeof coinDoneRef==='function') coinDoneRef();
  }
  function bindCoin(){
    $('#btnFlipCoin').addEventListener('click',()=>{
      $('#coinResult').style.display='none';
      const d=$('#coinDisplay'); const fsOpen=$('#overlayCoin').style.display==='flex';
      const duration = 1000 + Math.random()*400; // lyhyempi
      beep(720,60); vibrate(30);
      d.innerHTML = coinMarkupPlaceholder(); if(fsOpen){ $('#overlayCoinInner').innerHTML = coinMarkupPlaceholder(); }
      const isHeads = Math.random()<0.5;
      const done = ()=>{
        d.innerHTML = coinMarkupFinal(isHeads); if(fsOpen){ $('#overlayCoinInner').innerHTML = coinMarkupFinal(isHeads); }
        $('#coinResult').textContent=`Result: ${isHeads?'Heads':'Tails'}`; $('#coinResult').style.display='flex';
        flipHistory.unshift({result:isHeads?'Heads':'Tails',timestamp:new Date().toLocaleTimeString('en-GB')}); if(flipHistory.length>10) flipHistory.pop();
        stats.coin.total++; if(isHeads) stats.coin.heads++; else stats.coin.tails++; updateCoinStats(); updateFlipHistory(); thud(); vibrate(70);
      };
      coinRunning=true; coinDoneRef=done; coinTimer = setTimeout(()=>{ coinRunning=false; done(); }, duration);
    });
    $('#btnFsCoin').addEventListener('click',()=>{ show($('#overlayCoin')); $('#overlayCoinInner').innerHTML='<div class="coin-display"><div class="coin-face" style="opacity:.6">—</div></div>'; });
  }

  // -------------------- ROULETTE --------------------
  let rouletteRunning=false, rouletteState=null;
  const EURO_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const AMER_ORDER = [0,28,9,26,30,11,7,20,32,17,5,22,34,15,3,24,36,13,1,'00',27,10,25,29,12,8,19,31,18,6,21,33,16,4,23,35,14,2];

  function getRouletteColor(n){ if(n===0 || n==='00') return 'Green'; const red=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]; return red.includes(+n)?'Red':'Black'; }
  function getColorCode(c){ return c==='Red'? 'var(--orange)': c==='Black'? '#000000': 'var(--mint)'; }

  function renderRouletteFrame(el){
    el.innerHTML = `<div class="roulette-frame"><div class="roulette-wheel"><div class="roulette-center">–</div><div class="roulette-ball"></div></div><div class="roulette-label">Space / tap to spin</div></div>`;
  }
  function ensureRouletteFrames(){
    if(!$('#rouletteDisplay').querySelector('.roulette-wheel')) renderRouletteFrame($('#rouletteDisplay'));
    if($('#overlayRoulette').style.display==='flex' && !$('#overlayRouletteInner').querySelector('.roulette-wheel')) renderRouletteFrame($('#overlayRouletteInner'));
  }
  function updateRouletteVisual(container, n, color, rotation){
    const wheel = container.querySelector('.roulette-wheel');
    const center = container.querySelector('.roulette-center');
    const ball = container.querySelector('.roulette-ball');
    wheel.style.background = getColorCode(color);
    center.textContent = n;
    center.style.color = color==='Black'? '#fff':'#000';
    ball.style.transform = `rotate(${rotation}deg)`;
  }
  function spinRouletteOnce(){
    ensureRouletteFrames();
    const variant = $('#rouletteVariant').value;
    const order = variant==='american'? AMER_ORDER : EURO_ORDER;
    const cont=$('#rouletteDisplay'); const fsOpen=$('#overlayRoulette').style.display==='flex'; const contFs=$('#overlayRouletteInner');
    $('#rouletteResult').style.display='none'; beep(800,60); vibrate(40);
    rouletteRunning=true; let idx = Math.floor(Math.random()*order.length);
    const totalSteps = 30 + Math.floor(Math.random()*20); // aiempaa lyhyempi
    let step=0, rotation=0;
    const advance = ()=>{
      const n=order[idx]; const color=getRouletteColor(n);
      rotation += 360/order.length;
      updateRouletteVisual(cont, n, color, rotation);
      if(fsOpen){ updateRouletteVisual(contFs, n, color, rotation); }
      if(Math.random()<0.12) tick();
      idx = (idx+1)%order.length; step++;
      if(step<rouletteState.totalSteps){
        const t = 12 + step*3;
        rouletteState.timer = setTimeout(advance, t);
      } else {
        rouletteRunning=false;
        const final = order[(idx-1+order.length)%order.length];
        const finalColor=getRouletteColor(final);
        const resultDiv=$('#rouletteResult');
        resultDiv.textContent=`Result: ${final} (${finalColor})`;
        resultDiv.style.display='flex';
        stats.roulette.total++; if(finalColor==='Red') stats.roulette.red++; else if(finalColor==='Black') stats.roulette.black++; else stats.roulette.zero++;
        updateRouletteStats(); thud(); vibrate(80);
      }
    };
    rouletteState={variant,order,idx,step,totalSteps,rotation,timer:null};
    advance();
  }
  function accelerateRoulette(){
    if(!rouletteRunning || !rouletteState) return;
    rouletteState.totalSteps = Math.min(rouletteState.totalSteps, rouletteState.step + 6);
  }
  function updateRouletteStats(){
    $('#totalSpins').textContent=stats.roulette.total;
    $('#redNumbers').textContent=stats.roulette.red;
    $('#blackNumbers').textContent=stats.roulette.black;
    $('#zeroNumbers').textContent=stats.roulette.zero;
  }
  function bindRoulette(){
    $('#btnSpinRoulette').addEventListener('click', spinRouletteOnce);
    $('#btnFsRoulette').addEventListener('click',()=>{ show($('#overlayRoulette')); renderRouletteFrame($('#overlayRouletteInner')); });
  }

  // -------------------- WHEEL --------------------
  let wheelSectors=['Option 1','Option 2','Option 3','Option 4','Option 5','Option 6'], wheelHistory=[];
  let wheelCanvas, wheelCtx, wheelCanvasFs, wheelCtxFs;
  let isSpinningWheel = false, wheelAngle = 0, wheelVel = 0;
  let wheelFriction = 0.985, accelerateNow = false, rafId = null;

  function ensureWheelInit(){
    if(!wheelCanvas){ wheelCanvas=$('#wheelCanvas'); if(wheelCanvas) wheelCtx=wheelCanvas.getContext('2d'); }
    if(!wheelCanvasFs){ wheelCanvasFs=$('#wheelCanvasFs'); if(wheelCanvasFs) wheelCtxFs=wheelCanvasFs.getContext('2d'); }
    updateWheelSectionsFromCount(); drawWheel();
  }
  function updateWheelSectionsFromCount(){
    let count = parseInt($('#wheelSections').value||6);
    if(!Number.isFinite(count)) count = 6;
    count = Math.max(2, Math.min(20, count));
    $('#wheelSections').value = count;
    if (wheelSectors.length < count) { for (let i = wheelSectors.length; i < count; i++) wheelSectors.push(`Option ${i+1}`); }
    else if (wheelSectors.length > count) { wheelSectors = wheelSectors.slice(0, count); }
    buildWheelInputsUI(); drawWheel();
  }
  function buildWheelInputsUI(){
    const wrap = $('#wheelInputs'); wrap.innerHTML = '';
    wheelSectors.forEach((name, i)=>{
      const row = document.createElement('div'); row.className = 'memory-item'; row.style.gap = '12px';
      row.innerHTML = `<span style="opacity:.8">#${i+1}</span>
        <input type="text" value="${String(name).replace(/"/g,'&quot;')}" data-idx="${i}"
          style="flex:1;min-width:0;padding:10px 12px;border-radius:8px;border:1px solid var(--light-gray);background:#1f1f1f;color:var(--cream);">`;
      wrap.appendChild(row);
    });
    wrap.querySelectorAll('input[type="text"]').forEach(inp=>{
      inp.addEventListener('input', (e)=>{
        const idx = +e.target.dataset.idx;
        wheelSectors[idx] = e.target.value.trim() || `Option ${idx+1}`;
        drawWheel();
      });
    });
  }
  function applyWheelPreset(val){
    const map = {
      yesno: ['Yes','No'],
      directions: ['North','South','East','West'],
      colors: ['Orange','Gold','Mint','Black','Gray','Cream'].slice(0, Math.max(2, Math.min(6, +$('#wheelSections').value||6))),
      numbers: [1,2,3,4,5,6].map(String),
      pizza: ['Margherita','Pepperoni','Veggie','BBQ','Hawaiian','Four Cheese'],
      movies: ['Action','Drama','Comedy','Sci-Fi','Thriller','Documentary']
    };
    if(!val){ buildWheelInputsUI(); drawWheel(); return; }
    const arr = map[val] || []; if (!arr.length) return;
    const count = Math.max(2, Math.min(20, arr.length));
    $('#wheelSections').value = count; wheelSectors = arr.slice(0, count);
    buildWheelInputsUI(); drawWheel();
  }
  function drawWheel(){
    if(!wheelCtx || !wheelCtxFs) return;
    drawWheelTo(wheelCanvas, wheelCtx);
    if($('#overlayWheel').style.display==='flex'){ drawWheelTo(wheelCanvasFs, wheelCtxFs); }
  }
  function drawWheelTo(canvas, ctx){
    const w = canvas.width, h = canvas.height, cx = w/2, cy = h/2;
    ctx.clearRect(0,0,w,h);
    const r = Math.min(w,h)/2 - 10; const n = wheelSectors.length; const a = (Math.PI*2)/n;

    ctx.save(); ctx.translate(cx,cy); ctx.beginPath(); ctx.arc(0,0,r+6,0,Math.PI*2); ctx.fillStyle = '#0e0e0e'; ctx.fill(); ctx.restore();

    const fills = ['var(--orange)','var(--gold)','var(--mint)','var(--black)','var(--light-gray)'];
    for(let i=0;i<n;i++){
      const start = wheelAngle + i*a - Math.PI/2, end = start + a;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end,false); ctx.closePath();
      ctx.fillStyle = fills[i % fills.length]; ctx.fill();
      ctx.strokeStyle = 'var(--dark-gray)'; ctx.lineWidth = 2; ctx.stroke();

      ctx.save(); ctx.translate(cx,cy); ctx.rotate((start+end)/2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'var(--cream)';
      const fontPx = Math.max(12, Math.min(22, r*0.08));
      ctx.font = `600 ${fontPx}px Inter, system-ui, sans-serif`;
      ctx.translate(0, -r*0.72);
      const label = String(wheelSectors[i]); const maxWidth = r*0.9; let text = label;
      while (ctx.measureText(text).width > maxWidth && text.length > 3) { text = text.slice(0, text.length-2) + '…'; }
      ctx.fillText(text, 0, 0); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx,cy, Math.max(10, r*0.08), 0, Math.PI*2); ctx.fillStyle = 'var(--gold)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy, Math.max(7, r*0.055), 0, Math.PI*2); ctx.fillStyle = '#000'; ctx.fill();
  }
  function wheelIndexAtPointer(){
    const n = wheelSectors.length; const a = (Math.PI*2)/n;
    let t = (-wheelAngle) % (Math.PI*2); if (t < 0) t += Math.PI*2;
    return Math.floor(t / a) % n;
  }
  function updateWheelStatsUI(){
    $('#totalWheelSpins').textContent = stats.wheel.total;
    let most = '-', mostCount = 0, uniq = 0;
    for(const k in stats.wheel.results){ uniq++; if(stats.wheel.results[k] > mostCount){ most = k; mostCount = stats.wheel.results[k]; } }
    $('#mostCommon').textContent = most; $('#uniqueResults').textContent = uniq; $('#lastResult').textContent = wheelHistory[0] || '-';
  }
  function pushWheelHistory(name){
    wheelHistory.unshift(name); if(wheelHistory.length>12) wheelHistory.pop();
    const div = $('#wheelHistory'); div.innerHTML = '';
    wheelHistory.forEach(v=>{ const el = document.createElement('div'); el.className = 'memory-item'; el.innerHTML = `<span>${v}</span>`; div.appendChild(el); });
  }
  function spinWheel(){
    if(isSpinningWheel) return;
    $('#wheelResult').style.display = 'none'; beep(820,60); vibrate(35);
    isSpinningWheel = true; accelerateNow = false; wheelVel = 12 + Math.random()*7; wheelFriction = 0.985;
    const step = ()=>{
      wheelAngle = (wheelAngle + wheelVel * (1/60)) % (Math.PI*2);
      wheelVel *= accelerateNow ? 0.90 : wheelFriction;
      if (accelerateNow && wheelVel > 2.2) wheelVel = 2.2;
      drawWheel();
      if (wheelVel < 0.12) {
        isSpinningWheel = false; cancelAnimationFrame(rafId); rafId = null;
        const idx = wheelIndexAtPointer(); const name = String(wheelSectors[idx]);
        const res = $('#wheelResult'); res.textContent = `Result: ${name}`; res.style.display = 'flex';
        stats.wheel.total++; stats.wheel.results[name] = (stats.wheel.results[name]||0)+1; pushWheelHistory(name); updateWheelStatsUI(); thud(); vibrate(85);
        return;
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
  }
  function accelerateWheel(){ if(!isSpinningWheel) return; accelerateNow = true; }
  function bindWheel(){
    $('#wheelSections').addEventListener('input', updateWheelSectionsFromCount);
    $('#wheelPreset').addEventListener('change', e=>applyWheelPreset(e.target.value));
    $('#spinBtn').addEventListener('click', spinWheel);
    $('#btnFsWheel').addEventListener('click', ()=>{ show($('#overlayWheel')); drawWheel(); });
  }

  // -------------------- INIT --------------------
  function init(){
    bindNav();
    bindNumbers();
    bindDice();
    bindCards();
    bindCoin();
    bindRoulette();
    bindWheel();

    // Kortit: luo pakka ja nollaa mittarit
    resetDeck();
    updateNumberStats(); updateDiceStats(); updateRouletteStats();
  }
  document.addEventListener('DOMContentLoaded', init, { once:true });
})();
