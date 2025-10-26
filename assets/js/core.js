/* core.js v10 — shared helpers, nav, audio/haptics, primary action router + URL routing */
(function(){
  const $ = (sel,root=document)=>root.querySelector(sel);
  const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const show = el => { if(el) el.style.display='flex'; };
  const hide = el => { if(el) el.style.display='none'; };
  const isEditableFocused = () => {
    const ae=document.activeElement;
    return ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable);
  };

  // URL routing maps
  const urlToPage = {
    '/': 'home',
    '/random-number-generator/': 'numbers',
    '/dice-roller/': 'dice', 
    '/coin-flip/': 'coin',
    '/decision-wheel/': 'wheel'
  };
  const pageToUrl = Object.fromEntries(Object.entries(urlToPage).map(([url,page])=>[page,url]));

  // Page metadata for SEO
  const pageMeta = {
    home: {
      title: 'RandomTools.app - Free Random Tools for Gaming & Decisions',
      desc: 'Free random tools for gaming and decisions. Roll dice, generate numbers, flip coins, and spin decision wheels. Perfect for D&D, casino practice, and daily choices.'
    },
    numbers: {
      title: 'Random Number Generator | Free Online Tool | RandomTools.app',
      desc: 'Generate random numbers from any range. Free online random number generator with statistics and memory. Perfect for games, raffles, and random selections.'
    },
    dice: {
      title: 'Dice Roller | 1-5 Dice with Animation | RandomTools.app', 
      desc: 'Roll 1-5 dice online with 3D animation. Lock dice, track statistics. Perfect for D&D, board games, and tabletop RPGs.'
    },
    coin: {
      title: 'Coin Flip | Heads or Tails Decision Maker | RandomTools.app',
      desc: 'Classic heads or tails coin flip. Make decisions, settle disputes, or leave it to chance. Free online coin flipper with statistics.'
    },
    wheel: {
      title: 'Decision Wheel | Custom Wheel Spinner | RandomTools.app', 
      desc: 'Create custom decision wheels with up to 20 options. Spin to decide what to eat, watch, or do. Perfect for group decisions and random choices.'
    }
  };

  // audio & haptics
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

  // global stats shared by modules
  const stats = {
    numbers:{ total:0, sum:0, saved:0 },
    dice:{ total:0, sum:0, highest:0 },
    cards:{ total:0, red:0, black:0, jokers:0 },
    coin:{ total:0, heads:0, tails:0 },
    roulette:{ total:0, red:0, black:0, zero:0 },
    wheel:{ total:0, results:{} }
  };

  // Update page metadata
  function updateMeta(pageId){
    const meta = pageMeta[pageId];
    if(!meta) return;
    
    // Update title
    document.title = meta.title;
    
    // Update description
    let desc = $('meta[name="description"]');
    if(desc) desc.content = meta.desc;
    
    // Update/create canonical URL
    let canonical = $('link[rel="canonical"]');
    if(!canonical){
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://randomtools.app' + (pageToUrl[pageId] || '/');
  }

  // App registry
  const App = {
    util:{ $, $$, show, hide, isEditableFocused },
    audio:{ beep, tick, thud, vibrate },
    stats,
    modules:{},
    register(name, api){ this.modules[name]=api; },
    routePrimary(){
      // overlays first (click toggles)
      const order=['cards','numbers','dice','coin','roulette','wheel'];
      for(const k of order){
        const m=this.modules[k]; if(!m) continue;
        if(m.isOverlayOpen && m.isOverlayOpen()){ if(m.isRunning && m.isRunning()) m.accelerate?.(); else m.primaryAction?.(); return; }
      }
      // then active page
      const page=document.querySelector('.page.active')?.id;
      const m=this.modules[page]; if(m){ if(m.isRunning && m.isRunning()) m.accelerate?.(); else m.primaryAction?.(); }
    }
  };
  window.App = App;

  // SPA nav with URL updates
  function showPage(pageId, updateUrl=true){
    $$('.page').forEach(p=>p.classList.remove('active'));
    const target = $('#'+pageId); if(target) target.classList.add('active');
    $$('.nav-item').forEach(a=>a.classList.toggle('active', a.dataset.page===pageId));
    
    // Update URL if needed
    if(updateUrl){
      const newUrl = pageToUrl[pageId] || '/';
      if(window.location.pathname !== newUrl){
        window.history.pushState({page:pageId}, '', newUrl);
      }
    }
    
    // Update page metadata
    updateMeta(pageId);
    
    // notify module
    const m=App.modules[pageId]; if(m && m.onShow) m.onShow();
  }

  // Handle URL changes (back/forward buttons)
  function handleUrlChange(){
    const path = window.location.pathname;
    const pageId = urlToPage[path] || 'home';
    const currentPage = $('.page.active')?.id;
    
    if(pageId !== currentPage){
      showPage(pageId, false); // Don't update URL since we're responding to URL change
    }
  }

  function bindNav(){
    $('#navMenu').addEventListener('click', e=>{
      const a=e.target.closest('a.nav-item'); if(!a) return; e.preventDefault();
      showPage(a.dataset.page);
    });
    $$('.game-card').forEach(c=>c.addEventListener('click',()=>showPage(c.dataset.jump)));
    
    // Handle browser back/forward
    window.addEventListener('popstate', handleUrlChange);
    
    // Handle initial page load based on URL
    handleUrlChange();
  }

  // overlay generic close + overlay click => primary
  function bindOverlayDelegates(){
    document.addEventListener('click', e=>{
      const closeSel=e.target.getAttribute?.('data-close'); if(closeSel){ const ov=$(closeSel); if(ov) hide(ov); }
    });
    $$('.overlay.clickable').forEach(ov=>{
      ov.addEventListener('click',(e)=>{ if(e.target.closest('.controls')) return; App.routePrimary(); });
    });
  }

  // global SPACE
  function bindSpace(){
    document.addEventListener('keydown', e=>{
      if(e.code==='Space' && !App.util.isEditableFocused()){ e.preventDefault(); App.routePrimary(); }
      // ESC to close overlays
      if(e.code==='Escape'){
        $$('.overlay').forEach(ov=>{ if(ov.style.display==='flex') hide(ov); });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    bindNav(); bindOverlayDelegates(); bindSpace();
    // init modules
    for(const name in App.modules){ try{ App.modules[name].init?.(App); }catch(e){ console.error(name,e); } }
    // URL-based page detection already handled in bindNav() -> handleUrlChange()
  }, {once:true});
})();