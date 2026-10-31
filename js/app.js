/* ============================================================
   VOYAGER — App de Lista de Viagens (com Supabase)
   ============================================================ */

const SUPABASE_URL = 'https://nuoerapkkdeyikhvidkg.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_hdwx8ayhwaQaTDG21-WldA_PuGev_ew';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const THEME_KEY = 'voyager_theme';

const TEMPLATES = {
  praia: {
    '📄 Documentos': ['Passaporte / RG', 'Passagem', 'Seguro viagem', 'Cartão de crédito'],
    '👔 Roupas': ['Biquíni / Sunga', 'Camisetas', 'Shorts', 'Roupa de dormir', 'Chinelo', 'Chapéu'],
    '🧴 Higiene': ['Protetor solar', 'Repelente', 'Escova de dente', 'Shampoo', 'Condicionador'],
    '💊 Saúde': ['Remédios pessoais', 'Kit primeiros socorros'],
    '🔌 Eletrônicos': ['Celular + carregador', 'Power bank', 'Câmera', 'Fones de ouvido'],
    '🎒 Extras': ['Óculos de sol', 'Livro', 'Toalha de praia', 'Garrafa de água']
  },
  negocios: {
    '📄 Documentos': ['Passaporte / RG', 'Passagem', 'Cartão de visita', 'Pasta de documentos'],
    '👔 Roupas': ['Terno / Blazer', 'Camisa social', 'Sapato social', 'Gravata', 'Roupa de dormir'],
    '🧴 Higiene': ['Kit de barbear', 'Escova de dente', 'Perfume', 'Desodorante'],
    '💊 Saúde': ['Remédios pessoais', 'Analgésico'],
    '💼 Trabalho': ['Notebook', 'Carregador notebook', 'Mouse', 'Pendrive', 'Adaptador'],
    '🔌 Eletrônicos': ['Celular + carregador', 'Power bank', 'Fones de ouvido'],
    '🎒 Extras': ['Mala de mão', 'Cadeado para mala']
  },
  aventura: {
    '📄 Documentos': ['Passaporte / RG', 'Seguro viagem', 'Carteira de vacinação'],
    '👔 Roupas': ['Roupas térmicas', 'Jaqueta impermeável', 'Botas de trilha', 'Meias extras', 'Boné'],
    '🧴 Higiene': ['Escova de dente', 'Sabonete biodegradável', 'Protetor solar'],
    '💊 Saúde': ['Kit primeiros socorros', 'Remédios pessoais', 'Repelente'],
    '🔌 Eletrônicos': ['Celular + carregador', 'Power bank', 'Lanterna', 'GPS'],
    '🎒 Extras': ['Mochila', 'Cantil', 'Canivete', 'Cordas', 'Saco de dormir']
  },
  cidade: {
    '📄 Documentos': ['Passaporte / RG', 'Passagem', 'Cartão de transporte', 'Seguro viagem'],
    '👔 Roupas': ['Roupas casuais', 'Jaqueta leve', 'Tênis confortável', 'Roupa de dormir'],
    '🧴 Higiene': ['Escova de dente', 'Shampoo', 'Desodorante'],
    '💊 Saúde': ['Remédios pessoais'],
    '🔌 Eletrônicos': ['Celular + carregador', 'Câmera', 'Adaptador de tomada'],
    '🎒 Extras': ['Guarda-chuva', 'Mochila pequena', 'Guia turístico']
  }
};

const WEATHER_CODES = {
  0: { icon: '☀️', desc: 'Céu limpo' }, 1: { icon: '🌤️', desc: 'Principalmente limpo' }, 2: { icon: '⛅', desc: 'Parcialmente nublado' }, 3: { icon: '☁️', desc: 'Nublado' },
  45: { icon: '🌫️', desc: 'Neblina' }, 51: { icon: '🌦️', desc: 'Garoa leve' }, 53: { icon: '🌦️', desc: 'Garoa' }, 55: { icon: '🌧️', desc: 'Garoa forte' },
  61: { icon: '🌧️', desc: 'Chuva leve' }, 63: { icon: '🌧️', desc: 'Chuva' }, 65: { icon: '🌧️', desc: 'Chuva forte' }, 80: { icon: '🌦️', desc: 'Pancadas' }, 81: { icon: '🌧️', desc: 'Pancadas fortes' }, 95: { icon: '⛈️', desc: 'Trovoada' }
};

let currentUser = null;
let trips = [];
let currentTripId = null;
let currentSearchTerm = '';
let openCategories = new Set();
let weatherCache = {};
let editingCategoryOldName = null;

function uid() { return crypto.randomUUID(); }
function formatDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function getTripProgress(trip) {
  let total = 0, done = 0;
  Object.values(trip.items || {}).forEach(cat => cat.forEach(item => { total++; if (item.done) done++; }));
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function getCurrentTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
function syncThemeIcon() {
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = getCurrentTheme() === 'light' ? '☀️' : '🌙';
  const meta = document.getElementById('themeColorMeta');
  if (meta) meta.setAttribute('content', getCurrentTheme() === 'light' ? '#FAF7F2' : '#0A0A0F');
}
function toggleTheme() {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  syncThemeIcon();
}

async function handleSignUp(e) {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) { alert('Erro ao cadastrar: ' + error.message); return; }
  if (data.user && !data.session) {
    const { error: loginError } = await db.auth.signInWithPassword({ email, password });
    if (loginError) { alert('Cadastro ok, mas erro ao logar. Tente fazer login manualmente.'); return; }
  }
  showApp();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) { alert('Erro ao entrar: ' + error.message); return; }
  showApp();
}

async function handleLogout() {
  await db.auth.signOut();
  currentUser = null;
  trips = [];
  showAuth();
}

async function handleRecoverPassword(e) {
  e.preventDefault();
  const email = document.getElementById('recoverEmail').value.trim();
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
  if (error) { alert('Erro: ' + error.message); }
  else { alert('Se o e-mail existir, um link de recuperação foi enviado.'); }
  showLogin();
}

async function handleSaveNewPassword() {
  const newPassword = document.getElementById('resetPasswordInput').value;
  if (newPassword.length < 6) { alert('A senha deve ter no mínimo 6 caracteres.'); return; }
  const { error } = await db.auth.updateUser({ password: newPassword });
  if (error) { alert('Erro ao atualizar: ' + error.message); }
  else { alert('Senha atualizada com sucesso!'); document.getElementById('resetPasswordModal').classList.add('hidden'); history.replaceState(null, '', window.location.pathname); showApp(); }
}

async function handleChangePasswordInsideApp() {
  const newPassword = document.getElementById('newPasswordInput').value;
  if (newPassword.length < 6) { alert('A senha deve ter no mínimo 6 caracteres.'); return; }
  const { error } = await db.auth.updateUser({ password: newPassword });
  if (error) { alert('Erro: ' + error.message); }
  else { alert('Senha alterada com sucesso!'); document.getElementById('newPasswordInput').value = ''; document.getElementById('accountModal').classList.add('hidden'); }
}

function showAuth() { document.getElementById('authScreen').classList.remove('hidden'); document.getElementById('appScreen').classList.add('hidden'); }
function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  if (currentUser) {
    document.getElementById('userEmailDisplay').textContent = currentUser.email;
    document.getElementById('modalUserEmail').textContent = currentUser.email;
    fetchTrips();
  }
  showView('dashboard');
}

function showLogin() { document.getElementById('loginView').classList.remove('hidden'); document.getElementById('registerView').classList.add('hidden'); document.getElementById('recoverView').classList.add('hidden'); }
function showRegister() { document.getElementById('loginView').classList.add('hidden'); document.getElementById('registerView').classList.remove('hidden'); document.getElementById('recoverView').classList.add('hidden'); }
function showRecover() { document.getElementById('loginView').classList.add('hidden'); document.getElementById('registerView').classList.add('hidden'); document.getElementById('recoverView').classList.remove('hidden'); }

async function fetchTrips() {
  if (!currentUser) return;
  const { data, error } = await db.from('trips').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Erro ao buscar viagens:', error); return; }
  trips = data || [];
  renderDashboard();
}

async function saveTripToSupabase(trip) {
  const { data, error } = await db.from('trips').upsert({
    id: trip.id, user_id: currentUser.id, name: trip.name, destination: trip.destination,
    start_date: trip.start_date, end_date: trip.end_date, type: trip.type, items: trip.items
  }).select().single();
  if (error) { console.error('Erro ao salvar:', error); alert('Erro ao salvar viagem.'); }
  else {
    const idx = trips.findIndex(t => t.id === trip.id);
    if (idx >= 0) trips[idx] = data; else trips.unshift(data);
  }
}

async function deleteTripFromSupabase(tripId) {
  const { error } = await db.from('trips').delete().eq('id', tripId);
  if (error) { console.error('Erro ao excluir:', error); return false; }
  return true;
}

function showView(name) {
  document.querySelectorAll('.main').forEach(el => el.classList.add('hidden'));
  const view = document.getElementById('view-' + name);
  if (view) view.classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.view === name); });
  if (name === 'dashboard') renderDashboard();
  if (name === 'stats') renderStats();
}

function renderDashboard() {
  const grid = document.getElementById('tripsGrid');
  const empty = document.getElementById('emptyTrips');
  grid.innerHTML = '';
  if (trips.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  trips.forEach(trip => {
    const { total, done, pct } = getTripProgress(trip);
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.innerHTML = `
      <button class="trip-card-delete" data-id="${trip.id}">✕</button>
      <div class="trip-card-name">${escapeHtml(trip.name)}</div>
      <div class="trip-card-dest">📍 ${escapeHtml(trip.destination)}</div>
      <div class="trip-card-dates">${formatDate(trip.start_date)} → ${formatDate(trip.end_date)}</div>
      <div class="trip-card-progress"><div class="trip-card-progress-fill" style="width:${pct}%"></div></div>
      <div class="trip-card-dates" style="margin-top:10px;">${done}/${total} itens • ${pct}%</div>
    `;
    card.addEventListener('click', (e) => { if (e.target.classList.contains('trip-card-delete')) return; openTrip(trip.id); });
    card.querySelector('.trip-card-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Excluir viagem "${trip.name}"?`)) {
        if (await deleteTripFromSupabase(trip.id)) { trips = trips.filter(t => t.id !== trip.id); renderDashboard(); }
      }
    });
    grid.appendChild(card);
  });
}

async function createTrip(data) {
  const items = {};
  const template = TEMPLATES[data.type] || TEMPLATES.cidade;
  Object.entries(template).forEach(([cat, list]) => { items[cat] = list.map(label => ({ id: uid(), label, done: false })); });
  const trip = { id: uid(), ...data, items, created_at: new Date().toISOString() };
  await saveTripToSupabase(trip);
  return trip;
}

function openTrip(id) {
  currentTripId = id;
  openCategories.clear();
  currentSearchTerm = '';
  document.getElementById('searchInput').value = '';
  renderTripDetail();
  showView('tripdetail');
}

function renderTripDetail() {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;
  document.getElementById('detailTitle').textContent = trip.name;
  document.getElementById('detailSub').textContent = `📍 ${trip.destination} • ${formatDate(trip.start_date)} → ${formatDate(trip.end_date)}`;
  
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

  Object.entries(trip.items || {}).forEach(([catName, items]) => {
    const cat = document.createElement('div');
    cat.className = 'category';
    cat.dataset.catName = catName;
    const doneCount = items.filter(i => i.done).length;

    cat.innerHTML = `
      <div class="category-header">
        <div class="category-title">${escapeHtml(catName)}<span class="category-count">${doneCount}/${items.length}</span></div>
        <div class="category-actions">
          <button class="cat-action-btn edit" data-cat="${escapeHtml(catName)}">✏️</button>
          <button class="cat-action-btn delete" data-cat="${escapeHtml(catName)}">🗑️</button>
        </div>
        <span class="category-toggle">▾</span>
      </div>
      <div class="category-items"></div>
    `;

    cat.querySelector('.category-header').addEventListener('click', (e) => {
      if (e.target.closest('.category-actions')) return;
      cat.classList.toggle('open');
      if (!currentSearchTerm) {
        if (cat.classList.contains('open')) openCategories.add(catName); else openCategories.delete(catName);
      }
    });

    cat.querySelector('.cat-action-btn.edit').addEventListener('click', (e) => { e.stopPropagation(); openCategoryModal('edit', catName); });
    cat.querySelector('.cat-action-btn.delete').addEventListener('click', (e) => { e.stopPropagation(); deleteCategory(catName); });

    const itemsContainer = cat.querySelector('.category-items');
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'item-row' + (item.done ? ' done' : '');
      row.innerHTML = `<input type="checkbox" class="item-checkbox" ${item.done ? 'checked' : ''} /><label class="item-label">${escapeHtml(item.label)}</label><button class="item-delete">✕</button>`;
      row.querySelector('.item-checkbox').addEventListener('change', async (e) => {
        item.done = e.target.checked;
        row.classList.toggle('done', item.done);
        await saveTripToSupabase(trip);
        updateProgress(); updateCategoryCount(cat, catName);
        if (currentSearchTerm) applySearch();
      });
      row.querySelector('.item-delete').addEventListener('click', async () => {
        trip.items[catName] = trip.items[catName].filter(i => i.id !== item.id);
        await saveTripToSupabase(trip); renderTripDetail();
      });
      itemsContainer.appendChild(row);
    });

    const addRow = document.createElement('div');
    addRow.className = 'add-item-row';
    addRow.innerHTML = `<input type="text" class="add-item-input" placeholder="Adicionar item..." /><button class="add-item-btn">+</button>`;
    const input = addRow.querySelector('.add-item-input');
    const addItem = async () => {
      const val = input.value.trim(); if (!val) return;
      trip.items[catName].push({ id: uid(), label: val, done: false });
      await saveTripToSupabase(trip); renderTripDetail();
    };
    addRow.querySelector('.add-item-btn').addEventListener('click', addItem);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addItem(); });
    itemsContainer.appendChild(addRow);
    container.appendChild(cat);
  });
  updateProgress(); applySearch(); loadWeather(trip.destination);
}

function updateCategoryCount(catEl, catName) {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;
  const items = trip.items[catName] || [];
  const done = items.filter(i => i.done).length;
  catEl.querySelector('.category-count').textContent = `${done}/${items.length}`;
}
function updateProgress() {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;
  const { total, done, pct } = getTripProgress(trip);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${done} / ${total}`;
}

function openCategoryModal(mode, catName = '') {
  document.getElementById('categoryModalTitle').textContent = mode === 'edit' ? 'Renomear Categoria' : 'Nova Categoria';
  document.getElementById('categoryNameInput').value = mode === 'edit' ? catName : '';
  editingCategoryOldName = mode === 'edit' ? catName : null;
  document.getElementById('categoryModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('categoryNameInput').focus(), 100);
}
function closeCategoryModal() { document.getElementById('categoryModal').classList.add('hidden'); editingCategoryOldName = null; }
async function saveCategory() {
  const newName = document.getElementById('categoryNameInput').value.trim();
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip || !newName) return;
  if (editingCategoryOldName) {
    if (newName === editingCategoryOldName) { closeCategoryModal(); return; }
    if (trip.items[newName]) { alert('Já existe.'); return; }
    const newItems = {};
    Object.entries(trip.items).forEach(([k, v]) => { newItems[k === editingCategoryOldName ? newName : k] = v; });
    trip.items = newItems;
  } else {
    if (trip.items[newName]) { alert('Já existe.'); return; }
    trip.items[newName] = [];
  }
  await saveTripToSupabase(trip); closeCategoryModal(); renderTripDetail();
}
async function deleteCategory(catName) {
  const trip = trips.find(t => t.id === currentTripId);
  if (!trip) return;
  if (confirm(`Excluir "${catName}" e seus itens?`)) {
    delete trip.items[catName];
    await saveTripToSupabase(trip); renderTripDetail();
  }
}

function generateSmartSuggestions(trip, weatherData) {
  const suggestions = [];
  const allLabels = Object.values(trip.items).flat().map(i => i.label.toLowerCase());
  function addSuggestion(category, label, reason) {
    if (!allLabels.includes(label.toLowerCase()) && !suggestions.find(s => s.label.toLowerCase() === label.toLowerCase())) suggestions.push({ category, label, reason });
  }
  if (weatherData) {
    const daily = weatherData.daily;
    const maxTemp = Math.max(...daily.temperature_2m_max);
    const minTemp = Math.min(...daily.temperature_2m_min);
    const hasRain = daily.weather_code.some(c => (c >= 51 && c <= 65) || (c >= 80 && c <= 82));
    if (maxTemp > 26) { addSuggestion('🧴 Higiene', 'Protetor solar', 'Previsão de calor (acima de 26°C)'); addSuggestion('🎒 Extras', 'Garrafa de água', 'Previsão de calor'); }
    if (minTemp < 15) { addSuggestion('👔 Roupas', 'Casaco / Jaqueta', 'Previsão de frio (abaixo de 15°C)'); }
    if (hasRain) { addSuggestion('🎒 Extras', 'Guarda-chuva', 'Previsão de chuva no destino'); addSuggestion('👔 Roupas', 'Calçado impermeável', 'Previsão de chuva'); }
  }
  if (trip.type === 'praia') { addSuggestion('🎒 Extras', 'Toalha de praia', 'Essencial para viagem de praia'); addSuggestion('🧴 Higiene', 'Repelente', 'Destinos litorâneos costumam ter insetos'); }
  else if (trip.type === 'negocios') { addSuggestion('💼 Trabalho', 'Cartão de visita', 'Essencial para viagem de negócios'); }
  else if (trip.type === 'aventura') { addSuggestion('💊 Saúde', 'Kit primeiros socorros', 'Segurança em aventuras'); }
  return suggestions;
}

function renderAIAssistant(trip, weatherData) {
  const container = document.getElementById('aiAssistant');
  const list = document.getElementById('aiSuggestions');
  if (!container || !list) return;
  const suggestions = generateSmartSuggestions(trip, weatherData);
  if (suggestions.length === 0) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden'); list.innerHTML = '';
  suggestions.forEach(sug => {
    const el = document.createElement('div');
    el.className = 'ai-item';
    el.innerHTML = `<div class="ai-item-info"><div class="ai-item-label">${escapeHtml(sug.label)}</div><div class="ai-item-reason">${escapeHtml(sug.reason)}</div></div><button class="ai-item-add" data-cat="${escapeHtml(sug.category)}" data-label="${escapeHtml(sug.label)}">+ Adicionar</button>`;
    el.querySelector('.ai-item-add').addEventListener('click', async (e) => {
      const cat = e.target.getAttribute('data-cat'), label = e.target.getAttribute('data-label');
      if (!trip.items[cat]) trip.items[cat] = [];
      trip.items[cat].push({ id: uid(), label, done: false });
      await saveTripToSupabase(trip); renderTripDetail();
    });
    list.appendChild(el);
  });
}

async function geocodeDestination(destination, signal) {
  const attempts = [], seen = new Set();
  function addAttempt(s) { const trimmed = String(s || '').trim(); if (trimmed && !seen.has(trimmed.toLowerCase())) { seen.add(trimmed.toLowerCase()); attempts.push(trimmed); } }
  addAttempt(destination); destination.split(',').map(p => p.trim()).filter(Boolean).forEach(addAttempt);
  const words = destination.split(/\s+/).filter(Boolean); if (words.length > 1) addAttempt(words.slice(0, -1).join(' '));
  for (const attempt of attempts) {
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(attempt)}&count=1&language=pt&format=json`, { signal });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results?.length > 0) return { latitude: data.results[0].latitude, longitude: data.results[0].longitude, name: data.results[0].name, country: data.results[0].country };
    } catch (err) { if (err.name === 'AbortError') throw err; }
  }
  return null;
}

async function loadWeather(destination) {
  const titleEl = document.getElementById('weatherTitle'), iconEl = document.getElementById('weatherIcon'), tempEl = document.getElementById('weatherTemp'), descEl = document.getElementById('weatherDesc'), forecastEl = document.getElementById('weatherForecast'), trip = trips.find(t => t.id === currentTripId);
  if (!titleEl || !trip) return;
  if (weatherCache[destination]) { renderWeather(weatherCache[destination]); renderAIAssistant(trip, weatherCache[destination].weather); return; }
  document.getElementById('weatherCard').classList.remove('hidden');
  titleEl.innerHTML = `🌤️ Buscando clima em <strong>${escapeHtml(destination)}</strong>...`; iconEl.textContent = '⏳'; tempEl.textContent = '--°C'; descEl.textContent = 'Carregando...'; forecastEl.innerHTML = `<div class="weather-loading">Consultando previsão...</div>`;
  try {
    const geo = await geocodeDestination(destination, new AbortController().signal);
    if (!geo) throw new Error('Destino não encontrado');
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`);
    const weatherData = await res.json();
    weatherCache[destination] = { geo, weather: weatherData, typedDestination: destination };
    renderWeather(weatherCache[destination]); renderAIAssistant(trip, weatherData);
  } catch (err) {
    titleEl.innerHTML = `🌤️ Clima em <strong>${escapeHtml(destination)}</strong>`; iconEl.textContent = '⚠️'; tempEl.textContent = '--°C'; descEl.textContent = 'Clima indisponível'; forecastEl.innerHTML = `<div class="weather-error">${escapeHtml(err.message)}</div>`; renderAIAssistant(trip, null);
  }
}

function renderWeather(payload) {
  const { geo, weather, typedDestination } = payload;
  document.getElementById('weatherCard').classList.remove('hidden');
  document.getElementById('weatherTitle').innerHTML = `🌤️ Clima em <strong>${escapeHtml(geo.name || typedDestination)}${geo.country ? ', ' + escapeHtml(geo.country) : ''}</strong>`;
  const current = weather.current; if (!current) return;
  const info = WEATHER_CODES[current.weather_code] || { icon: '🌡️', desc: 'Desconhecido' };
  document.getElementById('weatherIcon').textContent = info.icon; document.getElementById('weatherTemp').textContent = `${Math.round(current.temperature_2m)}°C`; document.getElementById('weatherDesc').textContent = info.desc;
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; let html = '';
  for (let i = 0; i < weather.daily.time.length; i++) {
    const date = new Date(weather.daily.time[i] + 'T12:00:00');
    const dInfo = WEATHER_CODES[weather.daily.weather_code[i]] || { icon: '🌡️' };
    html += `<div class="forecast-day"><div class="forecast-date">${i === 0 ? 'Hoje' : days[date.getDay()]}</div><div class="forecast-icon">${dInfo.icon}</div><div class="forecast-temps"><span class="max">${Math.round(weather.daily.temperature_2m_max[i])}°</span> <span class="min">${Math.round(weather.daily.temperature_2m_min[i])}°</span></div></div>`;
  }
  document.getElementById('weatherForecast').innerHTML = html;
}

function applySearch() {
  const input = document.getElementById('searchInput'); if (!input) return;
  const term = input.value.toLowerCase().trim(); currentSearchTerm = term;
  let totalVisible = 0;
  document.querySelectorAll('.category').forEach(cat => {
    let visible = 0;
    cat.querySelectorAll('.item-row').forEach(row => {
      const matches = !term || row.querySelector('.item-label').textContent.toLowerCase().includes(term);
      row.style.display = matches ? '' : 'none'; if (matches) visible++;
    });
    cat.style.display = (term && visible === 0) ? 'none' : ''; totalVisible += visible;
    if (term) cat.classList.toggle('open', visible > 0); else cat.classList.toggle('open', openCategories.has(cat.dataset.catName));
  });
  document.getElementById('searchEmpty').classList.toggle('hidden', !(term && totalVisible === 0));
}

function renderStats() {
  const container = document.getElementById('statsContainer'); if (!container) return;
  if (trips.length === 0) { container.innerHTML = `<p class="empty-state">Você ainda não tem viagens. Crie a primeira para ver as estatísticas! ✨</p>`; return; }
  let totalItems = 0, doneItems = 0; const catCount = {}; let nextTrip = null;
  const today = new Date(); today.setHours(0,0,0,0);
  trips.forEach(trip => {
    Object.entries(trip.items || {}).forEach(([cat, items]) => { catCount[cat] = (catCount[cat] || 0) + items.length; items.forEach(item => { totalItems++; if (item.done) doneItems++; }); });
    if (trip.start_date) { const d = new Date(trip.start_date + 'T00:00:00'); if (d >= today && (!nextTrip || d < new Date(nextTrip.start_date + 'T00:00:00'))) nextTrip = trip; }
  });
  const pct = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);
  const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let nextHtml = nextTrip ? `<div class="stat-card highlight"><div class="stat-icon">✈️</div><div class="stat-number" style="font-size: 24px;">${escapeHtml(nextTrip.name)}</div><div class="stat-label">Sua próxima viagem</div><div class="stat-detail">${formatDate(nextTrip.start_date)} • ${escapeHtml(nextTrip.destination)}</div></div>` : `<div class="stat-card"><div class="stat-icon">🏖️</div><div class="stat-number" style="font-size: 20px;">Nenhuma</div><div class="stat-label">Próxima viagem</div></div>`;
  let barsHtml = ''; if (topCats.length > 0) { const maxVal = topCats[0][1]; topCats.forEach(([cat, count]) => { barsHtml += `<div class="stat-bar-item"><div class="stat-bar-header"><span>${escapeHtml(cat)}</span><span>${count} itens</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${Math.round((count / maxVal) * 100)}%"></div></div></div>`; }); }
  container.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-icon">🌍</div><div class="stat-number">${trips.length}</div><div class="stat-label">Viagens Criadas</div></div><div class="stat-card"><div class="stat-icon">📦</div><div class="stat-number">${doneItems}</div><div class="stat-label">Itens Empacotados</div></div><div class="stat-card"><div class="stat-icon">📈</div><div class="stat-number">${pct}%</div><div class="stat-label">Taxa de Conclusão</div></div>${nextHtml}</div><div class="stats-section"><h3 class="section-title" style="font-size: 24px; margin-bottom: 24px;">🏷️ Categorias Mais Usadas</h3><div class="stat-bar-list">${barsHtml || '<p class="empty-state">Sem categorias.</p>'}</div></div>`;
}

function generateShareLink(trip) { return window.location.href.split('#')[0] + '#share=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(trip))))); }
function openShareModal() { const trip = trips.find(t => t.id === currentTripId); if (trip) { document.getElementById('shareLink').value = generateShareLink(trip); document.getElementById('shareModal').classList.remove('hidden'); } }
function closeShareModal() { document.getElementById('shareModal').classList.add('hidden'); }
function copyShareLink() { const input = document.getElementById('shareLink'); input.select(); let copied = false; try { copied = document.execCommand('copy'); } catch (e) {} if (navigator.clipboard) { navigator.clipboard.writeText(input.value).catch(() => {}); copied = true; } const btn = document.getElementById('copyLinkBtn'); const orig = btn.textContent; btn.textContent = copied ? '✓ Copiado' : '✗ Erro'; setTimeout(() => { btn.textContent = orig; }, 1500); }

function init() {
  syncThemeIcon();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  
  // Eventos de Autenticação
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleSignUp);
  document.getElementById('recoverForm').addEventListener('submit', handleRecoverPassword);
  document.getElementById('linkToRegister').addEventListener('click', (e) => { e.preventDefault(); showRegister(); });
  document.getElementById('linkToLogin').addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
  document.getElementById('linkForgotPassword').addEventListener('click', (e) => { e.preventDefault(); showRecover(); });
  document.getElementById('linkBackToLogin').addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
  document.getElementById('btnLogout').addEventListener('click', handleLogout);
  document.getElementById('btnAccount').addEventListener('click', () => document.getElementById('accountModal').classList.remove('hidden'));
  document.getElementById('closeAccountModal').addEventListener('click', () => document.getElementById('accountModal').classList.add('hidden'));
  document.getElementById('btnChangePassword').addEventListener('click', handleChangePasswordInsideApp);
  document.getElementById('btnSaveNewPassword').addEventListener('click', handleSaveNewPassword);

  // Eventos de Navegação
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
  document.getElementById('btnNewTripFromHero').addEventListener('click', () => showView('newtrip'));
  document.getElementById('btnBack').addEventListener('click', () => showView('dashboard'));

  // NOVOS EVENTOS: RODAPÉ (Ajuda, Sobre, Políticas, Contato)
  document.getElementById('linkHelp').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('helpModal').classList.remove('hidden'); });
  document.getElementById('closeHelpModal').addEventListener('click', () => document.getElementById('helpModal').classList.add('hidden'));

  document.getElementById('linkAbout').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('aboutModal').classList.remove('hidden'); });
  document.getElementById('closeAboutModal').addEventListener('click', () => document.getElementById('aboutModal').classList.add('hidden'));

  document.getElementById('linkPolicies').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('policiesModal').classList.remove('hidden'); });
  document.getElementById('closePoliciesModal').addEventListener('click', () => document.getElementById('policiesModal').classList.add('hidden'));

  document.getElementById('linkContact').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('contactModal').classList.remove('hidden'); });
  document.getElementById('closeContactModal').addEventListener('click', () => document.getElementById('contactModal').classList.add('hidden'));

  // Eventos de Modais do App
  document.getElementById('btnShare').addEventListener('click', openShareModal);
  document.getElementById('closeShareModal').addEventListener('click', closeShareModal);
  document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);
  document.getElementById('shareModal').addEventListener('click', (e) => { if (e.target.id === 'shareModal') closeShareModal(); });
  document.getElementById('btnAddCategory').addEventListener('click', () => openCategoryModal('create'));
  document.getElementById('cancelCategoryBtn').addEventListener('click', closeCategoryModal);
  document.getElementById('saveCategoryBtn').addEventListener('click', saveCategory);
  document.getElementById('categoryNameInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveCategory(); } });
  document.getElementById('categoryModal').addEventListener('click', (e) => { if (e.target.id === 'categoryModal') closeCategoryModal(); });

  // Form de Nova Viagem
  document.getElementById('tripForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('tripName').value.trim(), destination = document.getElementById('tripDest').value.trim(), start_date = document.getElementById('tripStart').value, end_date = document.getElementById('tripEnd').value, type = document.getElementById('tripType').value;
    if (new Date(end_date) < new Date(start_date)) { alert('A data de volta não pode ser antes da ida.'); return; }
    const trip = await createTrip({ name, destination, start_date, end_date, type });
    document.getElementById('tripForm').reset(); openTrip(trip.id);
  });

  document.getElementById('searchInput').addEventListener('input', applySearch);
  document.getElementById('searchClear').addEventListener('click', () => { document.getElementById('searchInput').value = ''; applySearch(); document.getElementById('searchInput').focus(); });

  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') document.getElementById('resetPasswordModal').classList.remove('hidden');
    currentUser = session?.user || null;
    if (currentUser) showApp(); else showAuth();
  });

  db.auth.getSession().then(({ data: { session } }) => {
    currentUser = session?.user || null;
    if (currentUser) showApp(); else showAuth();
  });
}

document.addEventListener('DOMContentLoaded', init);