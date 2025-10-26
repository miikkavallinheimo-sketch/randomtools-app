/* wheel-standalone.js */
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
  const stats = { total:0, results:{} };
  let sectors=['Option 1','Option 2','Option 3','Option 4','Option 5','Option 6'], history=[];
  let canvas, ctx, canvasFs, ctxFs;
  let spinning=false, angle=0, vel=0, friction=0.985, accelNow=false, rafId=null;

  function ensureInit(){
    // Älä pysäytä käynnissä olevaa animaatiota initissä
    if(!canvas){ 
      canvas=$('#wheelCanvas'); 
      if(canvas) ctx=canvas.getContext('2d'); 
    }
    if(!canvasFs){ 
      canvasFs=$('#wheelCanvasFs'); 
      if(canvasFs) ctxFs=canvasFs.getContext('2d'); 
    }
    updateCount(); draw();
  }

  function updateCount(e){
    const valRaw = $('#wheelSections').value;
    if(valRaw === '') { draw(); return; }
    let num = parseInt(valRaw, 10);
    if(!Number.isFinite(num)) { return; }
    if(e && e.type === 'input' && num < 2){ draw(); return; }
    num = Math.max(2, Math.min(20, num));
    $('#wheelSections').value = num;
    if(sectors.length < num){ for(let i=sectors.length;i<num;i++) sectors.push(`Option ${i+1}`); }
    else if(sectors.length > num){ sectors = sectors.slice(0,num); }
    buildInputs(); draw();
  }

  function finalizeCount(){
    let num = parseInt($('#wheelSections').value, 10);
    if(!Number.isFinite(num)) num = 6;
    num = Math.max(2, Math.min(20, num));
    $('#wheelSections').value = num;
    if(sectors.length < num){ for(let i=sectors.length;i<num;i++) sectors.push(`Option ${i+1}`); }
    else if(sectors.length > num){ sectors = sectors.slice(0,num); }
    buildInputs(); draw();
  }

  function buildInputs(){
    const wrap=$('#wheelInputs'); wrap.innerHTML='';
    sectors.forEach((name,i)=>{
      const row=document.createElement('div'); row.className='memory-item'; row.style.gap='12px';
      row.innerHTML=`<span style="opacity:.8">#${i+1}</span>
      <input type="text" value="${String(name).replace(/"/g,'&quot;')}" data-idx="${i}"
        style="flex:1;min-width:0;padding:10px 12px;border-radius:8px;border:1px solid var(--light-gray);background:#1f1f1f;color:var(--cream);">`;
      wrap.appendChild(row);
    });
    wrap.querySelectorAll('input[type="text"]').forEach(inp=>{
      inp.addEventListener('input',e=>{ const idx=+e.target.dataset.idx; sectors[idx]=e.target.value.trim()||`Option ${idx+1}`; draw(); });
    });
  }

  function applyPreset(val){
    const map={
      yesno:['Yes','No'],
      directions:['North','South','East','West'],
      colors:['Orange','Gold','Mint','Black','Gray','Cream'].slice(0, Math.max(2, Math.min(6, +$('#wheelSections').value||6))),
      numbers:[1,2,3,4,5,6].map(String),
      pizza:['Margherita','Pepperoni','Veggie','BBQ','Hawaiian','Four Cheese'],
      movies:['Action','Drama','Comedy','Sci-Fi','Thriller','Documentary']
    };
    if(!val){ buildInputs(); draw(); return; }
    const arr=map[val]||[]; if(!arr.length) return;
    const count=Math.max(2,Math.min(20,arr.length));
    $('#wheelSections').value=count; sectors=arr.slice(0,count); buildInputs(); draw();
  }

  function css(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000'; }

  function contrast(hex){
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||'');
    if(!m) return '#fff';
    const r=parseInt(m[1],16), g=parseInt(m[2],16), b=parseInt(m[3],16);
    const yiq=(r*299+g*587+b*114)/1000; return yiq>=140 ? '#000' : '#fff';
  }

  function draw(){
    if(ctx) drawTo(canvas,ctx);
    if($('#overlayWheel').style.display==='flex' && ctxFs){
      drawTo(canvasFs,ctxFs);
    }
  }

  function drawTo(cv, c){
    const w=cv?.width, h=cv?.height; if(!w||!h){ return; }
    const cx=w/2, cy=h/2;
    c.clearRect(0,0,w,h);
    const r=Math.min(w,h)/2 - 10, n=sectors.length, a=(Math.PI*2)/n;

    c.save(); c.translate(cx,cy); c.beginPath(); c.arc(0,0,r+6,0,Math.PI*2); c.fillStyle='#0e0e0e'; c.fill(); c.restore();

    // 10-väripaletti (järjestetty korkean kontrastin vierekkäin)
    const fills=['#FFD449','#084B83','#FF7B9C','#3A5743','#E36414','#372772','#7FB285','#9A031E','#05A8AA','#6320EE'];
    for(let i=0;i<n;i++){
      const start=angle + i*a - Math.PI/2, end=start + a;
      // sektori
      c.beginPath(); c.moveTo(cx,cy); c.arc(cx,cy,r,start,end,false); c.closePath();
      const segColor=fills[i%fills.length];
      c.fillStyle=segColor; c.fill(); c.strokeStyle=css('--dark-gray'); c.lineWidth=2; c.stroke();

      // Teksti: säteen suuntaan sisältä ulos
      const mid=(start+end)/2;
      c.save();
      c.translate(cx,cy);
      c.rotate(mid);
      c.textAlign='left'; c.textBaseline='middle'; c.fillStyle=contrast(segColor);
      const fontBase = r*0.095;
      const scaleByCount = n>=16 ? 0.75 : n>=12 ? 0.85 : 1.0;
      const fontPx=Math.max(10, Math.min(22, fontBase*scaleByCount)); c.font=`700 ${fontPx}px Inter, system-ui, sans-serif`;
      const label=String(sectors[i]); const maxW=r*0.95; let t=label;
      while (c.measureText(t).width>maxW && t.length>3){ t=t.slice(0,t.length-2)+'…'; }
      // piirrä lähempänä ulkokehää
      c.fillText(t, r*0.35, 0);
      c.restore();
    }
    // keskipiste
    c.beginPath(); c.arc(cx,cy, Math.max(10, r*0.08), 0, Math.PI*2); c.fillStyle=css('--gold'); c.fill();
    c.beginPath(); c.arc(cx,cy, Math.max(7, r*0.055), 0, Math.PI*2); c.fillStyle='#000'; c.fill();
  }

  function indexAtPointer(){
    const n=sectors.length, a=(Math.PI*2)/n;
    // Pointer on oikealla: 90° = +PI/2 offset
    let t=(Math.PI/2 - angle)%(Math.PI*2); if(t<0) t+=Math.PI*2;
    return Math.floor(t/a)%n;
  }

  function spin(){
    if(spinning) return;
    if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
    $('#wheelResult').textContent='';
    const fsOpen = $('#overlayWheel').style.display==='flex';
    const resFs = $('#wheelResultFs'); if(resFs){ resFs.textContent=''; }
    beep(820,60); vibrate(35);
    // Laajennettu hajonta: pienempi minimi ja suurempi maksimi alkunopeudelle
    // sekä lievä satunnaisuus peruskitkaan, jotta kierrosten määrä vaihtelee enemmän
    const minVel = 14;      // aiemmin 20
    const maxVel = 36;      // aiemmin 28
    spinning=true; accelNow=false; vel = minVel + Math.random() * (maxVel - minVel);
    let baseFriction = 0.990 + Math.random()*0.004; // ~0.990–0.994
    let frame=0;
    const step=()=>{
      frame++;
      // kitkan dynamiikka: aluksi vähän kitkaa, lopussa paljon -> hitaampi pysähdys
      let f = baseFriction;
      if(vel<4.0) f = 0.985;  // alkaa jarruttaa
      if(vel<2.0) f = 0.980;  // enemmän jarrutusta
      if(vel<1.0) f = 0.970;  // vielä enemmän
      if(vel<0.5) f = 0.960;  // hidas pysähdys
      if(accelNow){ f = 0.94; if(vel>2.2) vel=2.2; }

      angle=(angle + vel*(1/60))%(Math.PI*2);
      vel*= f;
      draw();
      if(vel<0.15){
        spinning=false; cancelAnimationFrame(rafId); rafId=null;
        const idx=indexAtPointer(); const name=String(sectors[idx]);
        const res=$('#wheelResult'); res.textContent=`Result: ${name}`;
        const resFs2=$('#wheelResultFs'); if(resFs2 && $('#overlayWheel').style.display==='flex'){ resFs2.textContent=`Result: ${name}`; }
        stats.total++; stats.results[name]=(stats.results[name]||0)+1; 
        history.unshift({result:name,timestamp:new Date().toLocaleTimeString('en-GB')});
        if(history.length>12) history.pop();
        updateStats(); updateHistory(); thud(); vibrate(85);
        return;
      }
      rafId=requestAnimationFrame(step);
    };
    rafId=requestAnimationFrame(step);
  }


  function updateStats(){
    $('#totalWheelSpins').textContent = stats.total;
    const mostCommon = Object.keys(stats.results).reduce((a,b) => stats.results[a] > stats.results[b] ? a : b, '-');
    $('#mostCommon').textContent = mostCommon;
    $('#uniqueResults').textContent = Object.keys(stats.results).length;
    $('#lastResult').textContent = history[0]?.result || '-';
  }

  function updateHistory(){
    const div=$('#wheelHistory'); div.innerHTML='';
    history.forEach(e=>{
      const item=document.createElement('div'); item.className='memory-item';
      item.innerHTML=`<span>${e.result} (${e.timestamp})</span>`;
      div.appendChild(item);
    });
  }

  function accelerate(){ if(!spinning) return; accelNow=true; }

  function primaryAction(){
    if(!spinning) spin();
    else accelerate();
  }

  function isEditableFocused(){
    const ae=document.activeElement;
    return ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', ()=>{
    ensureInit();

    $('#wheelSections').addEventListener('input', updateCount);
    $('#wheelSections').addEventListener('blur', finalizeCount);
    
    $('#wheelPreset').addEventListener('change', e => applyPreset(e.target.value));
    
    $('#spinBtn').addEventListener('click', () => { spin(); });
    
    // Fullscreen spin button
    const spinBtnFs = $('#spinBtnFs');
    if(spinBtnFs) spinBtnFs.addEventListener('click', spin);
    
    $('#btnFsWheel').addEventListener('click', () => {
      show($('#overlayWheel'));
      // Varmista FS-canvas ilman animaation pysäyttämistä
      ensureInit();
    });

    // Overlay close
    document.addEventListener('click', e=>{
      const closeSel=e.target.getAttribute?.('data-close'); 
      if(closeSel){ const ov=$(closeSel); if(ov) hide(ov); }
    });

    // Overlay click to spin - ei automaattista pysäytystä
    const fsOverlay = $('#overlayWheel');
    if(fsOverlay){
      fsOverlay.addEventListener('click', (e)=>{
        // Tarkista että klikataan rullan aluetta eikä nappeja
        const canvas = e.target.closest('canvas');
        const isButton = e.target.closest('button');
        if(canvas && !isButton){
          e.stopPropagation();
          if(!spinning) spin(); // Vain käynnistä, ei pysäytä
        }
      });
      // Estä FS-overlayn avaaminen kesken pyörimisen, jos juuri klikataan FS-nappia
      $('#btnFsWheel').addEventListener('click', (e)=>{
        if(spinning){ e.preventDefault(); return; }
      }, { capture:true });
    }

    // Tap to start - ei automaattista pysäytystä
    $('#wheelCanvas').addEventListener('click', (e) => {
      e.stopPropagation();
      if(!spinning) spin(); // Vain käynnistä, ei pysäytä
    });
    
    // Fullscreen canvas click - ei automaattista pysäytystä
    const fsCanvas = $('#wheelCanvasFs');
    if(fsCanvas) fsCanvas.addEventListener('click', (e) => {
      e.stopPropagation();
      if(!spinning) spin(); // Vain käynnistä, ei pysäytä
    });

    // Space key
    document.addEventListener('keydown', e=>{
      if(e.code==='Space' && !isEditableFocused()){ 
        e.preventDefault(); 
        primaryAction(); 
      }
      if(e.code==='Escape'){
        const overlay = $('#overlayWheel');
        if(overlay && overlay.style.display==='flex') hide(overlay);
      }
    });

    updateStats();
    updateHistory();
  });
})();
