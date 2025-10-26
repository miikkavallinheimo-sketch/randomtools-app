/* coin-standalone.js */
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
  const thud = ()=>beep(120,120,'sine',0.06);
  const vibrate = (ms=30)=>{ if(navigator.vibrate) try{ navigator.vibrate(ms); }catch(e){} };

  // Stats
  const stats = { total:0, heads:0, tails:0 };
  let history=[], running=false, timer=null, doneRef=null;

  function updateStats(){
    $('#totalFlips').textContent=stats.total;
    $('#headsCount').textContent=stats.heads;
    $('#tailsCount').textContent=stats.tails;
    $('#headsPercentage').textContent = stats.total? ((stats.heads/stats.total)*100).toFixed(1)+'%' : '50.0%';
  }

  function updateHistory(){
    const div=$('#flipHistory'); div.innerHTML='';
    history.forEach(e=>{
      const item=document.createElement('div'); item.className='memory-item';
      const emoji = e.result==='Heads' ? '👑' : '⚔️';
      item.innerHTML=`<span>${emoji} ${e.result} (${e.timestamp})</span>`;
      div.appendChild(item);
    });
  }

  const spinMarkup = () => `
    <div class="coin-display">
      <div class="coin-3d">
        <div class="face front">
          <img src="/crown-2.svg" alt="Heads" width="72" height="72" loading="eager" decoding="async" />
          <div class="coin-label">HEADS</div>
        </div>
        <div class="face back">
          <img src="/sword-03.svg" alt="Tails" width="72" height="72" loading="eager" decoding="async" />
          <div class="coin-label tails">TAILS</div>
        </div>
      </div>
    </div>`;

  function animateToResult(coin3dEl, isHeads, durationMs, onEnd){
    const start = performance.now();
    const extraTurns = 6 + Math.floor(Math.random()*2);
    const targetDeg = extraTurns*360 + (isHeads ? 0 : 180);
    const easeOutCubic = (t)=> 1 - Math.pow(1 - t, 3);
    let rafId;

    const tick = (now)=>{
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const angle = eased * targetDeg;
      coin3dEl.style.transform = `rotateY(${angle}deg)`;
      if(t < 1){ rafId = requestAnimationFrame(tick); } else { onEnd?.(); }
    };

    rafId = requestAnimationFrame(tick);

    // Return function to accelerate to final result
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        // Siirry suoraan lopputulokseen
        coin3dEl.style.transform = `rotateY(${targetDeg}deg)`;
        onEnd?.();
      }
    };
  }

  function flip(){
    if(running) return;
    
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const isHeads = result === 'Heads';
    
    running = true;
    beep(700, 60);
    vibrate(25);

    const targets = [$('#coinDisplay')];
    const fsOverlay = $('#overlayCoin');
    if(fsOverlay && fsOverlay.style.display === 'flex'){
      targets.push($('#overlayCoinInner'));
    }

    targets.forEach(target => {
      if(!target) return;
      target.innerHTML = spinMarkup();
      const coin3d = target.querySelector('.coin-3d');
      if(!coin3d) return;

      doneRef = animateToResult(coin3d, isHeads, 2000, () => {
        running = false;
        $('#coinResult').textContent = result;
        
        stats.total++;
        if(result === 'Heads') stats.heads++;
        else stats.tails++;
        
        history.unshift({result, timestamp: new Date().toLocaleTimeString('en-GB')});
        if(history.length > 10) history.pop();
        
        updateStats();
        updateHistory();
        thud();
        vibrate(40);
      });
    });
  }

  function accelerate(){
    if(doneRef){
      stopCurrentAnimation();
      running = false;
    }
  }

  function primaryAction(){
    if(!running) flip();
    else accelerate();
  }

  function stopCurrentAnimation(){
    if(doneRef){
      doneRef();
      doneRef = null;
    }
  }

  function isEditableFocused(){
    const ae=document.activeElement;
    return ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', ()=>{
    $('#coinDisplay').innerHTML = spinMarkup();

    $('#btnFlipCoin').addEventListener('click', flip);
    
    $('#btnFsCoin').addEventListener('click', () => {
      $('#overlayCoinInner').innerHTML = spinMarkup();
      show($('#overlayCoin'));
    });

    // Overlay close
    document.addEventListener('click', e=>{
      const closeSel=e.target.getAttribute?.('data-close'); 
      if(closeSel){ const ov=$(closeSel); if(ov) hide(ov); }
    });

    // Fullscreen coin click - klikkaaminen kolikon päältä toimii
    const fsOverlay = $('#overlayCoin');
    if(fsOverlay){
      fsOverlay.addEventListener('click', (e) => {
        // Tarkista että klikataan kolikkoa eikä taustaa
        const coinDisplay = e.target.closest('.coin-display, .coin-3d, .face, .coin-label');
        if(coinDisplay) {
          e.stopPropagation();
          primaryAction();
        }
      });
    }

    // Tap to start
    $('#coinDisplay').addEventListener('click', primaryAction);

    // Space key
    document.addEventListener('keydown', e=>{
      if(e.code==='Space' && !isEditableFocused()){ 
        e.preventDefault(); 
        primaryAction(); 
      }
      if(e.code==='Escape'){
        const overlay = $('#overlayCoin');
        if(overlay && overlay.style.display==='flex') hide(overlay);
      }
    });

    updateStats();
    updateHistory();
  });
})();
