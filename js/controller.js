// ============================================================
//  Paper & Ink — Frontend Controller
//  Shared utilities used by all pages
// ============================================================

// ── Cart ID ──────────────────────────────────────────────────
function getCartId() {
  let id = sessionStorage.getItem('cart-id');
  if (!id) {
    // Try to get an anonymous ID from the user service
    fetch('/api/user/uniqueid')
      .then(r => r.json())
      .then(data => {
        sessionStorage.setItem('cart-id', data.uuid);
      })
      .catch(() => {});
    // Fallback: generate locally until service responds
    id = 'anon-' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('cart-id', id);
  }
  return id;
}

// ── Cart badge ───────────────────────────────────────────────
async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const cartId = sessionStorage.getItem('cart-id');
  if (!cartId) { badge.textContent = '0'; badge.style.display = 'none'; return; }
  try {
    const resp = await fetch(`/api/cart/cart/${cartId}`);
    if (!resp.ok) { badge.textContent = '0'; badge.style.display = 'none'; return; }
    const cart = await resp.json();
    const count = (cart.items || [])
      .filter(i => i.sku !== 'SHIP')
      .reduce((a, i) => a + i.qty, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch(e) {
    badge.textContent = '0';
    badge.style.display = 'none';
  }
}

// ── Toast ────────────────────────────────────────────────────
function showToast(message, type) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'show ' + (type || 'success');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = toast.className.replace('show', '').trim();
  }, 2800);
}

// ── Emoji icon map ────────────────────────────────────────────
const SKU_ICONS = {
  'PEN': '🖊️', 'PCL': '✏️', 'MKR': '🖍️', 'ERZ': '🩹',
  'NB':  '📔', 'PAP': '📄', 'ART': '🎨', 'OFF': '🗂️',
  'RUL': '📐', 'SHIP': '🚚'
};

function getSkuIcon(sku) {
  return SKU_ICONS[sku.split('-')[0]] || '📦';
}

// ── Product card renderer ─────────────────────────────────────
function renderProductCard(p) {
  const icon = getSkuIcon(p.sku);
  let badge = '';
  if (p.instock === 0)      badge = '<span class="p-badge badge-out">Out of stock</span>';
  else if (p.instock <= 5)  badge = `<span class="p-badge badge-low">Only ${p.instock} left</span>`;
  const instock = p.instock > 0;

  return `
    <div class="p-card">
      <a href="catalogue.html?sku=${p.sku}" class="p-card-img">
        <span class="p-card-icon">${icon}</span>
        ${badge}
      </a>
      <div class="p-card-body">
        <div class="p-card-cats">
          ${(p.categories||[]).map(c=>`<span class="pill pill-sm">${c}</span>`).join('')}
        </div>
        <a href="catalogue.html?sku=${p.sku}" class="p-card-name">${p.name}</a>
        <p class="p-card-desc">${p.description}</p>
        <div class="p-card-foot">
          <span class="p-card-price">₹${p.price.toLocaleString('en-IN')}</span>
          <button class="add-btn" ${instock ? '' : 'disabled'}
            onclick="quickAddToCart('${p.sku}','${p.name.replace(/'/g,"\\'")}',${p.instock})">
            ${instock ? 'Add' : 'Sold out'}
          </button>
        </div>
      </div>
    </div>`;
}

// ── Quick add to cart ─────────────────────────────────────────
async function quickAddToCart(sku, name, instock) {
  if (instock === 0) return;
  const cartId = getCartId();
  try {
    const resp = await fetch(`/api/cart/add/${cartId}/${sku}/1`);
    if (resp.ok) {
      showToast('✅  ' + name + ' added!', 'success');
      updateCartBadge();
    } else {
      const err = await resp.text();
      showToast('⚠️  ' + err, 'warn');
    }
  } catch(e) {
    showToast('⚠️  Cart service unavailable', 'warn');
  }
}

// ── User session helpers ──────────────────────────────────────
function getUser() {
  try { return JSON.parse(sessionStorage.getItem('user')); }
  catch(e) { return null; }
}

function updateUserIcon() {
  const icon = document.getElementById('userIcon');
  if (!icon) return;
  const user = getUser();
  if (user) {
    icon.title = 'Signed in as ' + user.name;
    icon.style.color = '#1e6641';
  }
}

// ── Auth guard helper (call on any protected page) ────────────
function requireAuth() {
  if (!sessionStorage.getItem('user')) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

// ── Run on every page ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateUserIcon();
  if (!sessionStorage.getItem('cart-id')) getCartId();
});