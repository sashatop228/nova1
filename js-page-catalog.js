(function(){
  UI.injectLayout();

  const grid = UI.qs('#grid');
  const pager = UI.qs('#pager');
  const count = UI.qs('#count');

  const fQuery = UI.qs('#fQuery');
  const fCategory = UI.qs('#fCategory');
  const fMaterial = UI.qs('#fMaterial');
  const fMin = UI.qs('#fMin');
  const fMax = UI.qs('#fMax');
  const fStock = UI.qs('#fStock');
  const sort = UI.qs('#sort');
  const applyBtn = UI.qs('#applyBtn');
  const resetBtn = UI.qs('#resetBtn');

  const DEFAULT_SORT = 'popular';
  const params = new URLSearchParams(location.search);
  const presetQ = params.get('q') || '';

  const products = Store.getProducts();
  const searchable = new Map(products.map(product => [String(product.id), (`${product.title} ${product.category} ${product.material} ${product.color} ${(product.tags || []).join(' ')}`).toLowerCase()]));

  if(fCategory){
    fCategory.innerHTML = `<option value="">Все</option>` + (window.Data?.categories || []).map(category => `<option>${UI.esc(category)}</option>`).join('');
  }
  if(fMaterial){
    const materials = [...new Set(products.map(product => product.material).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'ru'));
    fMaterial.innerHTML = `<option value="">Все материалы</option>` + materials.map(material => `<option>${UI.esc(material)}</option>`).join('');
  }

  document.addEventListener('keydown', (e) => {
    if(e.key !== '/') return;
    const target = e.target;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if(typing || !fQuery) return;
    e.preventDefault();
    fQuery.focus();
  });

  const state = { page:1, perPage:8 };
  const filterToggle = UI.qs('#filterToggle');
  const filterBackdrop = UI.qs('#filterBackdrop');

  function closeFilters(){
    document.body.classList.remove('filters-open');
    if(filterToggle) filterToggle.setAttribute('aria-expanded', 'false');
    if(filterBackdrop) filterBackdrop.hidden = true;
  }
  function openFilters(){
    document.body.classList.add('filters-open');
    if(filterToggle) filterToggle.setAttribute('aria-expanded', 'true');
    if(filterBackdrop) filterBackdrop.hidden = false;
  }
  function toggleFilters(){
    if(window.innerWidth > 860) return;
    if(document.body.classList.contains('filters-open')) closeFilters();
    else openFilters();
  }

  function readFilters(){
    return {
      q: ((fQuery && fQuery.value) || '').trim().toLowerCase(),
      cat: (fCategory && fCategory.value) || '',
      mat: (fMaterial && fMaterial.value) || '',
      min: Number((fMin && fMin.value) || 0),
      max: Number((fMax && fMax.value) || 99999999),
      stock: !!(fStock && fStock.checked),
      sort: sort ? sort.value : DEFAULT_SORT
    };
  }

  function filterProducts(list, filters){
    return list.filter(product => {
      const stock = Store.getStock(product.id);
      if(filters.q && !(searchable.get(String(product.id)) || '').includes(filters.q)) return false;
      if(filters.cat && product.category !== filters.cat) return false;
      if(filters.mat && product.material !== filters.mat) return false;
      if(product.price < filters.min || product.price > filters.max) return false;
      if(filters.stock && stock <= 0) return false;
      return true;
    });
  }

  function sortProducts(list, key){
    const copy = list.slice();
    if(key === 'price-asc') copy.sort((a,b) => a.price - b.price);
    else if(key === 'price-desc') copy.sort((a,b) => b.price - a.price);
    else copy.sort((a,b) => (Store.getStock(b.id) - Store.getStock(a.id)) || (a.price - b.price));
    return copy;
  }

  function stockMarkup(product){
    const stock = Store.getStock(product.id);
    return `<div class="stock-note ${stock > 0 ? '' : 'out'}">${UI.stockLabel(product.id)}</div>`;
  }

  function cartActionMarkup(product){
    const stock = Store.getStock(product.id);
    return stock > 0
      ? `<button class="btn small" type="button" data-add-cart="${product.id}">В корзину</button>`
      : `<button class="btn small" type="button" disabled>Нет в наличии</button>`;
  }

  function card(product){
    const node = UI.el(`
      <div class="card" data-id="${product.id}">
        <div class="thumb"></div>
        <div class="body">
          <div class="row spread">
            <h3 class="title">${UI.esc(product.title)}</h3>
          </div>
          <div class="small">${UI.esc(product.category)} • ${UI.esc(product.material)} • ${UI.esc(product.color)}</div>

          <div class="price" style="margin-top:10px">
            <b>${UI.money(product.price)}</b>
            ${product.oldPrice ? `<s>${UI.money(product.oldPrice)}</s>` : ``}
          </div>

          <div class="tags">
            ${(product.tags || []).slice(0, 3).map(tag => `<span class="tag">${UI.esc(tag)}</span>`).join('')}
          </div>

          ${stockMarkup(product)}

          <div class="actions">
            <a class="btn primary small" href="product.html?id=${encodeURIComponent(product.id)}">Подробнее</a>
            ${cartActionMarkup(product)}
          </div>
        </div>
      </div>
    `);
    UI.applyProductImage(node.querySelector('.thumb'), product.id);
    return node;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-cart]');
    if(!btn) return;
    const id = btn.getAttribute('data-add-cart');
    const product = UI.getProductById(id);
    const result = Store.addToCart(id, 1);
    if(!result.ok){ UI.showModal('Нет в наличии', `<p>${UI.esc(result.error)}</p>`); return; }
    const extra = result.limited ? `<p class="small">В корзине уже максимальное количество для этой позиции: ${result.max} шт.</p>` : '';
    UI.showModal('Товар добавлен', `<p><b>${UI.esc(product?.title || 'Товар')}</b> добавлен в корзину.</p>${extra}<p><a class="btn primary small" href="cart.html">Перейти в корзину</a></p>`);
  });

  function render(){
    if(!grid || !pager || !count) return;
    const filters = readFilters();
    const filtered = sortProducts(filterProducts(products, filters), filters.sort);

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    state.page = Math.min(state.page, pages);

    const start = (state.page - 1) * state.perPage;
    const pageItems = filtered.slice(start, start + state.perPage);

    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    pageItems.forEach(product => frag.append(card(product)));
    grid.append(frag);

    count.textContent = `Найдено: ${total} • Страница ${state.page}/${pages}`;

    pager.innerHTML = '';
    const pagerFrag = document.createDocumentFragment();
    for(let i = 1; i <= pages; i += 1){
      pagerFrag.append(UI.el(`<button class="pagebtn ${i === state.page ? 'active' : ''}" data-page="${i}">${i}</button>`));
    }
    pager.append(pagerFrag);
  }

  if(presetQ && fQuery) fQuery.value = presetQ;

  if(applyBtn) applyBtn.addEventListener('click', () => {
    state.page = 1;
    render();
    if(window.innerWidth <= 860) closeFilters();
  });

  [fQuery, fCategory, fMaterial, fMin, fMax, fStock].filter(Boolean).forEach(control => {
    const eventName = control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input';
    control.addEventListener(eventName, () => { state.page = 1; render(); });
  });

  if(resetBtn) resetBtn.addEventListener('click', () => {
    if(fQuery) fQuery.value = '';
    if(fCategory) fCategory.value = '';
    if(fMaterial) fMaterial.value = '';
    if(fMin) fMin.value = '';
    if(fMax) fMax.value = '';
    if(fStock) fStock.checked = false;
    if(sort) sort.value = DEFAULT_SORT;
    state.page = 1;
    render();
  });

  if(sort) sort.addEventListener('change', render);
  if(pager){
    pager.addEventListener('click', (e) => {
      const btn = e.target.closest('.pagebtn');
      if(!btn) return;
      const next = Number(btn.dataset.page || 1);
      if(!Number.isFinite(next) || next < 1 || next === state.page) return;
      state.page = next;
      render();
    });
  }
  if(filterToggle) filterToggle.addEventListener('click', toggleFilters);
  if(filterBackdrop) filterBackdrop.addEventListener('click', closeFilters);
  window.addEventListener('resize', () => { if(window.innerWidth > 860) closeFilters(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeFilters(); });

  render();
})();
