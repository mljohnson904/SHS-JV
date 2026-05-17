const STORAGE_KEY = 'shs-jv-coach-data-v1';
const AUTOSAVE_SELECTOR = '[data-store], [data-form] input, [data-form] textarea';

const defaultData = {
  fields: {},
  forms: {
    weeklyTracker: {},
    seasonGoals: {},
  },
  players: [],
};

function freshDefaultData() {
  return JSON.parse(JSON.stringify(defaultData));
}

function mergeData(data) {
  return {
    ...freshDefaultData(),
    ...data,
    fields: { ...defaultData.fields, ...(data.fields ?? {}) },
    forms: {
      weeklyTracker: { ...(data.forms?.weeklyTracker ?? {}) },
      seasonGoals: { ...(data.forms?.seasonGoals ?? {}) },
    },
    players: Array.isArray(data.players) ? data.players : [],
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
  document.querySelector('#todayDate').textContent = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
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
  }

  saveData();
}

function initPlayers() {
  document.querySelector('#addPlayerButton').addEventListener('click', () => openPlayerForm());
  document.querySelector('#cancelPlayerButton').addEventListener('click', closePlayerForm);
  document.querySelector('#playerForm').addEventListener('submit', savePlayer);
  renderPlayers();
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
  document.querySelector('#playerNotes').value = player?.notes ?? '';
  document.querySelector('#playerName').focus();
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function closePlayerForm() {
  document.querySelector('#playerForm').reset();
  document.querySelector('#playerId').value = '';
  document.querySelector('#playerForm').hidden = true;
}

function savePlayer(event) {
  event.preventDefault();
  const id = document.querySelector('#playerId').value || createId();
  const player = {
    id,
    name: document.querySelector('#playerName').value.trim(),
    grade: document.querySelector('#playerGrade').value.trim(),
    position: document.querySelector('#playerPosition').value.trim(),
    strength: document.querySelector('#playerStrength').value.trim(),
    need: document.querySelector('#playerNeed').value.trim(),
    speed: document.querySelector('#playerSpeed').value,
    confidence: document.querySelector('#playerConfidence').value,
    notes: document.querySelector('#playerNotes').value.trim(),
  };

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
}

function renderPlayers() {
  const list = document.querySelector('#playerList');
  if (!appData.players.length) {
    list.innerHTML = '<p class="empty-state">No players added yet. Add your first player card before practice.</p>';
    return;
  }

  list.innerHTML = appData.players.map((player) => `
    <article class="card player-card" data-player-id="${escapeHtml(player.id)}">
      <h3>${escapeHtml(player.name)}</h3>
      <p class="player-meta">${escapeHtml([player.grade && `Grade ${player.grade}`, player.position].filter(Boolean).join(' • ') || 'Player profile')}</p>
      <div class="rating-row">
        <span class="rating-pill">Speed: ${escapeHtml(player.speed || '—')}/5</span>
        <span class="rating-pill">Confidence: ${escapeHtml(player.confidence || '—')}/5</span>
      </div>
      <dl>
        <div><dt>Strength</dt><dd>${escapeHtml(player.strength || '—')}</dd></div>
        <div><dt>Development need</dt><dd>${escapeHtml(player.need || '—')}</dd></div>
        <div><dt>Coach notes</dt><dd>${escapeHtml(player.notes || '—')}</dd></div>
      </dl>
      <div class="player-actions">
        <button class="ghost-button" type="button" data-action="edit">Edit</button>
        <button class="danger-button" type="button" data-action="delete">Delete</button>
      </div>
    </article>
  `).join('');

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
      saveData();
      renderPlayers();
    });
  });
}

function findPlayerFromButton(button) {
  const id = button.closest('[data-player-id]')?.dataset.playerId;
  return appData.players.find((player) => player.id === id);
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
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch((error) => {
        console.warn('Service worker registration failed.', error);
      });
    });
  }
}

initToday();
initTabs();
initStoredFields();
initPlayers();
initBackup();
initPwaInstall();
