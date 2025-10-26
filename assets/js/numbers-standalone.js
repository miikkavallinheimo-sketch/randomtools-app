/* numbers-standalone.js */
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
  const stats = { total:0, sum:0, saved:0 };
  let memory=[], lastRandomNumber=null, running=false, accel=false;

  function setResult(el,val){ el.textContent=val; el.style.animation='none'; void el.offsetWidth; el.style.animation='pop-in .45s ease'; }

  async function spinTo(el, final){
    return new Promise(resolve=>{
      running=true; accel=false; let t=0;
      const min=parseInt($('#minNumber').value), max=parseInt($('#maxNumber').value);
      const steps=Math.max(12,18);
      const h=setInterval(()=>{
        el.textContent=Math.floor(Math.random()*(max-min+1))+min;
        if(Math.random()<0.15) tick();
        if(accel || ++t>=steps){ clearInterval(h); setResult(el, final); running=false; resolve(); }
      },35);
    });
  }

  function updateStats(){
    $('#totalGenerated').textContent = stats.total;
    $('#averageNumber').textContent = stats.total? (stats.sum/stats.total).toFixed(1):'-';
    $('#savedCount').textContent = stats.saved;
  }

  function updateMemory(){
    const list=$('#memoryList'); list.innerHTML='';
    memory.forEach((item,idx)=>{
      const el=document.createElement('div');
      el.className='memory-item';
      el.innerHTML=`<span>${item.value} (${item.timestamp})</span><button class="delete-btn" data-idx="${idx}">Delete</button>`;
      el.querySelector('button').addEventListener('click',()=>{
        memory.splice(idx,1); stats.saved=Math.max(0,stats.saved-1); updateMemory(); updateStats();
      });
      list.appendChild(el);
    });
  }

  function exportNumbers(numbers, format) {
    let content = '';
    switch (format) {
      case 'txt':
        content = numbers.join('\n');
        break;
      case 'json':
        content = JSON.stringify(numbers);
        break;
      case 'csv':
        content = numbers.join(',');
        break;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `numbers.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function primaryAction(){
    if(!running) $('#btnGenerate').click();
    else accel = true;
  }

  function isEditableFocused(){
    const ae=document.activeElement;
    return ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', ()=>{
  $('#btnGenerate').addEventListener('click',async()=>{
    const min = parseInt($('#minNumber').value), max = parseInt($('#maxNumber').value);
    const count = 1; // Yksittäinen luku
    const format = 'none'; // Ei exporttia
      
      if(!Number.isFinite(min)||!Number.isFinite(max)||min>=max){ 
        alert('Maximum must be greater than minimum.'); 
        return;
      }
      
      const main=$('#numberResult'); main.style.display='flex';
      const numbers = [];
      
      beep(700,60); vibrate(25);
      const fsOpen = $('#overlayNumber').style.display==='flex';
      
      for(let i = 0; i < count; i++){
        const n = Math.floor(Math.random()*(max-min+1))+min;
        numbers.push(n);
        const tasks=[spinTo(main,n)];
        if(fsOpen){ const fsEl=$('#overlayNumberInner'); tasks.push(spinTo(fsEl,n)); }
        await Promise.all(tasks);
      }
      
      lastRandomNumber = count === 1 ? numbers[0] : numbers;
      stats.total += count;
      stats.sum += numbers.reduce((a,b) => a+b, 0);
      updateStats();
      thud();
      vibrate(40);
      $('#saveBtn').style.display='inline-block';
      
      if(count > 1){
        exportNumbers(numbers, format);
      }
    });

    // Batch generation
    $('#btnBatchGenerate').addEventListener('click',async()=>{
      const min = parseInt($('#minNumber').value), max = parseInt($('#maxNumber').value);
      const count = parseInt($('#batchCount').value) || 10;
      const format = $('#exportFormat').value;
      
      if(!Number.isFinite(min)||!Number.isFinite(max)||min>=max){ 
        alert('Maximum must be greater than minimum.'); 
        return;
      }
      
      if(count < 1 || count > 10000){
        alert('Count must be between 1 and 10000.'); 
        return;
      }
      
      // Yksi animaatio, muut taustalla
      const main=$('#numberResult'); main.style.display='flex';
      const numbers = [];
      
      beep(700,60); vibrate(25);
      
      // Näytä ensimmäinen luku animaatiolla
      const firstNumber = Math.floor(Math.random()*(max-min+1))+min;
      numbers.push(firstNumber);
      await spinTo(main, firstNumber);
      
      // Generoi loput taustalla
      for(let i = 1; i < count; i++){
        numbers.push(Math.floor(Math.random()*(max-min+1))+min);
      }
      
      // Päivitä UI
      main.textContent = `Generated ${count} numbers`;
      
      // Päivitä tilastot
      stats.total += count;
      stats.sum += numbers.reduce((a,b) => a+b, 0);
      updateStats();
      thud(); vibrate(40);
      
      // Exporttaa tiedosto
      exportNumbers(numbers, format);
    });

    $('#saveBtn').addEventListener('click',()=>{
      if(lastRandomNumber!==null){ 
        const value = Array.isArray(lastRandomNumber) ? lastRandomNumber.join(', ') : lastRandomNumber;
        memory.push({value, timestamp:new Date().toLocaleTimeString('en-GB')}); 
        stats.saved++; 
        updateMemory(); 
        updateStats(); 
        beep(500,50); 
        vibrate(20); 
      }
    });

    $('#clearMemoryBtn').addEventListener('click',()=>{ 
      memory=[]; 
      stats.saved=0; 
      updateMemory(); 
      updateStats(); 
      beep(320,60,'square'); 
      vibrate(20); 
    });

    $('#btnFsNumber').addEventListener('click',()=>{ 
      $('#overlayNumberInner').textContent= lastRandomNumber ?? '—'; 
      show($('#overlayNumber')); 
    });

    // Overlay close
    document.addEventListener('click', e=>{
      const closeSel=e.target.getAttribute?.('data-close'); 
      if(closeSel){ const ov=$(closeSel); if(ov) hide(ov); }
    });

    // Overlay click to generate
    const fsOverlay = $('#overlayNumber');
    if(fsOverlay){
      fsOverlay.addEventListener('click', (e)=>{
        // Reagoi klikkaamalla overlay-taustaa TAI numeroa
        const isOverlayBg = e.target && e.target.classList.contains('overlay');
        const isNumber = e.target && (e.target.id === 'overlayNumberInner' || e.target.classList.contains('fullscreen-number'));
        if(isOverlayBg || isNumber){
          e.stopPropagation();
          primaryAction();
        }
      });
    }

    // Tap to start
    const resEl = $('#numberResult');
    if(resEl){ 
      resEl.addEventListener('click', ()=>{ 
        primaryAction(); 
      }); 
    }

    // Space key
    document.addEventListener('keydown', e=>{
      if(e.code==='Space' && !isEditableFocused()){ 
        e.preventDefault(); 
        primaryAction(); 
      }
      if(e.code==='Escape'){
        const overlay = $('#overlayNumber');
        if(overlay && overlay.style.display==='flex') hide(overlay);
      }
    });

    updateStats(); 
    updateMemory();
  });
})();
