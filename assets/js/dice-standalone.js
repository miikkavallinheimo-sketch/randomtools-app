/* dice-standalone.js */
(function(){
  // Utility functions
  const $ = (sel) => document.querySelector(sel);
  const show = el => { if(el) el.style.display='flex'; };
  const hide = el => { if(el) el.style.display='none'; };

  // Audio & haptics
  let audioCtx;
  function getCtx(){ if(!audioCtx){ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); } return audioCtx; }
  function beep(freq=600,dur=70,type='sine',gain=0.04){ try{
    const ctx=getCtx(),o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(ctx.destination);
    o.start(); setTimeout(()=>o.stop(),dur);
  }catch(e){} }
  const tick = ()=>beep(900,40,'square',0.03);
  const thud = ()=>beep(120,120,'sine',0.06);
  const vibrate = (ms=30)=>{ if(navigator.vibrate) try{ navigator.vibrate(ms); }catch(e){} };

  // Stats
  const stats = { total:0, sum:0, highest:0 };
  let running=false, timers=[], finals=null;
  let locked = [];
  let selectedDiceCount = 1;

  const faces = [
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;padding:3px"><div style="grid-area:2/2;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div></div>',
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;padding:3px"><div style="grid-area:1/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:3/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div></div>',
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;padding:3px"><div style="grid-area:1/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:2/2;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:3/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div></div>',
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;padding:3px"><div style="grid-area:1/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:1/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:3/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:3/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div></div>',
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;padding:3px"><div style="grid-area:1/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:1/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:2/2;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:3/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:3/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div></div>',
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;padding:3px"><div style="grid-area:1/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:2/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:3/1;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:1/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:2/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div><div style="grid-area:3/3;justify-self:center;align-self:center;width:12px;height:12px;background:#fff;border-radius:50%"></div></div>'
  ];

  function updateStats(){
    $('#totalRolls').textContent = stats.total;
    $('#averageRoll').textContent = stats.total ? (stats.sum/stats.total).toFixed(1) : '-';
    $('#highestRoll').textContent = stats.highest || '-';
    
    // Fullscreen stats
    const totalRollsFs = $('#totalRollsFs');
    if(totalRollsFs) totalRollsFs.textContent = stats.total;
    
    const averageRollFs = $('#averageRollFs');
    if(averageRollFs) averageRollFs.textContent = stats.total ? (stats.sum/stats.total).toFixed(1) : '-';
    
    const highestRollFs = $('#highestRollFs');
    if(highestRollFs) highestRollFs.textContent = stats.highest || '-';
  }

  function clampCount(n){
    n = Number(n)||1;
    return Math.max(1, Math.min(5, n));
  }

  function ensureArrays(len){
    if (locked.length !== len){
      const prev = locked.slice();
      locked = new Array(len).fill(false);
      for(let i=0;i<Math.min(prev.length,len);i++) locked[i]=prev[i]===true;
    }
    if (finals && finals.length !== len){
      finals = finals.slice(0, len);
      while (finals.length < len) finals.push(1);
    }
  }

  function computeNewFinals(len){
    ensureArrays(len);
    const base = finals && finals.length===len ? finals : new Array(len).fill(1);
    const out = new Array(len);
    for(let i=0;i<len;i++){
      if (locked[i] && Number.isInteger(base[i])) {
        out[i] = base[i];
      } else {
        out[i] = (Math.floor(Math.random()*6)+1);
      }
    }
    return out;
  }

  function containers(){
    const list = [];
    const d1 = $('#diceDisplay'); if (d1) list.push(d1);
    const fs = $('#fullscreenOverlay');
    if (fs && fs.style.display === "flex"){
      const inner = $('#fullscreenDiceInner'); if (inner) list.push(inner);
    }
    return list;
  }

  function renderContainer(container, values){
    container.innerHTML = '';
    
    values.forEach((value, i) => {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.style.margin = '6px';
      span.style.cursor = 'pointer';
      span.innerHTML = faces[value-1];
      
      if (locked[i]) {
        span.classList.add('locked');
      }
      
      span.addEventListener('click', () => {
        locked[i] = !locked[i];
        span.classList.toggle('locked', locked[i]);
        beep(locked[i] ? 800 : 400, 50);
        vibrate(15);
      });
      
      container.appendChild(span);
    });
  }

  function renderAll(values){
    containers().forEach(c => renderContainer(c, values));
  }

  function checkDone(){
    if(timers.every(t => t === null)){
      running = false;
      
      // Poista rolling-luokka
      containers().forEach(container => {
        container.classList.remove('rolling');
      });
      
      if(finals){
        renderAll(finals);
        const sum = finals.reduce((a,b)=>a+b,0);
        const resultText = finals.length === 1 ? `${finals[0]}` : `${finals.join(' + ')} = ${sum}`;
        $('#diceResult').textContent = resultText;
        const diceResultFs = $('#diceResultFs');
        if(diceResultFs) diceResultFs.textContent = resultText;
        
        // Päivitä Sum-kortti
        $('#currentSum').textContent = sum;
        const currentSumFs = $('#currentSumFs');
        if(currentSumFs) currentSumFs.textContent = sum;
        
        stats.total++;
        stats.sum += sum;
        stats.highest = Math.max(stats.highest, sum);
        updateStats();
        
        thud();
        vibrate(40);
      }
    }
  }

  function animate(){
    if(!running || !finals) return;
    
    const lockedStates = locked.slice();
    
    containers().forEach(container => {
      const spans = Array.from(container.children);
      spans.forEach((span, i) => {
        if(lockedStates[i]){
          span.setAttribute('data-static', 'true');
          span.style.setProperty('opacity', '1', 'important');
          span.style.setProperty('transform', 'none', 'important');
          span.style.setProperty('filter', 'none', 'important');
          span.style.setProperty('transition', 'none', 'important');
          
          Object.defineProperty(span, 'innerHTML', {
            value: span.innerHTML,
            writable: false,
            configurable: true
          });
        }
      });
    });

    const interval = setInterval(() => {
      if(!running) {
        clearInterval(interval);
        return;
      }
      
      containers().forEach(container => {
        const spans = Array.from(container.children);
        spans.forEach((span, i) => {
          if(!span || span.hasAttribute('data-static')) return;
          
          const randomFace = Math.floor(Math.random() * 6);
          span.innerHTML = faces[randomFace];
          span.style.transform = `rotate(${Math.random()*20-10}deg) scale(${0.95+Math.random()*0.1})`;
          span.style.filter = `hue-rotate(${Math.random()*60}deg)`;
          
          if(Math.random() < 0.1) tick();
        });
      });
    }, 50);

    timers.forEach((timer, i) => {
      if(timer !== null || locked[i]) return;
      
      const delay = 300 + i * 100 + Math.random() * 200;
      timers[i] = setTimeout(() => {
        timers[i] = null;
        checkDone();
      }, delay);
    });
  }

  function roll(){
    if(running) return;
    
    finals = computeNewFinals(selectedDiceCount);
    timers = new Array(selectedDiceCount).fill(null);
    running = true;
    
    // Lisää rolling-luokka
    containers().forEach(container => {
      container.classList.add('rolling');
    });
    
    beep(700, 60);
    vibrate(25);
    
    animate();
  }

  function accelerate(){
    if(!running) return;
    timers.forEach((timer, i) => {
      if(timer !== null){
        clearTimeout(timer);
        timers[i] = null;
      }
    });
    checkDone();
  }

  function clear(){
    locked.fill(false);
    finals = new Array(selectedDiceCount).fill(1);
    renderAll(finals);
    $('#diceResult').textContent = '';
    
    // Nollaa tilastot
    stats.total = 0;
    stats.sum = 0;
    stats.highest = 0;
    
    // Nollaa Sum-kortti
    $('#currentSum').textContent = '-';
    const currentSumFs = $('#currentSumFs');
    if(currentSumFs) currentSumFs.textContent = '-';
    
    // Päivitä kaikki tilastot
    updateStats();
    
    beep(320, 60, 'square');
    vibrate(20);
  }

  function primaryAction(){
    if(!running) roll();
    else accelerate();
  }

  function isEditableFocused(){
    const ae=document.activeElement;
    return ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', ()=>{
    ensureArrays(selectedDiceCount);
    finals = new Array(selectedDiceCount).fill(1);
    renderAll(finals);

    // Dice count selection
    document.querySelectorAll('.dice-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.dice-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedDiceCount = clampCount(parseInt(pill.dataset.count));
        ensureArrays(selectedDiceCount);
        finals = computeNewFinals(selectedDiceCount);
        renderAll(finals);
        $('#diceResult').textContent = '';
      });
    });

    // Buttons
    $('#btnRollDice').addEventListener('click', roll);
    const btnRollDiceFs = $('#btnRollDiceFs');
    if(btnRollDiceFs) btnRollDiceFs.addEventListener('click', roll);
    
    $('#btnClearDice').addEventListener('click', clear);
    
    const btnClearDiceFs = $('#btnClearDiceFs');
    if(btnClearDiceFs) btnClearDiceFs.addEventListener('click', clear);
    
    $('#btnFsDice').addEventListener('click', () => {
      show($('#fullscreenOverlay'));
      const inner = $('#fullscreenDiceInner');
      if(inner && finals) renderContainer(inner, finals);
    });

    const btnExitFs = $('#btnExitFs');
    if(btnExitFs) btnExitFs.addEventListener('click', () => {
      hide($('#fullscreenOverlay'));
    });

    // Tap to start - poistettu, koska se häiritsee noppien lukitsemista

    // Space key
    document.addEventListener('keydown', e=>{
      if(e.code==='Space' && !isEditableFocused()){ 
        e.preventDefault(); 
        primaryAction(); 
      }
      if(e.code==='Escape'){
        const overlay = $('#fullscreenOverlay');
        if(overlay && overlay.style.display==='flex') hide(overlay);
      }
    });

    updateStats();
  });
})();
