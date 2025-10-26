/* dnd-dice.js - D&D Dice Roller with Advantage/Disadvantage */
(function(){
  // Utility functions
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
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
  const criticalSound = ()=>beep(1200,150,'sine',0.08);
  const failSound = ()=>beep(200,300,'sawtooth',0.06);
  const vibrate = (ms=30)=>{ if(navigator.vibrate) try{ navigator.vibrate(ms); }catch(e){} };

  // D&D Game State
  let gameState = {
    diceType: 'd20',
    diceCount: 1,
    rollType: 'normal', // normal, advantage, disadvantage
    modifier: 0,
    running: false,
    results: null,
    timers: []
  };

  // Statistics
  const stats = { 
    total: 0, 
    sum: 0, 
    highest: 0,
    criticalHits: 0,
    criticalFails: 0,
    advantageRolls: 0
  };

  // D&D Presets
  const presets = {
    attack: { type: 'd20', count: 1, rollType: 'normal', modifier: 0 },
    damage: { type: 'd8', count: 1, rollType: 'normal', modifier: 0 },
    fireball: { type: 'd6', count: 8, rollType: 'normal', modifier: 0 },
    healing: { type: 'd8', count: 1, rollType: 'normal', modifier: 0 },
    stats: { type: 'd6', count: 4, rollType: 'normal', modifier: 0 },
    initiative: { type: 'd20', count: 1, rollType: 'normal', modifier: 0 }
  };

  function getDiceMax(diceType) {
    return parseInt(diceType.substring(1));
  }

  function rollSingleDie(diceType) {
    const max = getDiceMax(diceType);
    return Math.floor(Math.random() * max) + 1;
  }

  function isCritical(value, diceType, isMax) {
    if (diceType !== 'd20') return false;
    return isMax ? value === 20 : value === 1;
  }

  function containers() {
    const list = [];
    const main = $('#diceDisplay');
    if (main) list.push(main);
    
    const fs = $('#fullscreenOverlay');
    if (fs && fs.style.display === 'flex') {
      const fsInner = $('#fullscreenDiceInner');
      if (fsInner) list.push(fsInner);
    }
    return list;
  }

  function renderDice(container, results) {
    container.innerHTML = '';
    
    if (!results || !results.rolls) {
      container.textContent = 'Press Space or click Roll Dice';
      return;
    }

    const { rolls, rollType, diceType, modifier, finalResult } = results;

    // Handle advantage/disadvantage display
    if (rollType !== 'normal' && diceType === 'd20' && rolls.length >= 2) {
      const [roll1, roll2] = rolls;
      const chosenRoll = rollType === 'advantage' ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
      
      // Create advantage/disadvantage display
      const advDiv = document.createElement('div');
      advDiv.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:15px;';
      
      const label = document.createElement('div');
      label.textContent = rollType.toUpperCase();
      label.style.cssText = 'font-size:0.6em;opacity:0.8;font-weight:700;';
      
      const diceRow = document.createElement('div');
      diceRow.style.cssText = 'display:flex;gap:15px;';
      
      // First die
      const die1 = createDieElement(roll1, diceType);
      if (chosenRoll !== roll1) die1.classList.add('faded');
      else die1.classList.add(rollType === 'advantage' ? 'advantage-shown' : 'disadvantage-shown');
      
      // Second die
      const die2 = createDieElement(roll2, diceType);
      if (chosenRoll !== roll2) die2.classList.add('faded');
      else die2.classList.add(rollType === 'advantage' ? 'advantage-shown' : 'disadvantage-shown');
      
      diceRow.appendChild(die1);
      diceRow.appendChild(die2);
      
      const resultDiv = document.createElement('div');
      resultDiv.style.cssText = 'font-size:0.7em;opacity:0.9;';
      resultDiv.textContent = `Chosen: ${chosenRoll}${modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : ''}`;
      
      advDiv.appendChild(label);
      advDiv.appendChild(diceRow);
      advDiv.appendChild(resultDiv);
      container.appendChild(advDiv);
    } else {
      // Normal dice display
      rolls.forEach((roll, index) => {
        const die = createDieElement(roll, diceType);
        container.appendChild(die);
      });
    }
  }

  function createDieElement(value, diceType) {
    const die = document.createElement('div');
    die.className = 'die';
    die.setAttribute('data-type', diceType);
    die.textContent = value;
    
    // Add critical styling for d20
    if (diceType === 'd20') {
      if (value === 20) die.classList.add('critical-success');
      if (value === 1) die.classList.add('critical-fail');
    }
    
    return die;
  }

  function calculateResults() {
    const { diceType, diceCount, rollType, modifier } = gameState;
    
    let rolls = [];
    let finalResult = 0;
    let hasCritical = false;
    let hasCriticalFail = false;

    // Handle advantage/disadvantage for single d20
    if (rollType !== 'normal' && diceType === 'd20' && diceCount === 1) {
      const roll1 = rollSingleDie(diceType);
      const roll2 = rollSingleDie(diceType);
      rolls = [roll1, roll2];
      
      const chosenRoll = rollType === 'advantage' ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
      finalResult = chosenRoll + modifier;
      
      hasCritical = chosenRoll === 20;
      hasCriticalFail = chosenRoll === 1;
      
      stats.advantageRolls++;
    } else {
      // Normal rolling
      for (let i = 0; i < diceCount; i++) {
        const roll = rollSingleDie(diceType);
        rolls.push(roll);
        finalResult += roll;
      }
      finalResult += modifier;
      
      // Check for criticals on d20
      if (diceType === 'd20') {
        hasCritical = rolls.includes(20);
        hasCriticalFail = rolls.includes(1);
      }
    }

    // Update statistics
    stats.total++;
    stats.sum += finalResult;
    stats.highest = Math.max(stats.highest, finalResult);
    if (hasCritical) stats.criticalHits++;
    if (hasCriticalFail) stats.criticalFails++;

    return {
      rolls,
      rollType,
      diceType,
      modifier,
      finalResult,
      hasCritical,
      hasCriticalFail
    };
  }

  function updateDisplay(results) {
    const { rolls, rollType, diceType, modifier, finalResult, hasCritical, hasCriticalFail } = results;
    
    // Update dice containers
    containers().forEach(container => {
      renderDice(container, results);
    });

    // Update result text
    let resultText = '';
    
    if (rollType !== 'normal' && diceType === 'd20' && rolls.length >= 2) {
      const chosenRoll = rollType === 'advantage' ? Math.max(rolls[0], rolls[1]) : Math.min(rolls[0], rolls[1]);
      resultText = `${rollType.toUpperCase()}: ${finalResult}`;
    } else {
      const diceFormula = `${gameState.diceCount}${diceType}${modifier !== 0 ? (modifier > 0 ? '+' + modifier : modifier) : ''}`;
      if (rolls.length === 1) {
        resultText = `${diceFormula}: ${rolls[0]}${modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''} = ${finalResult}`;
      } else {
        resultText = `${diceFormula}: ${rolls.join(' + ')}${modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''} = ${finalResult}`;
      }
    }

    // Add critical messages
    if (hasCritical) {
      resultText += ' 🌟 CRITICAL HIT! 🌟';
    }
    if (hasCriticalFail) {
      resultText += ' 💀 CRITICAL FAILURE!';
    }

    // Update result displays
    const resultEl = $('#diceResult');
    if (resultEl) {
      resultEl.textContent = resultText;
      resultEl.className = 'result';
      if (hasCritical) resultEl.classList.add('critical-success');
      if (hasCriticalFail) resultEl.classList.add('critical-fail');
      show(resultEl);
    }

    const resultElFs = $('#diceResultFs');
    if (resultElFs) {
      resultElFs.textContent = resultText;
      resultElFs.className = 'result';
      if (hasCritical) resultElFs.classList.add('critical-success');
      if (hasCriticalFail) resultElFs.classList.add('critical-fail');
      show(resultElFs);
    }

    // Update sum display
    $('#currentSum').textContent = finalResult;
    const currentSumFs = $('#currentSumFs');
    if (currentSumFs) currentSumFs.textContent = finalResult;

    // Play appropriate sounds
    if (hasCritical) {
      criticalSound();
      vibrate(100);
    } else if (hasCriticalFail) {
      failSound();
      vibrate(150);
    } else {
      thud();
      vibrate(40);
    }

    updateStats();
  }

  function updateStats() {
    const elements = {
      totalRolls: $('#totalRolls'),
      averageRoll: $('#averageRoll'),
      criticalHits: $('#criticalHits'),
      criticalFails: $('#criticalFails'),
      advantageRolls: $('#advantageRolls')
    };
    
    if (elements.totalRolls) elements.totalRolls.textContent = stats.total;
    if (elements.averageRoll) {
      elements.averageRoll.textContent = stats.total > 0 ? (stats.sum / stats.total).toFixed(1) : '-';
    }
    if (elements.criticalHits) elements.criticalHits.textContent = stats.criticalHits;
    if (elements.criticalFails) elements.criticalFails.textContent = stats.criticalFails;
    if (elements.advantageRolls) elements.advantageRolls.textContent = stats.advantageRolls;
  }

  function startRolling() {
    if (gameState.running) return;
    
    gameState.running = true;
    
    // Add rolling class to containers
    containers().forEach(container => {
      container.classList.add('rolling');
    });
    
    beep(700, 60);
    vibrate(25);
    
    // Start animation
    const animationDuration = 800 + Math.random() * 400;
    
    const interval = setInterval(() => {
      if (!gameState.running) {
        clearInterval(interval);
        return;
      }
      
      // Show random values during animation
      containers().forEach(container => {
        if (container.classList.contains('rolling')) {
          const tempResults = {
            rolls: Array(gameState.diceCount).fill(0).map(() => rollSingleDie(gameState.diceType)),
            rollType: gameState.rollType,
            diceType: gameState.diceType,
            modifier: 0,
            finalResult: 0
          };
          renderDice(container, tempResults);
        }
      });
      
      if (Math.random() < 0.1) tick();
    }, 80);
    
    // End animation and show final results
    setTimeout(() => {
      clearInterval(interval);
      gameState.running = false;
      
      containers().forEach(container => {
        container.classList.remove('rolling');
      });
      
      const results = calculateResults();
      gameState.results = results;
      updateDisplay(results);
    }, animationDuration);
  }

  function accelerate() {
    if (gameState.running) {
      gameState.running = false;
    }
  }

  function clearDice() {
    gameState.results = null;
    gameState.running = false;
    
    containers().forEach(container => {
      container.classList.remove('rolling');
      container.innerHTML = 'Press Space or click Roll Dice';
    });
    
    const resultEl = $('#diceResult');
    if (resultEl) hide(resultEl);
    
    const resultElFs = $('#diceResultFs');
    if (resultElFs) hide(resultElFs);
    
    // Reset current sum
    $('#currentSum').textContent = '-';
    const currentSumFs = $('#currentSumFs');
    if (currentSumFs) currentSumFs.textContent = '-';
    
    beep(320, 60, 'square');
    vibrate(20);
  }

  function primaryAction() {
    if (!gameState.running) {
      startRolling();
    } else {
      accelerate();
    }
  }

  function setDiceType(type) {
    gameState.diceType = type;
    updateActiveStates();
    clearDice();
  }

  function setDiceCount(count) {
    gameState.diceCount = parseInt(count);
    clearDice();
  }

  function setRollType(type) {
    gameState.rollType = type;
    updateActiveStates();
    clearDice();
  }

  function setModifier(value) {
    gameState.modifier = parseInt(value) || 0;
  }

  function applyPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) return;
    
    gameState.diceType = preset.type;
    gameState.diceCount = preset.count;
    gameState.rollType = preset.rollType;
    gameState.modifier = preset.modifier;
    
    // Update UI
    $('#modifier').value = preset.modifier;
    updateActiveStates();
    clearDice();
    
    beep(800, 40);
  }

  function updateActiveStates() {
    // Update dice type pills
    $$('.dice-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.type === gameState.diceType);
    });
    
    // Update dice count pills
    $$('.dice-count-pill').forEach(pill => {
      pill.classList.toggle('active', parseInt(pill.dataset.count) === gameState.diceCount);
    });
    
    // Update advantage pills
    $$('.advantage-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.type === gameState.rollType);
    });
  }

  function isEditableFocused() {
    const ae = document.activeElement;
    return ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    // Dice type selection
    $$('.dice-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        setDiceType(pill.dataset.type);
      });
    });

    // Dice count selection
    $$('.dice-count-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        setDiceCount(pill.dataset.count);
      });
    });

    // Roll type selection
    $$('.advantage-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        setRollType(pill.dataset.type);
      });
    });

    // Modifier input
    const modifierInput = $('#modifier');
    if (modifierInput) {
      modifierInput.addEventListener('input', (e) => {
        setModifier(e.target.value);
      });
    }

    // Preset buttons
    $$('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyPreset(btn.dataset.preset);
      });
    });

    // Main buttons
    $('#btnRollDice').addEventListener('click', primaryAction);
    const btnRollDiceFs = $('#btnRollDiceFs');
    if (btnRollDiceFs) btnRollDiceFs.addEventListener('click', primaryAction);
    
    $('#btnClearDice').addEventListener('click', clearDice);
    const btnClearDiceFs = $('#btnClearDiceFs');
    if (btnClearDiceFs) btnClearDiceFs.addEventListener('click', clearDice);
    
    // Fullscreen controls
    $('#btnFsDice').addEventListener('click', () => {
      show($('#fullscreenOverlay'));
      const fsInner = $('#fullscreenDiceInner');
      if (fsInner && gameState.results) {
        renderDice(fsInner, gameState.results);
      }
    });

    const btnExitFs = $('#btnExitFs');
    if (btnExitFs) {
      btnExitFs.addEventListener('click', () => {
        hide($('#fullscreenOverlay'));
      });
    }

    // Keyboard controls
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && !isEditableFocused()) { 
        e.preventDefault(); 
        primaryAction(); 
      }
      if (e.code === 'Escape') {
        const overlay = $('#fullscreenOverlay');
        if (overlay && overlay.style.display === 'flex') {
          hide(overlay);
        }
      }
    });

    // Initialize display
    updateActiveStates();
    updateStats();
    clearDice();
  });
})();