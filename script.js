// === Supabase configuration ===
// Replace these with your own project values if needed (these are already yours)
const SUPABASE_URL = 'https://vvfcrkihgrkasklxraar.supabase.co';
const SUPABASE_KEY = 'sb_publishable_I_I1gJQyG_z3cMBkdxim8A_emBYwgiI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === State ===
let currentCategory = 'all';
let currentSearch = '';

// === DOM elements ===
const resultsEl = document.getElementById('results');
const searchInput = document.getElementById('searchInput');
const categoryButtons = document.querySelectorAll('.category-btn');
const randomBtn = document.getElementById('randomBtn');

// === Render functions ===
function renderResults(items) {
  if (!items || items.length === 0) {
    resultsEl.innerHTML = '<p class="no-results">No encontré nada con eso. Prueba otra búsqueda 🔍</p>';
    return;
  }

  resultsEl.innerHTML = items.map((item, index) => `
    <div class="card" style="animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.5 + index * 0.06}s both;">
      ${item.image_url ? `<img src="${item.image_url}" alt="${escapeHtml(item.category)}" loading="lazy">` : ''}
      <div class="card-body">
        <span class="card-category">${escapeHtml(item.category)}</span>
        <p class="card-text">${escapeHtml(item.text)}</p>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// === Data fetching ===
async function fetchCuriosities() {
  resultsEl.innerHTML = '<div class="loading-spinner"></div><p class="loading">Buscando curiosidades...</p>';

  let query = supabaseClient.from('curiosities').select('*').order('created_at', { ascending: false });

  if (currentCategory !== 'all') {
    query = query.eq('category', currentCategory);
  }

  if (currentSearch.trim() !== '') {
    // Full-text search using the search_vector column
    query = query.textSearch('search_vector', currentSearch.trim(), {
      type: 'websearch',
      config: 'spanish'
    });
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Error fetching curiosities:', error);
    resultsEl.innerHTML = '<p class="no-results">Hubo un error cargando los datos 😕</p>';
    return;
  }

  renderResults(data);
}

async function fetchRandom() {
  resultsEl.innerHTML = '<div class="loading-spinner"></div><p class="loading">Descubriendo algo especial...</p>';

  // Fetch all ids first (lightweight), then pick one randomly
  let query = supabaseClient.from('curiosities').select('id');

  if (currentCategory !== 'all') {
    query = query.eq('category', currentCategory);
  }

  const { data: ids, error: idError } = await query;

  if (idError || !ids || ids.length === 0) {
    resultsEl.innerHTML = '<p class="no-results">No hay datos disponibles 😕</p>';
    return;
  }

  const randomId = ids[Math.floor(Math.random() * ids.length)].id;

  const { data, error } = await supabaseClient
    .from('curiosities')
    .select('*')
    .eq('id', randomId)
    .single();

  if (error) {
    console.error('Error fetching random curiosity:', error);
    return;
  }

  renderResults([data]);
}

// === Event listeners ===
let debounceTimer;
searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchCuriosities, 350); // debounce to avoid spamming requests
});

categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    categoryButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    fetchCuriosities();
  });
});

randomBtn.addEventListener('click', fetchRandom);

// === Initial load ===
fetchCuriosities();