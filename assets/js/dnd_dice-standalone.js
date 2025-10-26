// D&D Dice Roller

// DOM Elements
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

// State
let currentDiceType = 'd20';
let currentDiceCount = 1;
let rollType = 'normal';
let modifier = 0;
let isRolling = false;
let stats = {
  totalRolls: 0,
  criticalHits: 0,
  criticalFails: 0,
  advantageRolls: 0,
  rolls: []
};

// Dice Type Selection
$$('.dice-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('.dice-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentDiceType = pill.dataset.type;
  });
});

// Dice Count Selection
$$('.dice-count-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('.dice-count-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentDiceCount = parseInt(pill.dataset.count);
    
    // Jos noppia on enemmän kuin yksi, pakota normal
    if (currentDiceCount > 1) {
      rollType = 'normal';
      $$('.advantage-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.type === 'normal');
      });
    }
  });
});

// Advantage/Disadvantage Selection
$$('.advantage-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('.advantage-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    rollType = pill.dataset.type;
    
    // Jos valitaan advantage/disadvantage, pakota noppien määrä yhdeksi
    if (rollType !== 'normal') {
      currentDiceCount = 1;
      $$('.dice-count-pill').forEach(p => {
        p.classList.toggle('active', parseInt(p.dataset.count) === 1);
      });
    }
  });
});

// Modifier Input
$('#modifier').addEventListener('input', e => {
  modifier = parseInt(e.target.value) || 0;
});

// Quick Presets
$$('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    switch(preset) {
      case 'attack':
        setDice('d20', 1, 'normal');
        break;
      case 'damage':
        setDice('d8', 1, 'normal');
        break;
      case 'fireball':
        setDice('d6', 8, 'normal');
        break;
      case 'healing':
        setDice('d8', 1, 'normal');
        break;
      case 'stats':
        setDice('d6', 4, 'normal');
        break;
      case 'initiative':
        setDice('d20', 1, 'normal');
        break;
    }
  });
});

// Set Dice Configuration
function setDice(type, count, advantage) {
  // Set type
  currentDiceType = type;
  $$('.dice-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.type === type);
  });
  
  // Set count
  currentDiceCount = count;
  $$('.dice-count-pill').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.count) === count);
  });
  
  // Set advantage
  rollType = advantage;
  $$('.advantage-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.type === advantage);
  });
}

// Roll Dice
function rollDice() {
  // Jos heitto on jo käynnissä, älä tee mitään
  if (isRolling) return;
  
  isRolling = true;
  const diceSize = parseInt(currentDiceType.substring(1));
  let rolls = [];
  let results = [];
  
  // Roll based on type
  if(rollType === 'normal') {
    for(let i = 0; i < currentDiceCount; i++) {
      const roll = Math.floor(Math.random() * diceSize) + 1;
      rolls.push(roll);
      results.push(roll);
    }
  } else {
    stats.advantageRolls++;
    for(let i = 0; i < currentDiceCount; i++) {
      const roll1 = Math.floor(Math.random() * diceSize) + 1;
      const roll2 = Math.floor(Math.random() * diceSize) + 1;
      
      if(rollType === 'advantage') {
        rolls.push([roll1, roll2]);
        results.push(Math.max(roll1, roll2));
      } else {
        rolls.push([roll1, roll2]);
        results.push(Math.min(roll1, roll2));
      }
    }
  }
  
  // Update stats
  stats.totalRolls++;
  if(currentDiceType === 'd20') {
    results.forEach(r => {
      if(r === 20) stats.criticalHits++;
      if(r === 1) stats.criticalFails++;
    });
  }
  stats.rolls.push(...results);
  
  // Calculate total
  const total = results.reduce((a, b) => a + b, 0) + modifier;
  
  // Display results
  displayResults(rolls, results, total);
  updateStats();
}

// Display Results
function displayResults(rolls, results, total) {
  const container = $('#diceDisplay');
  const resultDiv = $('#diceResult');
  
  // Clear previous
  container.innerHTML = '';
  
  // Show rolls with animation
  if(rollType === 'normal') {
    rolls.forEach((roll, i) => {
      const span = document.createElement('span');
      span.dataset.type = currentDiceType;
      span.textContent = '...';
      // Add random rotation values
      span.style.setProperty('--roll-y1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y5', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z5', Math.floor(Math.random() * 360) + 'deg');
      
      // Add random rotation values
      span.style.setProperty('--roll-y1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y5', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z5', Math.floor(Math.random() * 360) + 'deg');
      
      // Add animation with staggered start
      setTimeout(() => {
        span.classList.add('rolling');
        if(currentDiceType === 'd20') {
          if(roll === 20) span.classList.add('critical');
          if(roll === 1) span.classList.add('fail');
        }
        container.appendChild(span);
        
        // Show result after animation
        setTimeout(() => {
          span.textContent = roll;
          if (i === rolls.length - 1) {
            isRolling = false;
          }
        }, 600);
      }, i * 100);
    });
  } else {
    rolls.forEach((roll, i) => {
      const span = document.createElement('span');
      span.dataset.type = currentDiceType;
      span.textContent = '...';
      span.classList.add('rolling');
      if(currentDiceType === 'd20') {
        if(results[i] === 20) span.classList.add('critical');
        if(results[i] === 1) span.classList.add('fail');
      }
      container.appendChild(span);
      
      // Show result after animation
      // Add random rotation values
      span.style.setProperty('--roll-y1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y5', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z5', Math.floor(Math.random() * 360) + 'deg');
      
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'adv-result';
        
        const roll1 = document.createElement('span');
        roll1.textContent = roll[0];
        roll1.className = rollType === 'advantage' ? 
          (roll[0] > roll[1] ? 'selected' : 'dimmed') : 
          (roll[0] < roll[1] ? 'selected' : 'dimmed');
        
        const roll2 = document.createElement('span');
        roll2.textContent = roll[1];
        roll2.className = rollType === 'advantage' ? 
          (roll[1] > roll[0] ? 'selected' : 'dimmed') : 
          (roll[1] < roll[0] ? 'selected' : 'dimmed');
        
        div.appendChild(roll1);
        div.appendChild(roll2);
        
        span.textContent = '';
        span.appendChild(div);
        
        if (i === rolls.length - 1) {
          isRolling = false;
        }
      }, 600 + i * 100);
    });
  }
  
  // Show total
  let resultText = '';
  if(modifier !== 0) {
    resultText = `Total: ${results.join(' + ')} ${modifier >= 0 ? '+' : ''}${modifier} = <span class="total">${total}</span>`;
  } else {
    resultText = `Total: <span class="total">${total}</span>`;
  }
  resultDiv.innerHTML = resultText;
}

// Update Statistics
function updateStats() {
  $('#currentSum').textContent = stats.rolls.length ? stats.rolls[stats.rolls.length - 1] : '-';
  $('#totalRolls').textContent = stats.totalRolls;
  $('#criticalHits').textContent = stats.criticalHits;
  $('#criticalFails').textContent = stats.criticalFails;
  $('#advantageRolls').textContent = stats.advantageRolls;
  
  const avg = stats.rolls.length ? 
    (stats.rolls.reduce((a, b) => a + b, 0) / stats.rolls.length).toFixed(1) : 
    '-';
  $('#averageRoll').textContent = avg;
}

// Clear Results
function clearResults() {
  $('#diceDisplay').innerHTML = 'Press Space or click Roll Dice';
  $('#diceResult').innerHTML = '';
  stats = {
    totalRolls: 0,
    criticalHits: 0,
    criticalFails: 0,
    advantageRolls: 0,
    rolls: []
  };
  updateStats();
}

// Event Listeners
$('#btnRollDice').addEventListener('click', rollDice);
$('#btnClearDice').addEventListener('click', clearResults);

// Click Controls
// Klikkaukset noppa-alueella
document.addEventListener('click', e => {
  const diceDisplay = $('#diceDisplay');
  const fsDisplay = $('#fullscreenDiceInner');
  
  if(e.target.closest('#diceDisplay') || e.target.closest('#fullscreenDiceInner')) {
    rollDice();
  }
});

// Space-näppäin
document.addEventListener('keydown', e => {
  if(e.code === 'Space' && !e.repeat && !e.target.matches('input, textarea')) {
    e.preventDefault();
    if (isFullscreen) {
      // Jos ollaan fullscreen-tilassa, käytä fullscreen-nappulan logiikkaa
      $('#btnRollDiceFs').click();
    } else {
      rollDice();
    }
  }
});

// Keyboard Controls
// Poistettu päällekkäinen space-näppäimen kuuntelija

// Fullscreen Mode
const overlay = $('#fullscreenOverlay');
let isFullscreen = false;

// Fullscreen Controls
$('#btnFsDice').addEventListener('click', () => {
  isFullscreen = true;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
});

$('#btnExitFs').addEventListener('click', () => {
  isFullscreen = false;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
});

// Fullscreen Dice Controls
$$('#fullscreenOverlay .dice-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('#fullscreenOverlay .dice-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentDiceType = pill.dataset.type;
  });
});

$$('#fullscreenOverlay .dice-count-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('#fullscreenOverlay .dice-count-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentDiceCount = parseInt(pill.dataset.count);
    
    // Jos noppia on enemmän kuin yksi, pakota normal
    if (currentDiceCount > 1) {
      rollType = 'normal';
      $$('#fullscreenOverlay .advantage-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.type === 'normal');
      });
    }
  });
});

$$('#fullscreenOverlay .advantage-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('#fullscreenOverlay .advantage-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    rollType = pill.dataset.type;
    
    // Jos valitaan advantage/disadvantage, pakota noppien määrä yhdeksi
    if (rollType !== 'normal') {
      currentDiceCount = 1;
      $$('#fullscreenOverlay .dice-count-pill').forEach(p => {
        p.classList.toggle('active', parseInt(p.dataset.count) === 1);
      });
    }
  });
});

// Fullscreen Roll
$('#btnRollDiceFs').addEventListener('click', () => {
  if (isRolling) return;
  isRolling = true;
  
  const diceSize = parseInt(currentDiceType.substring(1));
  let rolls = [];
  let results = [];
  
  // Get modifier value
  modifier = parseInt($('#modifierFs').value) || 0;
  
  // Roll based on count and type
  if(rollType === 'normal') {
    for(let i = 0; i < currentDiceCount; i++) {
      const roll = Math.floor(Math.random() * diceSize) + 1;
      rolls.push(roll);
      results.push(roll);
    }
  } else {
    stats.advantageRolls++;
    for(let i = 0; i < currentDiceCount; i++) {
      const roll1 = Math.floor(Math.random() * diceSize) + 1;
      const roll2 = Math.floor(Math.random() * diceSize) + 1;
      
      if(rollType === 'advantage') {
        rolls.push([roll1, roll2]);
        results.push(Math.max(roll1, roll2));
      } else {
        rolls.push([roll1, roll2]);
        results.push(Math.min(roll1, roll2));
      }
    }
  }
  
  // Update stats
  stats.totalRolls++;
  if(currentDiceType === 'd20') {
    results.forEach(r => {
      if(r === 20) stats.criticalHits++;
      if(r === 1) stats.criticalFails++;
    });
  }
  stats.rolls.push(...results);
  
  // Calculate total
  const total = results.reduce((a, b) => a + b, 0) + modifier;
  
  // Display results
  const container = $('#fullscreenDiceInner');
  const resultDiv = $('#diceResultFs');
  
  container.innerHTML = '';
  if(rollType === 'normal') {
    rolls.forEach((roll, i) => {
      const span = document.createElement('span');
      span.dataset.type = currentDiceType;
      span.textContent = '...';
      
      // Add random rotation values
      span.style.setProperty('--roll-y1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y5', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z5', Math.floor(Math.random() * 360) + 'deg');
      
      // Add animation with staggered start
      setTimeout(() => {
        span.classList.add('rolling');
        if(currentDiceType === 'd20') {
          if(roll === 20) span.classList.add('critical');
          if(roll === 1) span.classList.add('fail');
        }
        container.appendChild(span);
        
        // Show result after animation
        setTimeout(() => {
          span.textContent = roll;
          if (i === rolls.length - 1) {
            isRolling = false;
          }
        }, 600);
      }, i * 100);
    });
  } else {
    rolls.forEach((roll, i) => {
      const span = document.createElement('span');
      span.dataset.type = currentDiceType;
      span.textContent = '...';
      
      // Add random rotation values
      span.style.setProperty('--roll-y1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-y5', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z1', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z2', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z3', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z4', Math.floor(Math.random() * 360) + 'deg');
      span.style.setProperty('--roll-z5', Math.floor(Math.random() * 360) + 'deg');
      
      // Add animation with staggered start
      setTimeout(() => {
        span.classList.add('rolling');
        if(currentDiceType === 'd20') {
          if(results[i] === 20) span.classList.add('critical');
          if(results[i] === 1) span.classList.add('fail');
        }
        container.appendChild(span);
        
        // Show result after animation
          setTimeout(() => {
          const div = document.createElement('div');
          div.className = 'adv-result';
          
          const roll1 = document.createElement('span');
          roll1.textContent = roll[0];
          roll1.className = rollType === 'advantage' ? 
            (roll[0] > roll[1] ? 'selected' : 'dimmed') : 
            (roll[0] < roll[1] ? 'selected' : 'dimmed');
          
          const roll2 = document.createElement('span');
          roll2.textContent = roll[1];
          roll2.className = rollType === 'advantage' ? 
            (roll[1] > roll[0] ? 'selected' : 'dimmed') : 
            (roll[1] < roll[0] ? 'selected' : 'dimmed');
          
          div.appendChild(roll1);
          div.appendChild(roll2);
          
          span.textContent = '';
          span.appendChild(div);
          if (i === rolls.length - 1) {
            setTimeout(() => {
              isRolling = false;
            }, 100);
          }
        }, 600);
      }, i * 100);
    });
  }
  
  // Show total with delay
  setTimeout(() => {
    if(modifier !== 0) {
      resultDiv.innerHTML = `Total: ${results.join(' + ')} ${modifier >= 0 ? '+' : ''}${modifier} = <span class="total">${total}</span>`;
    } else {
      resultDiv.innerHTML = `Total: <span class="total">${total}</span>`;
    }
  }, currentDiceCount * 100 + 600);
  
  updateStats();
});

// Fullscreen Clear
$('#btnClearDiceFs').addEventListener('click', () => {
  $('#fullscreenDiceInner').innerHTML = '';
  $('#diceResultFs').innerHTML = '';
});
