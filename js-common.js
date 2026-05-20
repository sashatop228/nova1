(function(){
  function money(v){
    const n = Math.round(Number(v || 0));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
  }

  function el(html){
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function safeParse(json, fallback){
    try{ return JSON.parse(json); }catch(e){ return fallback; }
  }
  function clone(value){
    return safeParse(JSON.stringify(value), null);
  }
  function slugify(text){
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/["'`]/g, '')
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '') || ('item-' + Date.now());
  }
  function formatDateTime(iso){
    try{
      return new Date(iso).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }catch(e){
      return String(iso || '');
    }
  }

  const STORE_KEY_CART = 'nova_cart';
  const STORE_KEY_USERS = 'nova_users';
  const STORE_KEY_CURRENT_USER = 'nova_current_user';
  const STORE_KEY_ORDERS = 'nova_orders';
  const STORE_KEY_STOCK = 'nova_stock_v2';
  const STORE_KEY_THEME = 'nova_theme';
  const STORE_KEY_PRODUCTS = 'nova_products_v1';
  const STORE_KEY_REVIEWS = 'nova_reviews_v1';
  const STORE_KEY_RETURNS = 'nova_returns_v1';
  const STORE_KEY_CHATBOT = 'nova_chatbot_history_v1';

  const DEFAULT_ADMIN = {
    name: 'Администратор',
    email: 'admin',
    password: 'admin',
    role: 'admin',
    createdAt: '2026-04-21T00:00:00.000Z'
  };

  if(window.Data && !Array.isArray(window.Data.baseProducts)){
    window.Data.baseProducts = clone(window.Data.products || []) || [];
  }

  function normalizeTags(tags){
    if(Array.isArray(tags)) return tags.map(x => String(x || '').trim()).filter(Boolean).slice(0, 8);
    return String(tags || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 8);
  }

  function normalizeProduct(raw, fallbackId){
    const title = String(raw?.title || raw?.name || '').trim() || 'Новый товар';
    const id = String(raw?.id || fallbackId || slugify(title)).trim();
    const stockCount = Math.max(0, Number(raw?.stockCount ?? 0) || 0);
    let image = String(raw?.image || '').trim() || 'assets/img/logo.png';
    if(window.Data && typeof Data.resolveAsset === 'function') image = Data.resolveAsset(image);
    return {
      id,
      image,
      title,
      category: String(raw?.category || 'Другое').trim() || 'Другое',
      price: Math.max(0, Number(raw?.price) || 0),
      oldPrice: Math.max(0, Number(raw?.oldPrice) || 0),
      tags: normalizeTags(raw?.tags),
      material: String(raw?.material || 'Не указан').trim() || 'Не указан',
      color: String(raw?.color || 'Не указан').trim() || 'Не указан',
      inStock: stockCount > 0,
      stockCount,
      deliveryDays: Math.max(1, Number(raw?.deliveryDays) || 3),
      size: String(raw?.size || '—').trim() || '—',
      description: String(raw?.description || 'Описание пока не добавлено.').trim() || 'Описание пока не добавлено.',
      createdByAdmin: !!raw?.createdByAdmin
    };
  }

  const API_BASE = 'api';
  let _productsMap = null;
  let _productsCache = null;
  let _currentUserCache = null;

  function apiSync(method, url, data){
    try{
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, false);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      if(data !== undefined) xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
      xhr.send(data === undefined ? null : JSON.stringify(data));
      const payload = xhr.responseText ? safeParse(xhr.responseText, null) : null;
      if(xhr.status >= 200 && xhr.status < 300) return payload || { ok:true };
      return payload || { ok:false, error:'Ошибка сервера.' };
    }catch(e){
      return { ok:false, error:'Не удалось подключиться к серверу.' };
    }
  }

  function apiGet(url){ return apiSync('GET', url); }
  function apiPost(url, data){ return apiSync('POST', url, data); }

  function refreshCatalogData(force){
    if(!window.Data) window.Data = {};
    if(!force && Array.isArray(_productsCache) && _productsCache.length){
      Data.products = _productsCache.slice();
      Data.categories = [...new Set(_productsCache.map(item => item.category).filter(Boolean))].sort((a,b)=> String(a).localeCompare(String(b), 'ru'));
      return Data.products;
    }
    const response = apiGet(API_BASE + '/products/list.php');
    if(response?.ok && Array.isArray(response.products)) {
      _productsCache = response.products.map(item => normalizeProduct(item, item?.id));
      Data.products = _productsCache.slice();
      Data.categories = Array.isArray(response.categories) ? response.categories.slice() : [...new Set(_productsCache.map(item => item.category).filter(Boolean))].sort((a,b)=> String(a).localeCompare(String(b), 'ru'));
      _productsMap = new Map((Data.products || []).map(p => [String(p.id), p]));
      return Data.products;
    }
    const fallback = Array.isArray(Data.baseProducts) ? clone(Data.baseProducts) || [] : [];
    Data.products = fallback;
    Data.categories = [...new Set(fallback.map(item => item.category).filter(Boolean))].sort((a,b)=> String(a).localeCompare(String(b), 'ru'));
    _productsMap = new Map((Data.products || []).map(p => [String(p.id), p]));
    return fallback;
  }

  refreshCatalogData(true);

  function getProductById(id){
    refreshCatalogData();
    if(!_productsMap || _productsMap.size !== (Data.products || []).length){
      _productsMap = new Map((Data.products || []).map(p => [String(p.id), p]));
    }
    return _productsMap.get(String(id)) || null;
  }

  function baseStockMap(){
    refreshCatalogData();
    const map = {};
    (Data.products || []).forEach(p => { map[String(p.id)] = Math.max(0, Number(p.stockCount ?? 0) || 0); });
    return map;
  }

  function getStockMap(){ return baseStockMap(); }
  function saveStockMap(map){ return map || {}; }
  function getStock(id){ return Math.max(0, Number(getProductById(id)?.stockCount || 0)); }
  function setStock(id, qty){
    const response = apiPost(API_BASE + '/products/stock.php', { id, qty });
    if(response?.ok){ refreshCatalogData(true); updateBadges(); return Math.max(0, Number(response.stock) || 0); }
    return getStock(id);
  }

  function normalizeUser(user){
    const email = String(user?.email || '').trim();
    return {
      name: String(user?.name || email || 'Пользователь').trim() || 'Пользователь',
      email,
      password: '',
      role: user?.role === 'admin' || email === DEFAULT_ADMIN.email ? 'admin' : 'customer',
      createdAt: String(user?.createdAt || user?.created_at || new Date().toISOString())
    };
  }

  function getUsers(){ return []; }
  function saveUsers(users){ return users || []; }

  function getCurrentUser(force){
    if(!force && _currentUserCache !== null) return _currentUserCache;
    const response = apiGet(API_BASE + '/auth/me.php');
    _currentUserCache = response?.ok && response.user ? normalizeUser(response.user) : null;
    return _currentUserCache;
  }

  function isAdmin(user){
    const target = user || getCurrentUser();
    return !!target && (target.role === 'admin' || target.email === DEFAULT_ADMIN.email);
  }

  function getAllOrders(){
    const user = getCurrentUser();
    if(!user) return [];
    const endpoint = isAdmin(user) ? API_BASE + '/orders/all.php' : API_BASE + '/orders/list.php';
    const response = apiGet(endpoint);
    return response?.ok && Array.isArray(response.orders) ? response.orders : [];
  }

  function saveOrders(orders){ return orders || []; }

  function getPurchasedProducts(userEmail){
    const user = getCurrentUser();
    if(!user) return [];
    if(userEmail && String(userEmail).trim().toLowerCase() !== String(user.email).trim().toLowerCase()) return [];
    const response = apiGet(API_BASE + '/orders/purchased.php');
    return response?.ok && Array.isArray(response.items) ? response.items : [];
  }

  function hasPurchasedProduct(productId, userEmail, orderId){
    const rows = getPurchasedProducts(userEmail);
    return rows.some(row => String(row.productId) === String(productId) && (!orderId || String(row.orderId) === String(orderId)));
  }

  function normalizeReview(review){
    const product = getProductById(review?.productId);
    const status = ['pending','approved','rejected'].includes(String(review?.status || 'pending')) ? String(review.status) : 'pending';
    const rating = Math.max(1, Math.min(5, Number(review?.rating) || 5));
    return {
      id: String(review?.id || ('review-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7))),
      orderId: String(review?.orderId || ''),
      productId: String(review?.productId || ''),
      productTitle: String(review?.productTitle || product?.title || ''),
      userEmail: String(review?.userEmail || '').toLowerCase(),
      userName: String(review?.userName || 'Покупатель').trim() || 'Покупатель',
      city: String(review?.city || '').trim(),
      rating,
      text: String(review?.text || '').trim(),
      status,
      createdAt: String(review?.createdAt || new Date().toISOString())
    };
  }

  function getAllReviews(productId, status){
    const params = [];
    if(productId) params.push('productId=' + encodeURIComponent(productId));
    if(status) params.push('status=' + encodeURIComponent(status));
    const response = apiGet(API_BASE + '/reviews/list.php' + (params.length ? '?' + params.join('&') : ''));
    return response?.ok && Array.isArray(response.reviews) ? response.reviews.map(normalizeReview) : [];
  }

  function saveReviews(reviews){ return reviews || []; }

  function normalizeReturnRequest(request){
    const product = getProductById(request?.productId);
    const status = ['new','in_progress','approved','rejected'].includes(String(request?.status || 'new')) ? String(request.status) : 'new';
    return {
      id: String(request?.id || ('return-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7))),
      orderId: String(request?.orderId || ''),
      productId: String(request?.productId || ''),
      productTitle: String(request?.productTitle || product?.title || ''),
      userEmail: String(request?.userEmail || '').toLowerCase(),
      userName: String(request?.userName || 'Покупатель').trim() || 'Покупатель',
      reason: String(request?.reason || 'Брак').trim() || 'Брак',
      comment: String(request?.comment || '').trim(),
      contact: String(request?.contact || '').trim(),
      status,
      createdAt: String(request?.createdAt || new Date().toISOString())
    };
  }

  function getAllReturnRequests(){
    const response = apiGet(API_BASE + '/returns/list.php');
    return response?.ok && Array.isArray(response.requests) ? response.requests.map(normalizeReturnRequest) : [];
  }

  function saveReturnRequests(requests){ return requests || []; }

  const Store = {
    register(name, email, password){
      const response = apiPost(API_BASE + '/auth/register.php', { name, email, password });
      if(response?.ok) _currentUserCache = normalizeUser(response.user);
      updateBadges();
      return response?.ok ? { ok:true, user:_currentUserCache } : { ok:false, error:response?.error || 'Не удалось зарегистрироваться.' };
    },
    login(email, password){
      const response = apiPost(API_BASE + '/auth/login.php', { email, password });
      if(response?.ok) _currentUserCache = normalizeUser(response.user);
      updateBadges();
      return response?.ok ? { ok:true, user:_currentUserCache } : { ok:false, error:response?.error || 'Неверный логин или пароль.' };
    },
    logout(){
      apiPost(API_BASE + '/auth/logout.php', {});
      _currentUserCache = null;
      updateBadges();
    },
    getCurrentUser(){ return getCurrentUser(true); },
    isAdmin,
    getProducts(){ return refreshCatalogData(true).slice(); },
    getOrders(){
      const response = apiGet(API_BASE + '/orders/list.php');
      return response?.ok && Array.isArray(response.orders) ? response.orders : [];
    },
    getAllOrders(){
      const response = apiGet(API_BASE + '/orders/all.php');
      return response?.ok && Array.isArray(response.orders) ? response.orders : [];
    },
    getPurchasedProducts(){ return getPurchasedProducts(); },
    hasPurchasedProduct(productId, orderId){ return hasPurchasedProduct(productId, getCurrentUser()?.email, orderId); },
    getCart(){
      const raw = localStorage.getItem(STORE_KEY_CART);
      const items = safeParse(raw, []);
      refreshCatalogData(true);
      const normalized = Array.isArray(items)
        ? items.filter(item => item && item.id).map(item => {
            const max = getStock(item.id);
            return { id:String(item.id), qty: Math.min(Math.max(1, Number(item.qty) || 1), Math.max(0, max)) };
          }).filter(item => item.qty > 0)
        : [];
      if(JSON.stringify(items) !== JSON.stringify(normalized)) localStorage.setItem(STORE_KEY_CART, JSON.stringify(normalized));
      return normalized;
    },
    saveCart(items){
      const normalized = (items || [])
        .map(item => ({ id:String(item.id), qty:Math.max(1, Number(item.qty) || 1) }))
        .map(item => ({ ...item, qty:Math.min(item.qty, getStock(item.id)) }))
        .filter(item => item.qty > 0);
      localStorage.setItem(STORE_KEY_CART, JSON.stringify(normalized));
      updateBadges();
      return normalized;
    },
    addToCart(id, qty){
      const items = this.getCart();
      const key = String(id);
      const available = getStock(key);
      if(available <= 0) return { ok:false, error:'Товар закончился.', max:0, items };
      const found = items.find(item => String(item.id) === key);
      const nextQty = Math.min(available, (found ? found.qty : 0) + Math.max(1, Number(qty) || 1));
      if(found) found.qty = nextQty;
      else items.push({ id:key, qty:nextQty });
      this.saveCart(items);
      return { ok:true, max:available, qty:nextQty, items, limited: nextQty >= available };
    },
    setQty(id, qty){
      const key = String(id);
      const max = getStock(key);
      if(max <= 0) return { ok:false, error:'Товар отсутствует на складе.', max:0, items:this.removeFromCart(key) };
      const items = this.getCart().map(item => String(item.id) === key ? { id:key, qty:Math.min(max, Math.max(1, Number(qty) || 1)) } : item);
      this.saveCart(items);
      const current = items.find(item => item.id === key);
      return { ok:true, max, qty:current ? current.qty : 0, items, limited:(Number(qty) || 1) > max };
    },
    removeFromCart(id){
      const key = String(id);
      const items = this.getCart().filter(item => String(item.id) !== key);
      this.saveCart(items);
      return items;
    },
    clearCart(){ this.saveCart([]); },
    getProductImage(id){ return getProductById(id)?.image || null; },
    getStock,
    setStock,
    adjustStock(id, delta){
      const response = apiPost(API_BASE + '/products/stock.php', { id, delta });
      if(response?.ok){ refreshCatalogData(true); updateBadges(); return { ok:true, stock:Math.max(0, Number(response.stock) || 0) }; }
      return { ok:false, error:response?.error || 'Не удалось обновить остаток.' };
    },
    addProduct(payload){
      const response = apiPost(API_BASE + '/products/add.php', payload || {});
      if(response?.ok){ refreshCatalogData(true); return { ok:true, product:normalizeProduct(response.product, response.product?.id) }; }
      return { ok:false, error:response?.error || 'Не удалось добавить товар.' };
    },
    placeOrder(paymentData){
      const items = this.getCart();
      if(!items.length) return { ok:false, error:'Корзина пуста.' };
      const response = apiPost(API_BASE + '/orders/place.php', {
        items,
        paymentMethod: paymentData?.paymentMethod ? String(paymentData.paymentMethod) : 'card',
        paymentLabel: paymentData?.paymentLabel ? String(paymentData.paymentLabel) : 'Картой',
        deliveryPlace: String(paymentData?.deliveryPlace || '').trim()
      });
      if(response?.ok){
        this.clearCart();
        refreshCatalogData(true);
        return { ok:true, order:response.order };
      }
      return { ok:false, error:response?.error || 'Не удалось оформить заказ.' };
    },
    getReviews(productId, status){
      return getAllReviews(productId, status);
    },
    addReview(payload){
      const response = apiPost(API_BASE + '/reviews/add.php', payload || {});
      return response?.ok ? { ok:true, review:normalizeReview(response.review) } : { ok:false, error:response?.error || 'Не удалось отправить отзыв.' };
    },
    moderateReview(id, status){
      const response = apiPost(API_BASE + '/reviews/moderate.php', { id, status });
      return response?.ok ? { ok:true } : { ok:false, error:response?.error || 'Не удалось изменить статус отзыва.' };
    },
    getReturnRequests(){ return getAllReturnRequests(); },
    submitReturnRequest(payload){
      const response = apiPost(API_BASE + '/returns/add.php', payload || {});
      return response?.ok ? { ok:true, request:normalizeReturnRequest(response.request) } : { ok:false, error:response?.error || 'Не удалось отправить заявку.' };
    },
    updateReturnRequest(id, status){
      const response = apiPost(API_BASE + '/returns/update.php', { id, status });
      return response?.ok ? { ok:true } : { ok:false, error:response?.error || 'Не удалось обновить заявку.' };
    }
  };

  function getPreferredTheme(){
    const saved = localStorage.getItem(STORE_KEY_THEME) || 'system';
    return ['system', 'light'].includes(saved) ? saved : 'system';
  }

  function getAppliedTheme(){
    const pref = getPreferredTheme();
    if(pref === 'light') return 'light';
    return 'dark';
  }

  function applyTheme(){
    const pref = getPreferredTheme();
    const applied = getAppliedTheme();
    document.documentElement.dataset.theme = applied;
    document.documentElement.style.colorScheme = applied === 'light' ? 'light' : 'dark';
    const switcher = document.getElementById('themeSwitch');
    if(switcher){
      switcher.dataset.active = pref;
      switcher.setAttribute('title', `Тема: ${pref === 'system' ? 'Системная' : 'Светлая'}`);
    }
    qsa('[data-theme-option]').forEach(btn => {
      const active = btn.getAttribute('data-theme-option') === pref;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setTheme(theme){
    localStorage.setItem(STORE_KEY_THEME, theme);
    applyTheme();
  }

  function bindThemeMenu(){
    const switcher = document.getElementById('themeSwitch');
    if(!switcher) return;
    switcher.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-option]');
      if(!btn) return;
      setTheme(btn.getAttribute('data-theme-option'));
    });
    if(window.matchMedia){
      const media = window.matchMedia('(prefers-color-scheme: light)');
      if(media.addEventListener) media.addEventListener('change', () => { if(getPreferredTheme() === 'system') applyTheme(); });
    }
  }

  function updateBadges(){
    const badge = document.getElementById('cartBadge');
    if(badge){
      const total = Store.getCart().reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      badge.textContent = String(total);
      badge.style.display = total ? 'flex' : 'none';
    }
  }

  function stockLabel(productId){
    const qty = getStock(productId);
    return qty > 0 ? `В наличии: ${qty} шт.` : 'Нет в наличии';
  }

  function setActiveNav(){
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    qsa('[data-nav]').forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      link.classList.toggle('active', href === path);
    });
  }

  function injectLayout(){
    if(document.querySelector('.topbar') || document.querySelector('footer.footer')){
      initChatbot();
      try{ clearTimeout(window.__APP_READY_TIMEOUT__); }catch(e){}
      document.documentElement.classList.add('app-ready');
      return;
    }

    const currentUser = getCurrentUser();
    const adminLink = isAdmin(currentUser) ? '<a class="btn" href="account.html#admin">Админ-панель</a>' : '';
    const header = el(`
      <div class="topbar">
        <div class="container">
          <div class="nav">
            <a class="brand" href="index.html" aria-label="На главную">
              <img class="logo-img" src="assets/img/logo.png" alt="" decoding="async" />
              <div>
                <h1>НОВА - Мебель</h1>
                <span>Каталог • Доставка • Сборка</span>
              </div>
            </a>

            <nav class="navlinks" aria-label="Навигация">
              <a data-nav href="index.html">Главная</a>
              <a data-nav href="catalog.html">Каталог</a>
              <a data-nav href="delivery.html">Доставка</a>
              <a data-nav href="faq.html">ЧаВо</a>
              <a data-nav href="about.html">О нас</a>
              <a data-nav href="reviews.html">Отзывы</a>
              <a data-nav href="contacts.html">Контакты</a>
            </nav>

            <div class="actions">
              <a class="iconbtn iconbtn-only accountbtn" href="account.html" aria-label="Аккаунт" title="Аккаунт">
                <span class="navicon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="3" width="10" height="18" rx="2.4" stroke="currentColor" stroke-width="2.1"/>
                    <path d="M10 12H20" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
                    <path d="M16 8L20 12L16 16" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </a>
              <div class="theme-switch" id="themeSwitch" data-active="system" role="group" aria-label="Переключение темы">
                <span class="theme-switch-track" aria-hidden="true"></span>
                <button class="theme-option" type="button" data-theme-option="light" aria-pressed="false" title="Светлая тема">
                  <span class="theme-option-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="4.3" fill="currentColor"/>
                      <path d="M12 2.5V5.1M12 18.9V21.5M21.5 12H18.9M5.1 12H2.5M18.72 5.28L16.88 7.12M7.12 16.88L5.28 18.72M18.72 18.72L16.88 16.88M7.12 7.12L5.28 5.28" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
                    </svg>
                  </span>
                </button>
                <button class="theme-option" type="button" data-theme-option="system" aria-pressed="true" title="Системная тема">
                  <span class="theme-option-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.5 15.2C17.5 15.7 16.4 16 15.3 16C11.28 16 8 12.72 8 8.7C8 7.57 8.26 6.5 8.8 5.5C5.83 6.57 3.7 9.42 3.7 12.75C3.7 17 7.15 20.45 11.4 20.45C14.63 20.45 17.42 18.45 18.5 15.2Z" fill="currentColor"/>
                    </svg>
                  </span>
                </button>
              </div>
              <a class="iconbtn iconbtn-only cartbtn" href="cart.html" aria-label="Корзина" title="Корзина">
                <span class="navicon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="9" cy="18.2" r="1.8" fill="currentColor"/>
                    <circle cx="17.2" cy="18.2" r="1.8" fill="currentColor"/>
                    <path d="M4 5H6L8 14H18.2L20 8H8.8" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="badge" id="cartBadge">0</span>
              </a>
              <button class="iconbtn burger" id="burgerBtn" aria-label="Меню">☰</button>
            </div>
          </div>

          <div id="mobileMenu" class="panel hidden" style="margin:10px 0 14px">
            <div class="grid" style="gap:10px">
              <a class="btn" href="index.html">Главная</a>
              <a class="btn" href="catalog.html">Каталог</a>
              <a class="btn" href="delivery.html">Доставка</a>
              <a class="btn" href="faq.html">ЧаВо</a>
              <a class="btn" href="about.html">О нас</a>
              <a class="btn" href="reviews.html">Отзывы</a>
              <a class="btn" href="contacts.html">Контакты</a>
              <a class="btn" href="account.html">Аккаунт</a>
              ${adminLink}
            </div>
          </div>
        </div>
      </div>
    `);

    const footer = el(`
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div class="card" style="padding:14px; border-radius:10px">
              <div class="row" style="gap:10px">
                <img class="logo-img" src="assets/img/logo.png" alt="" loading="lazy" decoding="async" />
                <div>
                  <div style="font-weight:800">НОВА - Мебель</div>
                  <div class="small">Современная мебель для дома</div>
                </div>
              </div>
              <div class="hr"></div>
              <p>Красивый дизайн, честные цены и удобная доставка. Лучшая мебель для вашего дома.</p>
            </div>
            <div>
              <h4>Покупателям</h4>
              <div class="grid" style="gap:8px">
                <a href="catalog.html">Каталог</a>
                <a href="delivery.html">Доставка и сборка</a>
                <a href="faq.html">ЧаВо</a>
                <a href="reviews.html">Отзывы</a>
                <a href="account.html">Аккаунт</a>
                <a href="contacts.html">Контакты</a>
              </div>
            </div>
            <div>
              <h4>Информация</h4>
              <div class="grid" style="gap:8px">
                <a href="about.html">О компании</a>
                <a href="delivery.html">Условия доставки</a>
              </div>
            </div>
            <div>
              <h4>Поддержка</h4>
              <div class="grid" style="gap:8px">
                <span class="small">Ежедневно: 10:00–20:00</span>
                <span class="small">Тел: +7 (999) 123-45-67</span>
                <span class="small">Email: support@nova.demo</span>
                <span class="pill small">© <span id="year"></span> НОВА - Мебель</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    `);

    document.body.prepend(header);
    document.body.append(footer);
    qs('#year').textContent = new Date().getFullYear();
    const burger = qs('#burgerBtn');
    const mobileMenu = qs('#mobileMenu');
    if(burger) burger.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    setActiveNav();
    bindThemeMenu();
    applyTheme();
    updateBadges();
    initChatbot();
    try{ clearTimeout(window.__APP_READY_TIMEOUT__); }catch(e){}
    document.documentElement.classList.add('app-ready');
  }



  function loadChatbotHistory(){
    const raw = safeParse(localStorage.getItem(STORE_KEY_CHATBOT), []);
    return Array.isArray(raw) ? raw.filter(item => item && item.role && item.text).slice(-30) : [];
  }

  function saveChatbotHistory(messages){
    localStorage.setItem(STORE_KEY_CHATBOT, JSON.stringify((messages || []).slice(-30)));
  }

  function getReturnStatusMeta(status){
    switch(String(status || 'new')){
      case 'approved': return { label:'возврат одобрен', note:'Администратор подтвердил заявку. Ожидайте связь по указанному контакту.' };
      case 'rejected': return { label:'в возврате отказано', note:'Заявка отклонена. Можно оформить новую заявку с уточнением причины.' };
      case 'in_progress': return { label:'заявка в работе', note:'Администратор уже рассматривает заявку.' };
      default: return { label:'заявка отправлена', note:'Заявка зарегистрирована и ждёт решения администратора.' };
    }
  }

  function normalizeBotQuery(text){
    return String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s-]/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  function findProductsForBot(query){
    const norm = normalizeBotQuery(query);
    if(!norm) return [];
    const words = norm.split(' ').filter(word => word.length > 1);
    return Store.getProducts().map(product => {
      const hay = normalizeBotQuery([product.title, product.category, product.material, product.color, ...(product.tags || []), product.description].join(' '));
      let score = 0;
      words.forEach(word => { if(hay.includes(word)) score += word.length > 3 ? 2 : 1; });
      if(hay.includes(norm)) score += 4;
      return { product, score };
    }).filter(item => item.score > 0).sort((a,b) => b.score - a.score).slice(0, 6).map(item => item.product);
  }

  function uniqueProducts(list){
    const map = new Map();
    (list || []).forEach(product => {
      if(product && !map.has(product.id)) map.set(product.id, product);
    });
    return [...map.values()];
  }

  function getTopProductsBy(predicate, limit){
    return uniqueProducts(Store.getProducts().filter(predicate).sort((a,b) => {
      const stockDiff = getStock(b.id) - getStock(a.id);
      if(stockDiff !== 0) return stockDiff;
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    }).slice(0, limit || 3));
  }

  function buildProductReply(products, intro){
    if(!products.length) return '';
    return `${intro}<br><br>${products.map(product => {
      const stock = getStock(product.id);
      const stockText = stock > 0 ? `в наличии ${stock} шт.` : 'сейчас нет в наличии';
      const deliveryText = product.deliveryDays ? `доставка от ${product.deliveryDays} дн.` : 'срок уточняется';
      return `• <a href="product.html?id=${encodeURIComponent(product.id)}"><b>${esc(product.title)}</b></a> — ${money(product.price)}, ${esc(product.category)}, ${stockText}, ${deliveryText}`;
    }).join('<br>')}`;
  }

  function getBotReply(text){
    const query = String(text || '').trim();
    const norm = normalizeBotQuery(query);
    const directProducts = findProductsForBot(query);
    const currentUser = getCurrentUser();
    const inStockProducts = Store.getProducts().filter(product => getStock(product.id) > 0);

    if(!norm) return 'Я на связи 👋 Напишите вопрос, и я помогу с доставкой, оплатой, возвратом или подбором мебели.';

    if(/привет|здравствуй|добрый день|добрый вечер|доброе утро/.test(norm)){
      return 'Здравствуйте! Я онлайн-помощник магазина НОВА. Помогу подобрать мебель, подскажу по наличию, оплате, доставке, отзывам и возвратам. Например, можно спросить: <b>«что выбрать в гостиную?»</b> или <b>«как оформить возврат?»</b>.';
    }

    if(/спасибо|благодарю|благодарствую/.test(norm)){
      return 'Пожалуйста! Если захотите, я ещё помогу подобрать товар, подсказать сроки доставки или найти нужную модель.';
    }

    if(/пока|до свидания|до связи/.test(norm)){
      return 'До связи! Если появятся вопросы по заказу или товарам, я всегда рядом 😊';
    }

    if(/что ты умеешь|чем поможешь|что умеешь|помощь|помоги/.test(norm)){
      return 'Я могу помочь с подбором мебели по категории, комнате, цвету и материалу, подсказать наличие и цены, объяснить оплату и доставку, а также рассказать про отзывы и возвраты.';
    }

    if((/мой возврат|статус возврата|статус заявки|где возврат/.test(norm) || (norm.includes('возврат') && norm.includes('статус'))) && currentUser){
      const requests = Store.getReturnRequests();
      if(!requests.length) return 'У вас пока нет заявок на возврат. Новую заявку можно оформить на странице <a href="contacts.html"><b>Контакты</b></a> или в личном кабинете по кнопке «Возврат» рядом с купленным товаром.';
      const latest = requests[0];
      const meta = getReturnStatusMeta(latest.status);
      return `Проверил последнюю заявку: по товару <b>${esc(latest.productTitle)}</b> сейчас статус <b>${esc(meta.label)}</b>.<br>${esc(meta.note)}<br><br>Все заявки отображаются в <a href="account.html"><b>личном кабинете</b></a> и на странице <a href="contacts.html"><b>Контакты</b></a>.`;
    }

    if(/возврат|брак|поврежден|некомплект|обмен/.test(norm)){
      return 'Возврат по причине брака можно оформить прямо на сайте: откройте <a href="contacts.html"><b>Контакты</b></a> или нажмите «Возврат» в личном кабинете рядом с купленным товаром. Выбрать можно только товар из оформленного заказа, а затем отслеживать статус заявки: <b>отправлена</b>, <b>в работе</b>, <b>одобрена</b> или <b>отказано</b>.';
    }

    if(/отзыв|оценк|комментар/.test(norm)){
      return 'Оставить отзыв можно только на реально купленный товар. После покупки зайдите в <a href="account.html"><b>личный кабинет</b></a> и нажмите «Оценить» рядом с нужной позицией. Отзыв сначала отправляется на модерацию, а после одобрения появляется на сайте.';
    }

    if(/оплат|карта|сбп|банк|qr/.test(norm)){
      return 'Оплатить заказ можно <b>банковской картой</b> или через <b>СБП</b>. При выборе СБП можно выбрать банк и подтвердить оплату по QR-коду во время оформления заказа. Если хотите, могу ещё подсказать, как проходит оформление заказа шаг за шагом.';
    }

    if(/достав|срок|когда привезут|сборк|подьем|подъем/.test(norm)){
      return 'Срок доставки зависит от конкретной модели и указан в карточке товара. Доставка считается в корзине автоматически: при заказе от <b>80 000 ₽</b> — бесплатно, иначе <b>990 ₽</b>. Если напишете название товара, я подскажу срок точнее.';
    }

    if(/контакт|телефон|почта|связат|режим работы/.test(norm)){
      return 'Служба поддержки работает ежедневно с <b>10:00 до 20:00</b>. Связаться можно по телефону <b>+7 (999) 123-45-67</b> или по почте <b>support@nova.demo</b>.';
    }

    if(/где заказ|мой заказ|история заказ|кабинет|личный кабинет/.test(norm)){
      return 'История заказов доступна в <a href="account.html"><b>личном кабинете</b></a>. Там можно посмотреть покупки, оставить отзыв на купленный товар и отслеживать статусы заявок на возврат.';
    }

    if(/скидк|акци|распродаж|выгод/.test(norm)){
      const discounted = getTopProductsBy(product => Number(product.oldPrice) > Number(product.price), 3);
      if(discounted.length) return buildProductReply(discounted, 'Сейчас можно обратить внимание на эти позиции с выгодной ценой:');
      return 'Сейчас в каталоге есть товары с привлекательной ценой. Напишите категорию — например, диваны или кровати — и я подскажу лучшие варианты.';
    }

    if(/в наличии|налич|остаток|есть ли/.test(norm) && directProducts.length){
      return buildProductReply(directProducts.slice(0, 3), 'Вот что нашёл по наличию:');
    }

    if(/диван|диваны|гостина|гостиную|гостиной/.test(norm)){
      const products = uniqueProducts([...directProducts, ...getTopProductsBy(product => /диван/i.test(product.category) || /диван/i.test(product.title), 3)]).slice(0, 3);
      return buildProductReply(products, 'Для гостиной могу предложить такие варианты:');
    }

    if(/кроват|спальн|матрас/.test(norm)){
      const products = uniqueProducts([...directProducts, ...getTopProductsBy(product => /кроват/i.test(product.category) || /кроват/i.test(product.title), 3)]).slice(0, 3);
      return buildProductReply(products, 'Для спальни хорошо подойдут эти модели:');
    }

    if(/стол|кухн|столова|обеден/.test(norm)){
      const products = uniqueProducts([...directProducts, ...getTopProductsBy(product => /стол/i.test(product.category) || /стол/i.test(product.title), 3)]).slice(0, 3);
      return buildProductReply(products, 'Для кухни, столовой или рабочей зоны обратите внимание на:');
    }

    if(/стул|кресл/.test(norm)){
      const products = uniqueProducts([...directProducts, ...getTopProductsBy(product => /стул|кресл/i.test(product.category + ' ' + product.title), 3)]).slice(0, 3);
      return buildProductReply(products, 'Вот подходящие варианты для зоны отдыха или обеденной группы:');
    }

    if(/шкаф|комод|прихож|хранен/.test(norm)){
      const products = uniqueProducts([...directProducts, ...getTopProductsBy(product => /шкаф|комод/i.test(product.category + ' ' + product.title), 3)]).slice(0, 3);
      return buildProductReply(products, 'Если нужен вариант для хранения, посмотрите эти товары:');
    }

    if(/бежев|бел|сер|син|зелен|зелён|черн|чёрн|графит|дуб|орех|натурал|песоч/.test(norm)){
      const products = getTopProductsBy(product => normalizeBotQuery(product.color).split(' ').some(word => norm.includes(word)), 3);
      if(products.length) return buildProductReply(products, 'Подобрал варианты по цвету:');
    }

    if(/велюр|ткан|массив|дерев|мдф|лдсп|металл/.test(norm)){
      const products = getTopProductsBy(product => normalizeBotQuery(product.material).split(/[\s/]+/).some(word => word && norm.includes(word)), 3);
      if(products.length) return buildProductReply(products, 'Нашёл товары по материалу:');
    }

    if(/до\s*([0-9\s]+)\s*(руб|р|тыс|тысяч)?/.test(norm) || /бюджет/.test(norm)){
      let limit = 0;
      const match = norm.match(/до\s*([0-9\s]+)\s*(руб|р|тыс|тысяч)?/);
      if(match){
        limit = Number(String(match[1]).replace(/\s+/g, '')) || 0;
        if(/тыс|тысяч/.test(match[2] || '')) limit *= 1000;
      }
      if(!limit && /бюджет/.test(norm)) limit = 60000;
      const products = getTopProductsBy(product => (Number(product.price) || 0) <= limit, 3);
      if(products.length) return buildProductReply(products, `Подобрал несколько вариантов ${limit ? 'до ' + money(limit) : 'в комфортном бюджете'}:`);
    }

    if(/сам(ый|ые)|популяр|хит|лучший/.test(norm)){
      const products = getTopProductsBy(product => (product.tags || []).join(' ').toLowerCase().includes('хит') || (Number(product.oldPrice) > Number(product.price)), 3);
      if(products.length) return buildProductReply(products, 'Часто выбирают эти товары:');
    }

    if(/новинк|новое|новый/.test(norm)){
      const products = getTopProductsBy(product => (product.tags || []).join(' ').toLowerCase().includes('нов'), 3);
      if(products.length) return buildProductReply(products, 'Из новинок можно посмотреть эти модели:');
    }

    if(/каталог|товар|ассортимент|покажи/.test(norm) && directProducts.length){
      return buildProductReply(directProducts.slice(0, 3), 'Вот подходящие позиции из каталога:');
    }

    if(directProducts.length){
      return buildProductReply(directProducts.slice(0, 3), 'Нашёл подходящие товары:');
    }

    const fallback = getTopProductsBy(product => getStock(product.id) > 0, 3);
    return `${buildProductReply(fallback, 'Я не до конца понял запрос, но могу предложить несколько популярных товаров:')}<br><br>Также можно спросить: <b>«что выбрать в спальню?»</b>, <b>«есть ли диваны в наличии?»</b>, <b>«как проходит доставка?»</b> или <b>«как оформить возврат?»</b>.`;
  }

  function renderChatbotMessages(container, messages){
    if(!container) return;
    container.innerHTML = '';
    messages.forEach(message => {
      const node = el(`
        <div class="chatbot-message ${message.role === 'user' ? 'is-user' : 'is-bot'}">
          ${message.role === 'bot' ? '<div class="chatbot-avatar"><img src="assets/img/chatbot-assistant.png" alt="" loading="lazy" decoding="async" /></div>' : ''}
          <div class="chatbot-bubble-wrap">
            <div class="chatbot-bubble"></div>
          </div>
        </div>
      `);
      const bubble = node.querySelector('.chatbot-bubble');
      if(message.role === 'user') bubble.textContent = String(message.text || '');
      else bubble.innerHTML = String(message.text || '');
      container.append(node);
    });
    container.scrollTop = container.scrollHeight;
  }

  function initChatbot(){
    if(document.getElementById('chatbotWidget')) return;
    const widget = el(`
      <div class="chatbot-root">
        <button class="chatbot-toggle" id="chatbotToggle" type="button" aria-label="Открыть чат-помощник">
          <img src="assets/img/chatbot-assistant.png" alt="" loading="lazy" decoding="async" />
        </button>
        <section class="chatbot-widget hidden" id="chatbotWidget" aria-live="polite">
          <div class="chatbot-head">
            <div class="chatbot-head-main">
              <span class="chatbot-head-icon"><img src="assets/img/chatbot-assistant.png" alt="" loading="lazy" decoding="async" /></span>
              <div>
                <h3>Помощник НОВА</h3>
                <p>Отвечу по товарам, заказам, оплате, доставке и возвратам</p>
              </div>
            </div>
            <button class="chatbot-close" id="chatbotClose" type="button" aria-label="Закрыть чат">✕</button>
          </div>
          <div class="chatbot-messages" id="chatbotMessages"></div>
          <div class="chatbot-suggestions" id="chatbotSuggestions">
            <button type="button" class="chatbot-chip">Как оформить возврат?</button>
            <button type="button" class="chatbot-chip">Что выбрать в гостиную?</button>
            <button type="button" class="chatbot-chip">Какие диваны есть в наличии?</button>
            <button type="button" class="chatbot-chip">Как оплатить через СБП?</button>
          </div>
          <form class="chatbot-form" id="chatbotForm">
            <label class="chatbot-input-wrap" for="chatbotInput">
              <span class="chatbot-input-icon">✦</span>
              <input id="chatbotInput" type="text" placeholder="Напишите ваш вопрос…" autocomplete="off" />
            </label>
            <button class="chatbot-send" type="submit" aria-label="Отправить сообщение">➜</button>
          </form>
        </section>
      </div>
    `);
    document.body.append(widget);

    const toggle = document.getElementById('chatbotToggle');
    const panel = document.getElementById('chatbotWidget');
    const close = document.getElementById('chatbotClose');
    const messagesBox = document.getElementById('chatbotMessages');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');
    const suggestions = document.getElementById('chatbotSuggestions');

    let messages = loadChatbotHistory();
    if(!messages.length){
      messages = [{ role:'bot', text:'Здравствуйте! Я онлайн-помощник магазина НОВА 👋 Могу помочь с выбором мебели, наличием, оплатой, доставкой, отзывами и возвратами. Просто напишите ваш вопрос.' }];
      saveChatbotHistory(messages);
    }
    renderChatbotMessages(messagesBox, messages);

    function openChat(){
      panel.classList.remove('hidden');
      setTimeout(() => input?.focus(), 30);
      renderChatbotMessages(messagesBox, messages);
    }
    function closeChat(){ panel.classList.add('hidden'); }
    function ask(text){
      const value = String(text || '').trim();
      if(!value) return;
      messages.push({ role:'user', text:value });
      messages.push({ role:'bot', text:getBotReply(value) });
      messages = messages.slice(-30);
      saveChatbotHistory(messages);
      renderChatbotMessages(messagesBox, messages);
      if(input) input.value = '';
    }

    toggle?.addEventListener('click', openChat);
    close?.addEventListener('click', closeChat);
    form?.addEventListener('submit', (e) => { e.preventDefault(); ask(input?.value); });
    input?.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        ask(input?.value);
      }
    });
    suggestions?.addEventListener('click', (e) => {
      const chip = e.target.closest('.chatbot-chip');
      if(!chip) return;
      openChat();
      ask(chip.textContent);
    });
  }
  function showModal(title, html){
    let bd = document.getElementById('modalBackdrop');
    if(!bd){
      bd = el(`
        <div class="modal-backdrop" id="modalBackdrop">
          <div class="modal" role="dialog" aria-modal="true">
            <div class="modal-head">
              <h3 id="modalTitle"></h3>
              <button class="modal-close" id="modalClose" aria-label="Закрыть">✕</button>
            </div>
            <div class="modal-body" id="modalBody"></div>
          </div>
        </div>
      `);
      document.body.append(bd);
      bd.addEventListener('click', (e) => { if(e.target === bd) hideModal(); });
      document.getElementById('modalClose').addEventListener('click', hideModal);
      document.addEventListener('keydown', (e) => { if(e.key === 'Escape') hideModal(); });
    }
    document.getElementById('modalTitle').textContent = title || 'Сообщение';
    document.getElementById('modalBody').innerHTML = html || '';
    bd.style.display = 'flex';
  }
  function hideModal(){ const bd = document.getElementById('modalBackdrop'); if(bd) bd.style.display = 'none'; }

  function calcTotals(cartItems){
    const map = new Map(Store.getProducts().map(product => [product.id, product]));
    let subtotal = 0;
    let count = 0;
    (cartItems || []).forEach(item => {
      const product = map.get(item.id);
      if(!product) return;
      count += Number(item.qty) || 0;
      subtotal += (Number(product.price) || 0) * (Number(item.qty) || 0);
    });
    const delivery = subtotal >= 80000 ? 0 : (subtotal > 0 ? 990 : 0);
    const discount = 0;
    const total = Math.max(0, subtotal + delivery - discount);
    return { count, subtotal, delivery, discount, total };
  }

  function applyProductImage(target, productId){
    if(!target) return;
    let url = Store.getProductImage(productId);
    if(!url){
      const product = getProductById(productId);
      url = product?.image || null;
    }
    if(!url) return;
    if(window.Data && typeof Data.resolveAsset === 'function') url = Data.resolveAsset(url);
    const escapedUrl = String(url).replace(/"/g, '\\"');
    target.style.background = `url("${escapedUrl}") center/cover no-repeat`;
    target.style.backgroundColor = '#10131b';
  }

  applyTheme();
  if(!window.__APP_READY_FAILSAFE__){
    window.__APP_READY_FAILSAFE__ = true;
    window.addEventListener('load', function(){ document.documentElement.classList.add('app-ready'); }, { once:true });
  }

  window.Store = Store;
  window.UI = {
    money,
    el,
    qs,
    qsa,
    esc,
    getProductById,
    applyProductImage,
    injectLayout,
    updateBadges,
    showModal,
    hideModal,
    calcTotals,
    stockLabel,
    applyTheme,
    setTheme,
    formatDateTime
  };
})();
