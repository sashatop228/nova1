(function(){
  UI.injectLayout();


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

  function productCard(p){
    const img = (window.Data && typeof Data.resolveAsset === "function") ? Data.resolveAsset(p.image) : p.image;

    return UI.el(`
      <div class="card">
        <div class="thumb" style="--thumb:url('${img}')"></div>
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

  const hits = Data.products
    .slice()
    .sort((a,b)=> (Number(!!b.inStock)-Number(!!a.inStock)) || ((b.oldPrice? (b.oldPrice-b.price):0) - (a.oldPrice? (a.oldPrice-a.price):0)) || (a.price-b.price))
    .slice(0,8);

  const grid = document.getElementById("hitGrid");
  if(grid){
    const frag = document.createDocumentFragment();
    hits.forEach(p => frag.append(productCard(p)));
    grid.append(frag);
  }

  const wp = document.getElementById("weekPicks");
  if(wp){
    const frag = document.createDocumentFragment();
    hits.slice(0,3).forEach(p=>{
      frag.append(UI.el(`
        <a class="notice" href="product.html?id=${encodeURIComponent(p.id)}" style="display:block">
          <div class="row spread">
            <div>
              <div style="font-weight:800">${p.title}</div>
              <div class="small">${UI.money(p.price)}</div>
            </div>
            <span class="pill small">→</span>
          </div>
        </a>
      `));
    });
    wp.append(frag);
  }

  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-add-cart]");
    if(!btn) return;
    const id = btn.getAttribute("data-add-cart");
    const p = UI.getProductById(id);
    const result = Store.addToCart(id, 1);
    if(!result.ok){ UI.showModal('Нет в наличии', `<p>${UI.esc(result.error)}</p>`); return; }
    const extra = result.limited ? `<p class="small">Доступный остаток по позиции уже достигнут: ${result.max} шт.</p>` : '';
    UI.showModal("Товар добавлен", `<p><b>${(p?.title||"Товар").replace(/[<>]/g, "")}</b> добавлен в корзину.</p>${extra}<p><a class="btn primary small" href="cart.html">Перейти в корзину</a></p>`);
  });
})();
