(function(){
  UI.injectLayout();

  const products = Store.getProducts();

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

  function productCard(product){
    const node = UI.el(`
      <div class="card">
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

  const hits = products
    .slice()
    .sort((a, b) => (Store.getStock(b.id) - Store.getStock(a.id)) || ((b.oldPrice ? (b.oldPrice - b.price) : 0) - (a.oldPrice ? (a.oldPrice - a.price) : 0)) || (a.price - b.price))
    .slice(0, 8);

  const grid = document.getElementById('hitGrid');
  if(grid){
    const frag = document.createDocumentFragment();
    hits.forEach(product => frag.append(productCard(product)));
    grid.append(frag);
  }

  const picks = document.getElementById('weekPicks');
  if(picks){
    const frag = document.createDocumentFragment();
    hits.slice(0, 3).forEach(product => {
      frag.append(UI.el(`
        <a class="notice" href="product.html?id=${encodeURIComponent(product.id)}" style="display:block">
          <div class="row spread">
            <div>
              <div style="font-weight:800">${UI.esc(product.title)}</div>
              <div class="small">${UI.money(product.price)}</div>
            </div>
            <span class="pill small">→</span>
          </div>
        </a>
      `));
    });
    picks.append(frag);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-cart]');
    if(!btn) return;
    const id = btn.getAttribute('data-add-cart');
    const product = UI.getProductById(id);
    const result = Store.addToCart(id, 1);
    if(!result.ok){
      UI.showModal('Нет в наличии', `<p>${UI.esc(result.error)}</p>`);
      return;
    }
    const extra = result.limited ? `<p class="small">Доступный остаток по позиции уже достигнут: ${result.max} шт.</p>` : '';
    UI.showModal('Товар добавлен', `<p><b>${UI.esc(product?.title || 'Товар')}</b> добавлен в корзину.</p>${extra}<p><a class="btn primary small" href="cart.html">Перейти в корзину</a></p>`);
  });
})();
