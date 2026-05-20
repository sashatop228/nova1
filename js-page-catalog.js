(function(){
  UI.injectLayout();

  const grid = UI.qs("#grid");
  const pager = UI.qs("#pager");
  const count = UI.qs("#count");

  const fQuery = UI.qs("#fQuery");
  const fCategory = UI.qs("#fCategory");
  const fMaterial = UI.qs("#fMaterial");
  const fMin = UI.qs("#fMin");
  const fMax = UI.qs("#fMax");
  const fStock = UI.qs("#fStock");
  const sort = UI.qs("#sort");
  const applyBtn = UI.qs("#applyBtn");
  const resetBtn = UI.qs("#resetBtn");

  const DEFAULT_SORT = "popular";
  const params = new URLSearchParams(location.search);
  const presetQ = params.get("q") || "";

  const products = Array.isArray(Data.products) ? Data.products : [];
  const searchable = new Map(products.map(p => [String(p.id), (
    `${p.title} ${p.category} ${p.material} ${p.color} ${(p.tags||[]).join(" ")}`
  ).toLowerCase()]));

  if(fCategory){
    fCategory.innerHTML = `<option value="">Все</option>` + Data.categories.map(c=>`<option>${c}</option>`).join("");
  }
  if(fMaterial){
    const mats = [...new Set(products.map(p => p.material).filter(Boolean))].sort((a,b)=> String(a).localeCompare(String(b), 'ru'));
    fMaterial.innerHTML = `<option value="">Все материалы</option>` + mats.map(m=>`<option>${m}</option>`).join("");
  }

  document.addEventListener("keydown", (e)=>{
    if(e.key !== "/") return;
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if(typing || !fQuery) return;
    e.preventDefault();
    fQuery.focus();
  });

  const state = { page: 1, perPage: 8 };

  const filterToggle = UI.qs("#filterToggle");
  const filterBackdrop = UI.qs("#filterBackdrop");

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
      q: ((fQuery && fQuery.value) || "").trim().toLowerCase(),
      cat: (fCategory && fCategory.value) || "",
      mat: (fMaterial && fMaterial.value) || "",
      min: Number((fMin && fMin.value) || 0),
      max: Number((fMax && fMax.value) || 99999999),
      stock: !!(fStock && fStock.checked),
      sort: (sort ? sort.value : DEFAULT_SORT)
    };
  }

  function filterProducts(list, f){
    return list.filter(p=>{
      const stock = Store.getStock(p.id);
      if(f.q && !(searchable.get(String(p.id)) || "").includes(f.q)) return false;
      if(f.cat && p.category !== f.cat) return false;
      if(f.mat && p.material !== f.mat) return false;
      if(p.price < f.min || p.price > f.max) return false;
      if(f.stock && stock <= 0) return false;
      return true;
    });
  }

  function sortProducts(list, key){
    const arr = list.slice();
    if(key === "price-asc") arr.sort((a,b)=>a.price-b.price);
    else if(key === "price-desc") arr.sort((a,b)=>b.price-a.price);
    else arr.sort((a,b)=> (Number(!!b.inStock) - Number(!!a.inStock)) || (a.price - b.price));
    return arr;
  }


  function stockMarkup(p){
    const stock = Store.getStock(p.id);
    return `<div class="stock-note ${stock>0?'':'out'}">${UI.stockLabel(p.id)}</div>`;
  }

  function cartActionMarkup(p){
    const stock = Store.getStock(p.id);
    return stock > 0
      ? `<button class="btn small" type="button" data-add-cart="${p.id}">В корзину</button>`
      : `<button class="btn small" type="button" disabled>Нет в наличии</button>`;
  }

  function card(p){
    return UI.el(`
      <div class="card" data-id="${p.id}">
        <div class="thumb" style="--thumb:url('${p.image}')"></div>
        <div class="body">
          <div class="row spread">
            <h3 class="title">${p.title}</h3>
          </div>
          <div class="small">${p.category} • ${p.material} • ${p.color}</div>

          <div class="price" style="margin-top:10px">
            <b>${UI.money(p.price)}</b>
            ${p.oldPrice ? `<s>${UI.money(p.oldPrice)}</s>` : ``}
          </div>

          <div class="tags">
            ${(p.tags||[]).slice(0,3).map(t=>`<span class="tag">${t}</span>`).join("")}
          </div>

          ${stockMarkup(p)}

          <div class="actions">
            <a class="btn primary small" href="product.html?id=${encodeURIComponent(p.id)}">Подробнее</a>
            ${cartActionMarkup(p)}
          </div>
        </div>
      </div>
    `);
  }

  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-add-cart]");
    if(!btn) return;
    const id = btn.getAttribute("data-add-cart");
    const p = UI.getProductById(id);
    const result = Store.addToCart(id, 1);
    if(!result.ok){ UI.showModal('Нет в наличии', `<p>${UI.esc(result.error)}</p>`); return; }
    const extra = result.limited ? `<p class="small">В корзине уже максимальное количество для этой позиции: ${result.max} шт.</p>` : '';
    UI.showModal("Товар добавлен", `<p><b>${(p?.title||"Товар").replace(/[<>]/g, "")}</b> добавлен в корзину.</p>${extra}<p><a class="btn primary small" href="cart.html">Перейти в корзину</a></p>`);
  });

  function render(){
    if(!grid || !pager || !count) return;

    const f = readFilters();
    const filtered = sortProducts(filterProducts(products, f), f.sort);

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    state.page = Math.min(state.page, pages);

    const start = (state.page - 1) * state.perPage;
    const pageItems = filtered.slice(start, start + state.perPage);

    grid.innerHTML = "";
    const gf = document.createDocumentFragment();
    pageItems.forEach(p => gf.append(card(p)));
    grid.append(gf);

    count.textContent = `Найдено: ${total} • Страница ${state.page}/${pages}`;

    pager.innerHTML = "";
    const pf = document.createDocumentFragment();
    for(let i=1;i<=pages;i++){
      pf.append(UI.el(`<button class="pagebtn ${i===state.page?'active':''}" data-page="${i}">${i}</button>`));
    }
    pager.append(pf);
  }

  if(presetQ && fQuery) fQuery.value = presetQ;

  if(applyBtn) applyBtn.addEventListener("click", ()=>{
    state.page = 1;
    render();
    if(window.innerWidth <= 860) closeFilters();
  });

  const liveControls = [fQuery, fCategory, fMaterial, fMin, fMax, fStock].filter(Boolean);
  liveControls.forEach(control=>{
    const eventName = control.type === "checkbox" || control.tagName === "SELECT" ? "change" : "input";
    control.addEventListener(eventName, ()=>{ state.page = 1; render(); });
  });

  if(resetBtn) resetBtn.addEventListener("click", ()=>{
    if(fQuery) fQuery.value = "";
    if(fCategory) fCategory.value = "";
    if(fMaterial) fMaterial.value = "";
    if(fMin) fMin.value = "";
    if(fMax) fMax.value = "";
    if(fStock) fStock.checked = false;
    if(sort) sort.value = DEFAULT_SORT;
    state.page = 1;
    render();
  });

  if(sort) sort.addEventListener("change", render);

  if(pager){
    pager.addEventListener('click', (e)=>{
      const btn = e.target.closest('.pagebtn');
      if(!btn) return;
      const next = Number(btn.dataset.page || 1);
      if(!Number.isFinite(next) || next < 1 || next === state.page) return;
      state.page = next;
      render();
    });
  }

  if(filterToggle) filterToggle.addEventListener("click", toggleFilters);
  if(filterBackdrop) filterBackdrop.addEventListener("click", closeFilters);
  window.addEventListener("resize", ()=>{ if(window.innerWidth > 860) closeFilters(); });
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeFilters(); });

  render();
})();

