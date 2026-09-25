(function () {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const GROUND_Y = H - 60;
  const LANE_COUNT = 4;
  const LANE_HEIGHT = 60;
  const LANE_TOP = GROUND_Y - LANE_COUNT * LANE_HEIGHT;

  const startScreen = document.getElementById('start-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const finalScoreText = document.getElementById('final-score-text');
  const finalDistanceText = document.getElementById('final-distance-text');
  const scoreForm = document.getElementById('score-form');
  const playerNameInput = document.getElementById('player-name');
  const btnSubmitScore = document.getElementById('btn-submit-score');
  const submitStatus = document.getElementById('submit-status');
  const btnRestart = document.getElementById('btn-restart');
  const scoresList = document.getElementById('scores-list');
  const hudScore = document.getElementById('hud-score');
  const hudShields = document.getElementById('hud-shields');
  const hudDistance = document.getElementById('hud-distance');
  const hud = document.getElementById('hud');

  let state = 'menu';
  let runner, obstacles, powerups, particles, bgOffset, score, distance, gameSpeed;
  let frameCount, spawnTimer, difficultyTimer;
  let animFrame;
  let submitting = false;
  let scoreSubmitted = false;

  const KEYS = {};
  document.addEventListener('keydown', e => {
    if (state === 'playing') {
      if (['ArrowUp','ArrowDown','KeyW','KeyS'].includes(e.code)) {
        e.preventDefault();
      }
    }
    KEYS[e.code] = true;
  });
  document.addEventListener('keyup', e => { KEYS[e.code] = false; });

  function laneY(lane) {
    return LANE_TOP + lane * LANE_HEIGHT + LANE_HEIGHT / 2;
  }

  function initGame() {
    runner = {
      x: 100,
      lane: 1,
      y: laneY(1),
      targetY: laneY(1),
      w: 36,
      h: 52,
      shields: 0,
      lives: 3,
      invincible: 0,
      tripped: 0,
      legPhase: 0,
      armPhase: 0,
      bobPhase: 0,
    };
    obstacles = [];
    powerups = [];
    particles = [];
    bgOffset = 0;
    score = 0;
    distance = 0;
    gameSpeed = 3;
    frameCount = 0;
    spawnTimer = 0;
    difficultyTimer = 0;
    state = 'playing';
    startScreen.style.display = 'none';
    gameoverScreen.style.display = 'none';
    hud.style.display = 'flex';
    submitting = false;
    scoreSubmitted = false;
  }

  const ENEMY_TYPES = [
    { name: 'poo',  emoji: '💩', w: 32, h: 32, points: 15 },
    { name: 'dog',  emoji: '🐕', w: 40, h: 34, points: 20 },
    { name: 'cake', emoji: '🎂', w: 34, h: 34, points: 10 },
    { name: 'puddle', emoji: '💦', w: 38, h: 24, points: 12 },
  ];

  const POWERUP_TYPES = [
    { name: 'gel',   emoji: '⚡', w: 28, h: 28, label: 'Energy Gel' },
    { name: 'shoes', emoji: '👟', w: 32, h: 28, label: 'Carbon Shoes' },
  ];

  function spawnEntity() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    if (Math.random() < 0.25) {
      const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      powerups.push({
        ...type,
        x: W + 20,
        y: laneY(lane),
        lane,
        speed: gameSpeed * (0.8 + Math.random() * 0.4),
      });
    } else {
      const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
      obstacles.push({
        ...type,
        x: W + 20,
        y: laneY(lane),
        lane,
        speed: gameSpeed * (0.9 + Math.random() * 0.5),
        dodged: false,
      });
    }
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  function hitBox(a, bx, by, bw, bh) {
    return a.x - a.w/2 < bx + bw/2 &&
           a.x + a.w/2 > bx - bw/2 &&
           a.y - a.h/2 < by + bh/2 &&
           a.y + a.h/2 > by - bh/2;
  }

  function update() {
    frameCount++;
    distance += gameSpeed * 0.3;
    score += Math.floor(gameSpeed * 0.5);

    difficultyTimer++;
    if (difficultyTimer > 300) {
      difficultyTimer = 0;
      gameSpeed = Math.min(gameSpeed + 0.3, 9);
    }

    if (KEYS['ArrowUp'] || KEYS['KeyW']) {
      if (runner.lane > 0 && runner.tripped <= 0) runner.lane--;
      KEYS['ArrowUp'] = false;
      KEYS['KeyW'] = false;
    }
    if (KEYS['ArrowDown'] || KEYS['KeyS']) {
      if (runner.lane < LANE_COUNT - 1 && runner.tripped <= 0) runner.lane++;
      KEYS['ArrowDown'] = false;
      KEYS['KeyS'] = false;
    }

    runner.targetY = laneY(runner.lane);
    runner.y += (runner.targetY - runner.y) * 0.2;

    if (runner.tripped > 0) {
      runner.tripped--;
    } else {
      runner.legPhase += 0.3 * gameSpeed;
      runner.armPhase += 0.3 * gameSpeed;
    }
    runner.bobPhase += 0.15;

    if (runner.invincible > 0) runner.invincible--;

    spawnTimer++;
    const spawnInterval = Math.max(25, 70 - gameSpeed * 5);
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnEntity();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= o.speed;
      if (o.x < -50) {
        if (!o.dodged) {
          score += o.points;
          o.dodged = true;
        }
        obstacles.splice(i, 1);
        continue;
      }
      if (!o.dodged && o.x < runner.x) {
        o.dodged = true;
        score += o.points;
      }
      if (runner.invincible <= 0 && runner.tripped <= 0 &&
          hitBox(runner, o.x, o.y, o.w, o.h)) {
        if (runner.shields > 0) {
          runner.shields--;
          runner.invincible = 60;
          runner.tripped = 40;
          spawnParticles(runner.x, runner.y, '#fff', 8);
          obstacles.splice(i, 1);
        } else {
          runner.lives--;
          if (runner.lives <= 0) {
            spawnParticles(runner.x, runner.y, '#ff4444', 20);
            endGame();
            return;
          }
          runner.invincible = 90;
          runner.tripped = 50;
          spawnParticles(runner.x, runner.y, '#ff6b6b', 12);
          obstacles.splice(i, 1);
        }
      }
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.x -= p.speed;
      if (p.x < -50) {
        powerups.splice(i, 1);
        continue;
      }
      if (runner.tripped <= 0 && hitBox(runner, p.x, p.y, p.w, p.h)) {
        if (runner.shields < 3) {
          runner.shields++;
          spawnParticles(p.x, p.y, '#4ecdc4', 10);
        }
        score += 25;
        powerups.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    bgOffset = (bgOffset + gameSpeed) % 80;

    hudScore.textContent = 'Score: ' + score;
    hudShields.textContent = '🧻 x ' + runner.shields;
    hudDistance.textContent = Math.floor(distance) + 'm';
  }

  function drawBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#1a1a3e');
    skyGrad.addColorStop(0.6, '#2d4a6f');
    skyGrad.addColorStop(1, '#4a7c59');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#3d6b4f';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = -bgOffset; x < W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, LANE_TOP);
      ctx.lineTo(x, GROUND_Y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i <= LANE_COUNT; i++) {
      const y = LANE_TOP + i * LANE_HEIGHT;
      ctx.beginPath();
      ctx.setLineDash(i === 0 || i === LANE_COUNT ? [] : [8, 12]);
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < LANE_COUNT; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(0, LANE_TOP + i * LANE_HEIGHT, W, LANE_HEIGHT);
      }
    }
  }

  function drawRunner() {
    const r = runner;
    const bobY = r.tripped > 0 ? 0 : Math.sin(r.bobPhase) * 2;
    const cx = r.x;
    const cy = r.y + bobY;

    ctx.save();

    if (r.invincible > 0 && Math.floor(r.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (r.tripped > 0) {
      ctx.translate(cx, cy);
      const tripProgress = Math.min(1, (50 - r.tripped) / 15);
      ctx.rotate(tripProgress * Math.PI / 3);
      ctx.translate(-cx, -cy);
    }

    ctx.fillStyle = '#ffcc88';
    ctx.beginPath();
    ctx.arc(cx, cy - 22, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.fillRect(cx + 3, cy - 25, 3, 3);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + 2, cy - 18, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(cx - 10, cy - 12, 4, 3);
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 12);
    ctx.lineTo(cx - 6, cy - 12);
    ctx.lineTo(cx - 10, cy - 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3498db';
    ctx.fillRect(cx - 8, cy - 10, 16, 18);

    const bib = Math.floor(Math.random() * 1000) === 0 ? '42' : '42';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bib, cx, cy + 2);

    if (r.tripped <= 0) {
      const legSwing = Math.sin(r.legPhase) * 14;
      const armSwing = Math.sin(r.armPhase) * 10;

      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(cx - 2, cy + 8);
      ctx.lineTo(cx - 2 + legSwing, cy + 24);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy + 8);
      ctx.lineTo(cx + 2 - legSwing, cy + 24);
      ctx.stroke();

      ctx.strokeStyle = '#ffcc88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy - 6);
      ctx.lineTo(cx + 4 + armSwing, cy + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 6);
      ctx.lineTo(cx - 4 - armSwing, cy + 2);
      ctx.stroke();

      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.ellipse(cx - 2 + legSwing, cy + 25, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 2 - legSwing, cy + 25, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 8);
      ctx.lineTo(cx + 10, cy + 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + 8);
      ctx.lineTo(cx - 8, cy + 20);
      ctx.stroke();
      ctx.strokeStyle = '#ffcc88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx + 12, cy - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx - 10, cy + 4);
      ctx.stroke();
    }

    if (r.shields > 0) {
      for (let i = 0; i < r.shields; i++) {
        const angle = (frameCount * 0.03) + (i * Math.PI * 2 / 3);
        const ox = Math.cos(angle) * 22;
        const oy = Math.sin(angle) * 14;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧻', cx + ox, cy + oy);
      }
    }

    ctx.restore();
  }

  function drawEmoji(emoji, x, y, size) {
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
  }

  function drawObstacles() {
    for (const o of obstacles) {
      ctx.save();
      const hover = Math.sin(frameCount * 0.08 + o.x * 0.01) * 3;
      drawEmoji(o.emoji, o.x, o.y + hover, 26);

      if (o.name === 'dog') {
        const tailWag = Math.sin(frameCount * 0.2) * 4;
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x + 16, o.y - 4 + hover);
        ctx.lineTo(o.x + 22, o.y - 8 + hover + tailWag);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawPowerups() {
    for (const p of powerups) {
      ctx.save();
      const pulse = 1 + Math.sin(frameCount * 0.1) * 0.1;
      const glow = Math.sin(frameCount * 0.08) * 0.3 + 0.5;
      ctx.shadowColor = '#4ecdc4';
      ctx.shadowBlur = 12 * glow;
      drawEmoji(p.emoji, p.x, p.y, 22 * pulse);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLives() {
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < runner.lives; i++) {
      ctx.fillText('❤️', 10 + i * 24, 22);
    }
  }

  function draw() {
    drawBackground();
    drawPowerups();
    drawObstacles();
    drawRunner();
    drawParticles();
    drawLives();
  }

  function gameLoop() {
    if (state !== 'playing') return;
    update();
    draw();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function endGame() {
    state = 'gameover';
    hud.style.display = 'none';
    cancelAnimationFrame(animFrame);

    draw();

    finalScoreText.textContent = 'Final Score: ' + score;
    finalDistanceText.textContent = 'Distance: ' + Math.floor(distance) + 'm';
    gameoverScreen.style.display = 'block';
    btnRestart.style.display = 'none';
    scoreForm.style.display = 'flex';
    submitStatus.textContent = '';
    playerNameInput.value = '';
    btnSubmitScore.disabled = false;
    scoreSubmitted = false;

    loadHighScores();
  }

  async function loadHighScores() {
    try {
      const res = await fetch('api/scores');
      if (!res.ok) throw new Error('Failed to load scores');
      const data = await res.json();
      scoresList.innerHTML = '';
      data.forEach(s => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'sname';
        nameSpan.textContent = s.name;
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'sscore';
        scoreSpan.textContent = s.score.toLocaleString();
        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        scoresList.appendChild(li);
      });
    } catch (e) {
      scoresList.innerHTML = '<li>Could not load scores</li>';
    }
  }

  scoreForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitting || scoreSubmitted) return;

    const name = playerNameInput.value.trim();
    if (!name) {
      submitStatus.textContent = 'Please enter a name.';
      return;
    }

    submitting = true;
    btnSubmitScore.disabled = true;
    submitStatus.textContent = 'Saving...';

    try {
      const res = await fetch('api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Save failed');
      }
      submitStatus.textContent = 'Score saved!';
      submitStatus.style.color = '#4ecdc4';
      scoreSubmitted = true;
      scoreForm.style.display = 'none';
      btnRestart.style.display = 'inline-block';
      await loadHighScores();
    } catch (err) {
      submitStatus.textContent = err.message + ' — try again.';
      submitStatus.style.color = '#ff6b6b';
      btnSubmitScore.disabled = false;
    } finally {
      submitting = false;
    }
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    initGame();
    gameLoop();
  });

  btnRestart.addEventListener('click', () => {
    initGame();
    gameLoop();
  });

  drawBackground();
})();
