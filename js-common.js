(function(){
  function money(v){
    const n = Math.round(Number(v||0));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
  }

  function el(html){
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

  let _productsMap = null;
  function getProductById(id){
    if(!window.Data || !Array.isArray(Data.products)) return null;
    if(!_productsMap || _productsMap.size !== Data.products.length){
      _productsMap = new Map(Data.products.map(p => [String(p.id), p]));
    }
    return _productsMap.get(String(id)) || null;
  }

  const STORE_KEY_CART = "nova_cart";
  const STORE_KEY_USERS = "nova_users";
  const STORE_KEY_CURRENT_USER = "nova_current_user";
  const STORE_KEY_ORDERS = "nova_orders";
  const STORE_KEY_STOCK = "nova_stock_v2";
  const STORE_KEY_THEME = "nova_theme";

  function safeParse(json, fallback){
    try{return JSON.parse(json);}catch(e){return fallback;}
  }

  function baseStockMap(){
    const map = {};
    (Data.products || []).forEach(p=>{
      const qty = Math.max(0, Number(p.stockCount ?? (p.inStock ? 5 : 0)) || 0);
      map[String(p.id)] = qty;
    });
    return map;
  }

  function getStockMap(){
    const raw = safeParse(localStorage.getItem(STORE_KEY_STOCK), null);
    const base = baseStockMap();
    if(!raw || typeof raw !== 'object'){
      localStorage.setItem(STORE_KEY_STOCK, JSON.stringify(base));
      return base;
    }
    const merged = {...base};
    Object.keys(raw).forEach(k=> merged[k] = Math.max(0, Number(raw[k]) || 0));
    localStorage.setItem(STORE_KEY_STOCK, JSON.stringify(merged));
    return merged;
  }

  function saveStockMap(map){
    localStorage.setItem(STORE_KEY_STOCK, JSON.stringify(map));
  }

  function getStock(id){
    const map = getStockMap();
    return Math.max(0, Number(map[String(id)]) || 0);
  }

  function setStock(id, qty){
    const map = getStockMap();
    map[String(id)] = Math.max(0, Number(qty) || 0);
    saveStockMap(map);
    updateBadges();
    return map[String(id)];
  }

  function getUsers(){
    const raw = safeParse(localStorage.getItem(STORE_KEY_USERS), []);
    return Array.isArray(raw) ? raw : [];
  }

  function saveUsers(users){
    localStorage.setItem(STORE_KEY_USERS, JSON.stringify(users || []));
  }

  function getCurrentUser(){
    const email = localStorage.getItem(STORE_KEY_CURRENT_USER);
    if(!email) return null;
    return getUsers().find(u => u.email === email) || null;
  }

  function saveOrders(orders){
    localStorage.setItem(STORE_KEY_ORDERS, JSON.stringify(orders || []));
  }

  function getAllOrders(){
    const raw = safeParse(localStorage.getItem(STORE_KEY_ORDERS), []);
    return Array.isArray(raw) ? raw : [];
  }

  const Store = {
    register(name, email, password){
      name = String(name||'').trim();
      email = String(email||'').trim().toLowerCase();
      password = String(password||'');
      if(!name || !email || !password) return {ok:false, error:'Заполните все поля регистрации.'};
      const users = getUsers();
      if(users.some(u => u.email === email)) return {ok:false, error:'Пользователь с таким email уже зарегистрирован.'};
      const user = {name, email, password, createdAt:new Date().toISOString()};
      users.push(user);
      saveUsers(users);
      localStorage.setItem(STORE_KEY_CURRENT_USER, email);
      updateBadges();
      return {ok:true, user};
    },
    login(email, password){
      email = String(email||'').trim().toLowerCase();
      password = String(password||'');
      const user = getUsers().find(u => u.email === email && u.password === password);
      if(!user) return {ok:false, error:'Неверный email или пароль.'};
      localStorage.setItem(STORE_KEY_CURRENT_USER, email);
      updateBadges();
      return {ok:true, user};
    },
    logout(){
      localStorage.removeItem(STORE_KEY_CURRENT_USER);
      updateBadges();
    },
    getCurrentUser,
    getOrders(){
      const user = getCurrentUser();
      if(!user) return [];
      return getAllOrders().filter(o => o.userEmail === user.email).sort((a,b)=> String(b.createdAt).localeCompare(String(a.createdAt)));
    },
    getCart(){
      const raw = localStorage.getItem(STORE_KEY_CART);
      const items = safeParse(raw, []);
      const normalized = Array.isArray(items) ? items.filter(it => it && it.id).map(it => {
        const max = getStock(it.id);
        return { id:String(it.id), qty: Math.min(Math.max(1, Number(it.qty)||1), Math.max(0, max)) };
      }).filter(it => it.qty > 0) : [];
      if(JSON.stringify(items) !== JSON.stringify(normalized)){
        localStorage.setItem(STORE_KEY_CART, JSON.stringify(normalized));
      }
      return normalized;
    },
    saveCart(items){
      const normalized = (items || []).map(it => ({id:String(it.id), qty:Math.max(1, Number(it.qty)||1)}))
        .map(it => ({...it, qty:Math.min(it.qty, getStock(it.id))}))
        .filter(it => it.qty > 0);
      localStorage.setItem(STORE_KEY_CART, JSON.stringify(normalized));
      updateBadges();
      return normalized;
    },
    addToCart(id, qty){
      const items = this.getCart();
      const key = String(id);
      const available = getStock(key);
      if(available <= 0) return {ok:false, error:'Товар закончился.', max:0, items};
      const found = items.find(it => String(it.id) === key);
      const nextQty = Math.min(available, (found ? found.qty : 0) + Math.max(1, Number(qty)||1));
      if(found) found.qty = nextQty;
      else items.push({id:key, qty:nextQty});
      this.saveCart(items);
      return {ok:true, max:available, qty:nextQty, items, limited: nextQty >= available};
    },
    setQty(id, qty){
      const key = String(id);
      const max = getStock(key);
      if(max <= 0){
        return {ok:false, error:'Товар отсутствует на складе.', max:0, items:this.removeFromCart(key)};
      }
      const items = this.getCart().map(it => String(it.id) === key ? {id:key, qty: Math.min(max, Math.max(1, Number(qty)||1))} : it);
      this.saveCart(items);
      const current = items.find(it => it.id === key);
      return {ok:true, max, qty:current ? current.qty : 0, items, limited:(Number(qty)||1) > max};
    },
    removeFromCart(id){
      const key = String(id);
      const items = this.getCart().filter(it => String(it.id) !== key);
      this.saveCart(items);
      return items;
    },
    clearCart(){
      this.saveCart([]);
    },
    getProductImage(id){
      const p = getProductById(id);
      return p ? p.image : null;
    },
    getStock,
    placeOrder(paymentData){
      const user = getCurrentUser();
      if(!user) return {ok:false, error:'Чтобы оформить заказ, войдите в аккаунт.'};
      const items = this.getCart();
      if(!items.length) return {ok:false, error:'Корзина пуста.'};
      const stockMap = getStockMap();
      for(const item of items){
        const available = Math.max(0, Number(stockMap[item.id]) || 0);
        if(item.qty > available){
          return {ok:false, error:`Для товара «${getProductById(item.id)?.title || item.id}» доступно только ${available} шт.`};
        }
      }
      items.forEach(item => {
        stockMap[item.id] = Math.max(0, Number(stockMap[item.id]) - Number(item.qty));
      });
      saveStockMap(stockMap);
      const totals = calcTotals(items);
      const order = {
        id: 'NOVA-' + Date.now(),
        userEmail: user.email,
        userName: user.name,
        createdAt: new Date().toISOString(),
        items: items.map(item=>({id:item.id, qty:item.qty, price:getProductById(item.id)?.price || 0})),
        totals,
        paymentMethod: paymentData && paymentData.paymentMethod ? String(paymentData.paymentMethod) : 'card',
        paymentLabel: paymentData && paymentData.paymentLabel ? String(paymentData.paymentLabel) : 'Картой'
      };
      const orders = getAllOrders();
      orders.push(order);
      saveOrders(orders);
      this.clearCart();
      return {ok:true, order};
    }
  };

  function getPreferredTheme(){
    const saved = localStorage.getItem(STORE_KEY_THEME) || 'system';
    return ['system','light'].includes(saved) ? saved : 'system';
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
    qsa('[data-theme-option]').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-theme-option') === pref);
      btn.setAttribute('aria-pressed', btn.getAttribute('data-theme-option') === pref ? 'true' : 'false');
    });
  }

  function setTheme(theme){
    localStorage.setItem(STORE_KEY_THEME, theme);
    applyTheme();
  }

  function bindThemeMenu(){
    const switcher = document.getElementById('themeSwitch');
    if(!switcher) return;
    switcher.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-theme-option]');
      if(!btn) return;
      setTheme(btn.getAttribute('data-theme-option'));
    });
    if(window.matchMedia){
      const media = window.matchMedia('(prefers-color-scheme: light)');
      if(media.addEventListener) media.addEventListener('change', ()=>{ if(getPreferredTheme() === 'system') applyTheme(); });
    }
  }

  function updateBadges(){
    const badge = document.getElementById("cartBadge");
    if(badge){
      const total = Store.getCart().reduce((s,it)=>s + (Number(it.qty)||0), 0);
      badge.textContent = String(total);
      badge.style.display = total ? "flex" : "none";
    }
    const accountBadge = document.getElementById('accountBadge');
    if(accountBadge){
      const user = getCurrentUser();
      accountBadge.style.display = user ? 'block' : 'none';
      accountBadge.setAttribute('aria-hidden', user ? 'false' : 'true');
    }
  }

  function stockLabel(productId){
    const qty = getStock(productId);
    return qty > 0 ? `В наличии: ${qty} шт.` : 'Нет в наличии';
  }

  function setActiveNav(){
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    qsa('[data-nav]').forEach(a=>{
      const p = (a.getAttribute("href")||"").toLowerCase();
      a.classList.toggle("active", p === path);
    });
  }

  function injectLayout(){
    if(document.querySelector('.topbar') || document.querySelector('footer.footer')){
      try{ clearTimeout(window.__APP_READY_TIMEOUT__); }catch(e){}
      document.documentElement.classList.add('app-ready');
      return;
    }

    const user = getCurrentUser();
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
              <p>Красивый дизайн, честные цены и удобная доставка. Лучшая мебель для Вашего дома.</p>
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
    qs("#year").textContent = new Date().getFullYear();
    const burger = qs("#burgerBtn");
    const mm = qs("#mobileMenu");
    if(burger){ burger.addEventListener("click", ()=> mm.classList.toggle("hidden")); }
    setActiveNav();
    bindThemeMenu();
    applyTheme();
    updateBadges();
    try{ clearTimeout(window.__APP_READY_TIMEOUT__); }catch(e){}
    document.documentElement.classList.add('app-ready');
  }

  function showModal(title, html){
    let bd = document.getElementById("modalBackdrop");
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
      bd.addEventListener("click", (e)=>{ if(e.target === bd) hideModal(); });
      document.getElementById("modalClose").addEventListener("click", hideModal);
      document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") hideModal(); });
    }
    document.getElementById("modalTitle").textContent = title || "Сообщение";
    document.getElementById("modalBody").innerHTML = html || "";
    bd.style.display = "flex";
  }
  function hideModal(){ const bd = document.getElementById("modalBackdrop"); if(bd) bd.style.display = "none"; }

  function calcTotals(cartItems){
    const map = new Map(Data.products.map(p=>[p.id,p]));
    let subtotal = 0; let count = 0;
    cartItems.forEach(it=>{ const p = map.get(it.id); if(!p) return; count += it.qty; subtotal += p.price * it.qty; });
    const delivery = subtotal >= 80000 ? 0 : (subtotal>0 ? 990 : 0);
    const discount = 0;
    const total = Math.max(0, subtotal + delivery - discount);
    return { count, subtotal, delivery, discount, total };
  }

  function applyProductImage(el, productId, kind){
    if(!el) return;
    let url = (window.Store && Store.getProductImage) ? Store.getProductImage(productId) : null;
    if(!url && window.Data && Array.isArray(Data.products)){
      const p = getProductById(productId);
      url = (p && p.image) ? p.image : null;
    }
    if(!url) return;
    if(window.Data && typeof Data.resolveAsset === "function"){ url = Data.resolveAsset(url); }
    const u = String(url).replace(/"/g, '\\"');
    el.style.background = `url("${u}") center/cover no-repeat`;
    el.style.backgroundColor = "#10131b";
  }

  applyTheme();

  if(!window.__APP_READY_FAILSAFE__){
    window.__APP_READY_FAILSAFE__ = true;
    window.addEventListener('load', function(){ document.documentElement.classList.add('app-ready'); }, { once:true });
  }

  window.Store = Store;
  window.UI = { money, el, qs, qsa, esc, getProductById, applyProductImage, injectLayout, updateBadges, showModal, hideModal, calcTotals, stockLabel, applyTheme, setTheme };
})();