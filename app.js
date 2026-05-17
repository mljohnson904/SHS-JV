const STORAGE_KEY = 'shs-jv-coach-data-v1';
const AUTOSAVE_SELECTOR = '[data-store], [data-form] input, [data-form] textarea';
const TODAY_KEY = new Date().toISOString().slice(0, 10);
const PLAYER_TAGS = [
  'Varsity Ready',
  'Confidence Focus',
  'Speed Focus',
  'Throwing Focus',
  'Hitting Focus',
  'IQ Focus',
];
const READINESS_FIELDS = ['defense', 'throwing', 'speed', 'hitting', 'iq', 'confidence', 'coachability'];

const defaultData = {
  fields: {},
  forms: {
    weeklyTracker: {},
    seasonGoals: {},
  },
  players: [],
  attendance: {},
  games: [],
};

function freshDefaultData() {
  return JSON.parse(JSON.stringify(defaultData));
}

function mergeData(data = {}) {
  return {
    ...freshDefaultData(),
    ...data,
    fields: { ...defaultData.fields, ...(data.fields ?? {}) },
    forms: {
      weeklyTracker: { ...(data.forms?.weeklyTracker ?? {}) },
      seasonGoals: { ...(data.forms?.seasonGoals ?? {}) },
    },
    players: Array.isArray(data.players) ? data.players.map(normalizePlayer) : [],
    attendance: data.attendance && typeof data.attendance === 'object' ? data.attendance : {},
    games: Array.isArray(data.games) ? data.games : [],
  };
}

function normalizePlayer(player) {
  return {
    ...player,
    tags: Array.isArray(player.tags) ? player.tags : [],
    readiness: {
      defense: player.readiness?.defense ?? '',
      throwing: player.readiness?.throwing ?? '',
      speed: player.readiness?.speed ?? player.speed ?? '',
      hitting: player.readiness?.hitting ?? '',
      iq: player.readiness?.iq ?? '',
      confidence: player.readiness?.confidence ?? player.confidence ?? '',
      coachability: player.readiness?.coachability ?? '',
    },
  };
}

let appData = loadData();
let deferredInstallPrompt = null;

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? mergeData(JSON.parse(saved)) : freshDefaultData();
  } catch (error) {
    console.warn('Could not load saved coach data.', error);
    return freshDefaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function setStatus(message) {
  const status = document.querySelector('#backupStatus');
  if (status) status.textContent = message;
}

function practiceThemeFor(date = new Date()) {
  const themes = [
    'Recovery, review, or game prep',
    'Fundamental Monday',
    'Pressure Offense',
    'Varsity Speed Day',
    'Confidence Day',
    'Recovery, review, or game prep',
    'Recovery, review, or game prep',
  ];
  return themes[date.getDay()];
}

function initToday() {
  const now = new Date();
  const formatted = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  document.querySelector('#todayDate').textContent = formatted;
  document.querySelector('#practiceModeDate').textContent = formatted;
  document.querySelector('#practiceTheme').textContent = practiceThemeFor(now);
}

function initTabs() {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach((tab) => tab.classList.remove('active'));
      document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
      button.classList.add('active');
      document.querySelector(`#${button.dataset.tab}`).classList.add('active');
    });
  });
}

function initStoredFields() {
  document.querySelectorAll('[data-store]').forEach((field) => {
    const key = field.dataset.store;
    if (field.type === 'checkbox') {
      field.checked = Boolean(appData.fields[key]);
    } else {
      field.value = appData.fields[key] ?? '';
    }
  });

  document.querySelectorAll('[data-form]').forEach((form) => {
    const formName = form.dataset.form;
    const values = appData.forms[formName] ?? {};
    form.querySelectorAll('[data-field]').forEach((field) => {
      field.value = values[field.dataset.field] ?? '';
    });
  });

  document.querySelectorAll(AUTOSAVE_SELECTOR).forEach((field) => {
    field.addEventListener('input', handleAutosave);
    field.addEventListener('change', handleAutosave);
  });
}

function handleAutosave(event) {
  const field = event.target;
  if (field.matches('[data-store]')) {
    appData.fields[field.dataset.store] = field.type === 'checkbox' ? field.checked : field.value;
  }

  const form = field.closest('[data-form]');
  if (form && field.matches('[data-field]')) {
    const formName = form.dataset.form;
    appData.forms[formName] = appData.forms[formName] ?? {};
    appData.forms[formName][field.dataset.field] = field.value;
    if (formName === 'seasonGoals') renderGoalProgress();
  }

  saveData();
}

function initPlayers() {
  document.querySelector('#addPlayerButton').addEventListener('click', () => openPlayerForm());
  document.querySelector('#cancelPlayerButton').addEventListener('click', closePlayerForm);
  document.querySelector('#playerForm').addEventListener('submit', savePlayer);
  renderPlayers();
  renderAttendance();
}

function openPlayerForm(player = null) {
  const form = document.querySelector('#playerForm');
  form.hidden = false;
  document.querySelector('#playerId').value = player?.id ?? '';
  document.querySelector('#playerName').value = player?.name ?? '';
  document.querySelector('#playerGrade').value = player?.grade ?? '';
  document.querySelector('#playerPosition').value = player?.position ?? '';
  document.querySelector('#playerStrength').value = player?.strength ?? '';
  document.querySelector('#playerNeed').value = player?.need ?? '';
  document.querySelector('#playerSpeed').value = player?.speed ?? '';
  document.querySelector('#playerConfidence').value = player?.confidence ?? '';
  document.querySelectorAll('input[name="playerTags"]').forEach((checkbox) => {
    checkbox.checked = player?.tags?.includes(checkbox.value) ?? false;
  });
  document.querySelector('#playerDefense').value = player?.readiness?.defense ?? '';
  document.querySelector('#playerThrowing').value = player?.readiness?.throwing ?? '';
  document.querySelector('#playerReadinessSpeed').value = player?.readiness?.speed ?? player?.speed ?? '';
  document.querySelector('#playerHitting').value = player?.readiness?.hitting ?? '';
  document.querySelector('#playerIq').value = player?.readiness?.iq ?? '';
  document.querySelector('#playerReadinessConfidence').value = player?.readiness?.confidence ?? player?.confidence ?? '';
  document.querySelector('#playerCoachability').value = player?.readiness?.coachability ?? '';
  document.querySelector('#playerNotes').value = player?.notes ?? '';
  document.querySelector('#playerName').focus();
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function closePlayerForm() {
  document.querySelector('#playerForm').reset();
  document.querySelector('#playerId').value = '';
  document.querySelector('#playerForm').hidden = true;
}

function savePlayer(event) {
  event.preventDefault();
  const id = document.querySelector('#playerId').value || createId();
  const readiness = {
    defense: document.querySelector('#playerDefense').value,
    throwing: document.querySelector('#playerThrowing').value,
    speed: document.querySelector('#playerReadinessSpeed').value,
    hitting: document.querySelector('#playerHitting').value,
    iq: document.querySelector('#playerIq').value,
    confidence: document.querySelector('#playerReadinessConfidence').value,
    coachability: document.querySelector('#playerCoachability').value,
  };
  const player = normalizePlayer({
    id,
    name: document.querySelector('#playerName').value.trim(),
    grade: document.querySelector('#playerGrade').value.trim(),
    position: document.querySelector('#playerPosition').value.trim(),
    strength: document.querySelector('#playerStrength').value.trim(),
    need: document.querySelector('#playerNeed').value.trim(),
    speed: document.querySelector('#playerSpeed').value,
    confidence: document.querySelector('#playerConfidence').value,
    tags: [...document.querySelectorAll('input[name="playerTags"]:checked')].map((checkbox) => checkbox.value),
    readiness,
    notes: document.querySelector('#playerNotes').value.trim(),
  });

  if (!player.name) return;

  const existingIndex = appData.players.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    appData.players[existingIndex] = player;
  } else {
    appData.players.push(player);
  }

  saveData();
  closePlayerForm();
  renderPlayers();
  renderAttendance();
}

function readinessScore(player) {
  const values = READINESS_FIELDS.map((field) => Number(player.readiness?.[field])).filter((value) => value > 0);
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / (values.length * 5)) * 100);
}

function renderPlayers() {
  const list = document.querySelector('#playerList');
  if (!appData.players.length) {
    list.innerHTML = '<p class="empty-state">No players added yet. Add your first player card before practice.</p>';
    return;
  }

  list.innerHTML = appData.players.map((player) => {
    const score = readinessScore(player);
    return `
      <article class="card player-card" data-player-id="${escapeHtml(player.id)}">
        <div class="player-card-header">
          <div>
            <h3>${escapeHtml(player.name)}</h3>
            <p class="player-meta">${escapeHtml([player.grade && `Grade ${player.grade}`, player.position].filter(Boolean).join(' • ') || 'Player profile')}</p>
          </div>
          <span class="score-badge">${score}% ready</span>
        </div>
        <div class="rating-row">
          <span class="rating-pill">Speed: ${escapeHtml(player.speed || '—')}/5</span>
          <span class="rating-pill">Confidence: ${escapeHtml(player.confidence || '—')}/5</span>
        </div>
        <div class="progress-track" aria-label="Varsity readiness score"><span style="width: ${score}%"></span></div>
        ${renderTags(player.tags)}
        <dl>
          <div><dt>Strength</dt><dd>${escapeHtml(player.strength || '—')}</dd></div>
          <div><dt>Development need</dt><dd>${escapeHtml(player.need || '—')}</dd></div>
          <div><dt>Readiness areas</dt><dd>${readinessSummary(player)}</dd></div>
          <div><dt>Coach notes</dt><dd>${escapeHtml(player.notes || '—')}</dd></div>
        </dl>
        <div class="player-actions">
          <button class="ghost-button" type="button" data-action="edit">Edit</button>
          <button class="danger-button" type="button" data-action="delete">Delete</button>
        </div>
      </article>
    `;
  }).join('');

  list.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const player = findPlayerFromButton(button);
      if (player) openPlayerForm(player);
    });
  });

  list.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => {
      const player = findPlayerFromButton(button);
      if (!player) return;
      appData.players = appData.players.filter((item) => item.id !== player.id);
      Object.keys(appData.attendance).forEach((date) => delete appData.attendance[date][player.id]);
      saveData();
      renderPlayers();
      renderAttendance();
    });
  });
}

function renderTags(tags = []) {
  if (!tags.length) return '<div class="tag-row"><span class="tag muted-tag">No tags yet</span></div>';
  return `<div class="tag-row">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`;
}

function readinessSummary(player) {
  return READINESS_FIELDS.map((field) => `${field}: ${escapeHtml(player.readiness?.[field] || '—')}`).join(' • ');
}

function findPlayerFromButton(button) {
  const id = button.closest('[data-player-id]')?.dataset.playerId;
  return appData.players.find((player) => player.id === id);
}

function renderAttendance() {
  const list = document.querySelector('#attendanceList');
  if (!list) return;
  appData.attendance[TODAY_KEY] = appData.attendance[TODAY_KEY] ?? {};

  if (!appData.players.length) {
    list.innerHTML = '<p class="empty-state">Add players first, then mark attendance here.</p>';
    return;
  }

  list.innerHTML = appData.players.map((player) => `
    <label class="attendance-row">
      <input type="checkbox" data-attendance-player="${escapeHtml(player.id)}" ${appData.attendance[TODAY_KEY][player.id] ? 'checked' : ''} />
      <span>${escapeHtml(player.name)}</span>
      <small>${escapeHtml(player.position || 'Player')}</small>
    </label>
  `).join('');

  list.querySelectorAll('[data-attendance-player]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      appData.attendance[TODAY_KEY][checkbox.dataset.attendancePlayer] = checkbox.checked;
      saveData();
    });
  });
}

function initGames() {
  document.querySelector('#addGameButton').addEventListener('click', () => openGameForm());
  document.querySelector('#cancelGameButton').addEventListener('click', closeGameForm);
  document.querySelector('#gameForm').addEventListener('submit', saveGame);
  renderGames();
}

function openGameForm(game = null) {
  document.querySelector('#gameForm').hidden = false;
  document.querySelector('#gameId').value = game?.id ?? '';
  document.querySelector('#gameDate').value = game?.date ?? TODAY_KEY;
  document.querySelector('#gameOpponent').value = game?.opponent ?? '';
  document.querySelector('#gameScore').value = game?.score ?? '';
  document.querySelector('#gameErrors').value = game?.errors ?? '';
  document.querySelector('#gameStrikeouts').value = game?.strikeouts ?? '';
  document.querySelector('#gameWalksHbp').value = game?.walksHbp ?? '';
  document.querySelector('#gameStolenBases').value = game?.stolenBases ?? '';
  document.querySelector('#gameNotes').value = game?.notes ?? '';
  document.querySelector('#gameOpponent').focus();
}

function closeGameForm() {
  document.querySelector('#gameForm').reset();
  document.querySelector('#gameId').value = '';
  document.querySelector('#gameForm').hidden = true;
}

function saveGame(event) {
  event.preventDefault();
  const id = document.querySelector('#gameId').value || createId();
  const game = {
    id,
    date: document.querySelector('#gameDate').value || TODAY_KEY,
    opponent: document.querySelector('#gameOpponent').value.trim(),
    score: document.querySelector('#gameScore').value.trim(),
    errors: document.querySelector('#gameErrors').value,
    strikeouts: document.querySelector('#gameStrikeouts').value,
    walksHbp: document.querySelector('#gameWalksHbp').value,
    stolenBases: document.querySelector('#gameStolenBases').value,
    notes: document.querySelector('#gameNotes').value.trim(),
  };

  if (!game.opponent) return;

  const existingIndex = appData.games.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    appData.games[existingIndex] = game;
  } else {
    appData.games.unshift(game);
  }

  saveData();
  closeGameForm();
  renderGames();
}

function renderGames() {
  const list = document.querySelector('#gameList');
  if (!appData.games.length) {
    list.innerHTML = '<p class="empty-state">No games logged yet. Add your first game summary after the final out.</p>';
    return;
  }

  list.innerHTML = appData.games.map((game) => `
    <article class="card game-card" data-game-id="${escapeHtml(game.id)}">
      <div class="player-card-header">
        <div>
          <p class="eyebrow">${escapeHtml(game.date || 'Game day')}</p>
          <h3>${escapeHtml(game.opponent)}</h3>
        </div>
        <span class="score-badge">${escapeHtml(game.score || 'Score —')}</span>
      </div>
      <div class="stat-grid">
        <span>Errors <strong>${escapeHtml(game.errors || '0')}</strong></span>
        <span>Ks <strong>${escapeHtml(game.strikeouts || '0')}</strong></span>
        <span>BB/HBP <strong>${escapeHtml(game.walksHbp || '0')}</strong></span>
        <span>SB <strong>${escapeHtml(game.stolenBases || '0')}</strong></span>
      </div>
      <p>${escapeHtml(game.notes || 'No team notes yet.')}</p>
      <div class="player-actions">
        <button class="ghost-button" type="button" data-action="edit-game">Edit</button>
        <button class="danger-button" type="button" data-action="delete-game">Delete</button>
      </div>
    </article>
  `).join('');

  list.querySelectorAll('[data-action="edit-game"]').forEach((button) => {
    button.addEventListener('click', () => {
      const game = findGameFromButton(button);
      if (game) openGameForm(game);
    });
  });

  list.querySelectorAll('[data-action="delete-game"]').forEach((button) => {
    button.addEventListener('click', () => {
      const game = findGameFromButton(button);
      if (!game) return;
      appData.games = appData.games.filter((item) => item.id !== game.id);
      saveData();
      renderGames();
    });
  });
}

function findGameFromButton(button) {
  const id = button.closest('[data-game-id]')?.dataset.gameId;
  return appData.games.find((game) => game.id === id);
}

function initGoals() {
  renderGoalProgress();
}

function renderGoalProgress() {
  const list = document.querySelector('#goalProgress');
  if (!list) return;
  const goals = appData.forms.seasonGoals ?? {};
  const items = [
    goalItem('Errors under 30', progressReverse(toNumber(goals.currentErrors, 57), 57, 30), `${goals.currentErrors || 57} current / under 30`),
    goalItem('Strikeouts goal', progressForward(toNumber(goals.strikeoutsCurrent, 0), toNumber(goals.strikeoutsGoal, 80)), `${goals.strikeoutsCurrent || 0} / ${goals.strikeoutsGoal || 80}`),
    goalItem('Walks/HBP goal', progressForward(toNumber(goals.walksHbpCurrent, 0), toNumber(goals.walksHbpGoal, 60)), `${goals.walksHbpCurrent || 0} / ${goals.walksHbpGoal || 60}`),
    goalItem('Stolen bases goal', progressForward(toNumber(goals.stolenBaseCurrent, 0), toNumber(goals.stolenBaseGoal, 40)), `${goals.stolenBaseCurrent || 0} / ${goals.stolenBaseGoal || 40}`),
    goalItem('Team batting average', progressForward(toNumber(goals.teamBattingAverage, 0), toNumber(goals.teamBattingAverageGoal, 0.3)), `${goals.teamBattingAverage || '.000'} / ${goals.teamBattingAverageGoal || '.300'}`),
  ];
  list.innerHTML = items.join('');
}

function goalItem(label, percent, detail) {
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
  return `
    <article class="card goal-progress-card">
      <div class="player-card-header">
        <h3>${escapeHtml(label)}</h3>
        <span class="score-badge">${safePercent}%</span>
      </div>
      <div class="progress-track"><span style="width: ${safePercent}%"></span></div>
      <p class="muted-copy">${escapeHtml(detail)}</p>
    </article>
  `;
}

function progressForward(current, goal) {
  if (!Number.isFinite(current) || !Number.isFinite(goal) || !goal) return 0;
  return (current / goal) * 100;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function progressReverse(current, start, target) {
  if (!Number.isFinite(current)) return 0;
  if (current <= target) return 100;
  if (current >= start) return 0;
  return ((start - current) / (start - target)) * 100;
}

function initCulture() {
  document.querySelectorAll('.phrase-card').forEach((button) => {
    button.addEventListener('click', async () => {
      const phrase = button.textContent.trim();
      try {
        await navigator.clipboard.writeText(phrase);
        button.classList.add('copied');
        window.setTimeout(() => button.classList.remove('copied'), 900);
      } catch {
        button.classList.toggle('copied');
      }
    });
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function initBackup() {
  document.querySelector('#exportButton').addEventListener('click', () => {
    const backup = JSON.stringify({ exportedAt: new Date().toISOString(), data: appData }, null, 2);
    document.querySelector('#backupText').value = backup;
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shs-jv-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Backup exported. Save the JSON file somewhere safe.');
  });

  document.querySelector('#importInput').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      appData = mergeData(parsed.data ?? parsed);
      saveData();
      setStatus('Backup imported. Reloading your coach data…');
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      console.error(error);
      setStatus('Import failed. Please choose a valid coach backup JSON file.');
    } finally {
      event.target.value = '';
    }
  });
}

function initPwaInstall() {
  const installButton = document.querySelector('#installButton');

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('service-worker.js?v=6', { updateViaCache: 'none' });
        await registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      } catch (error) {
        console.warn('Service worker registration failed.', error);
      }
    });
  }
}

initToday();
initTabs();
initStoredFields();
initPlayers();
initGames();
initGoals();
initCulture();
initBackup();
initPwaInstall();
