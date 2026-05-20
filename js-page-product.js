(function(){
  UI.injectLayout();

  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '';
  const p = Data.products.find(x => x.id === id) || Data.products[0];

  const elTitle = UI.qs('#title');
  const elCrumb = UI.qs('#crumb');
  const elMeta  = UI.qs('#meta');
  const elPrice = UI.qs('#price');
  const elOld   = UI.qs('#old');
  const elStock = UI.qs('#stock');
  const elSize  = UI.qs('#size');
  const elDeliv = UI.qs('#delivery');
  const elDesc  = UI.qs('#desc');
  const elStockCount = UI.qs('#stockCount');
  const reco    = UI.qs('#reco');
  const elGallery = UI.qs('#gallery');
  const addToCartBtn = UI.qs('#addToCartBtn');

  if(!p){
    UI.showModal('Товар не найден', '<div class="notice">Перейди в <a href="catalog.html"><b>каталог</b></a>.</div>');
    document.body.classList.add('is-ready');
    return;
  }

  document.title = `${p.title} — Нова`;
  if(elTitle) elTitle.textContent = p.title;
  if(elCrumb) elCrumb.textContent = p.title;




if(elGallery){
  UI.applyProductImage(elGallery, p.id, "gallery");
}

  if(elMeta){
    elMeta.innerHTML = `
      <span class="pill small">${p.category}</span>
      <span class="pill small">${p.material}</span>
      <span class="pill small">${p.color}</span>`;
  }

  if(elPrice) elPrice.textContent = UI.money(p.price);

  if(elOld){
    if(p.oldPrice && p.oldPrice > p.price){
      elOld.style.display = '';
      elOld.textContent = UI.money(p.oldPrice);
    }else{
      elOld.style.display = 'none';
      elOld.textContent = '';
    }
  }

  if(elStock){
    const available = Store.getStock(p.id);
    elStock.textContent = available > 0 ? 'В наличии' : 'Нет в наличии';
    elStock.style.borderColor = available > 0 ? 'rgba(46,229,157,.28)' : 'rgba(255,77,109,.28)';
    elStock.style.background  = available > 0 ? 'rgba(46,229,157,.10)' : 'rgba(255,77,109,.10)';
  }

  if(elSize)  elSize.textContent = p.size || '—';
  if(elStockCount) elStockCount.textContent = UI.stockLabel(p.id);
  if(elDeliv) elDeliv.textContent = `${p.deliveryDays || 3} дн. • ${p.price >= 80000 ? 'бесплатно' : '990 ₽'}`;
  if(elDesc)  elDesc.textContent = p.description || '';

  function recoCard(x){
    const node = UI.el(`
      <div class="card">
        <div class="thumb" style="--thumb:url(\"${x.image}\")"></div>
        <div class="body">
          <div class="row spread">
            <h3 class="title">${x.title}</h3></div>
          <div class="small">${x.category} • ${x.material} • ${x.color}</div>
          <div class="price" style="margin-top:10px">
            <b>${UI.money(x.price)}</b>
            ${x.oldPrice ? `<s>${UI.money(x.oldPrice)}</s>` : ``}
          </div>
          <div class="actions">
            <a class="btn primary small" href="product.html?id=${encodeURIComponent(x.id)}">Подробнее</a>
            ${Store.getStock(x.id) > 0 ? `<button class="btn small" type="button" data-add-cart="${x.id}">В корзину</button>` : `<button class="btn small" type="button" disabled>Нет в наличии</button>`}
            
          </div>
        </div>
      </div>
    `);
    UI.applyProductImage(node.querySelector('.thumb'), x.id, 'thumb');
    return node;
  }

  if(addToCartBtn){
    const availableNow = Store.getStock(p.id);
    if(availableNow <= 0){ addToCartBtn.disabled = true; addToCartBtn.textContent = 'Нет в наличии'; }
    addToCartBtn.addEventListener('click', ()=>{
      const result = Store.addToCart(p.id, 1);
      if(!result.ok){ UI.showModal('Нет в наличии', `<p>${UI.esc(result.error)}</p>`); return; }
      const extra = result.limited ? `<p class="small">Вы выбрали весь доступный остаток: ${result.max} шт.</p>` : '';
      UI.showModal('Товар добавлен', `<p><b>${p.title.replace(/[<>]/g, '')}</b> добавлен в корзину.</p>${extra}<p><a class="btn primary small" href="cart.html">Перейти в корзину</a></p>`);
    });
  }

  if(reco){
    const sameCat = Data.products.filter(x => x.id !== p.id && x.category === p.category);
    const pool = (sameCat.length ? sameCat : Data.products.filter(x => x.id !== p.id))
      .slice()
      .sort((a,b)=> (Number(!!b.inStock)-Number(!!a.inStock)) || (a.price - b.price))
      .slice(0, 4);

    reco.innerHTML = '';
    pool.forEach(x => reco.append(recoCard(x)));
  }

  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-add-cart]');
    if(!btn) return;
    const id = btn.getAttribute('data-add-cart');
    const item = UI.getProductById(id);
    const result = Store.addToCart(id, 1);
    if(!result.ok){ UI.showModal('Нет в наличии', `<p>${UI.esc(result.error)}</p>`); return; }
    const extra = result.limited ? `<p class="small">В корзине уже максимально возможное количество: ${result.max} шт.</p>` : '';
    UI.showModal('Товар добавлен', `<p><b>${(item?.title||'Товар').replace(/[<>]/g, '')}</b> добавлен в корзину.</p>${extra}<p><a class="btn primary small" href="cart.html">Перейти в корзину</a></p>`);
  });
})();
