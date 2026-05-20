(function(){
  UI.injectLayout();

  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '';
  const products = Store.getProducts();
  const product = products.find(item => item.id === id) || products[0];

  const elTitle = UI.qs('#title');
  const elCrumb = UI.qs('#crumb');
  const elMeta = UI.qs('#meta');
  const elPrice = UI.qs('#price');
  const elOld = UI.qs('#old');
  const elStock = UI.qs('#stock');
  const elSize = UI.qs('#size');
  const elDeliv = UI.qs('#delivery');
  const elDesc = UI.qs('#desc');
  const elStockCount = UI.qs('#stockCount');
  const reco = UI.qs('#reco');
  const elGallery = UI.qs('#gallery');
  const addToCartBtn = UI.qs('#addToCartBtn');
  const productReviewBtn = UI.qs('#productReviewBtn');
  const productReviewsList = UI.qs('#productReviewsList');
  const productReviewsEmpty = UI.qs('#productReviewsEmpty');

  if(!product){
    UI.showModal('Товар не найден', '<div class="notice">Перейдите в <a href="catalog.html"><b>каталог</b></a>.</div>');
    document.body.classList.add('is-ready');
    return;
  }

  document.title = `${product.title} — Нова`;
  if(elTitle) elTitle.textContent = product.title;
  if(elCrumb) elCrumb.textContent = product.title;
  if(elGallery) UI.applyProductImage(elGallery, product.id);

  if(elMeta){
    elMeta.innerHTML = `
      <span class="pill small">${UI.esc(product.category)}</span>
      <span class="pill small">${UI.esc(product.material)}</span>
      <span class="pill small">${UI.esc(product.color)}</span>`;
  }

  if(elPrice) elPrice.textContent = UI.money(product.price);
  if(elOld){
    if(product.oldPrice && product.oldPrice > product.price){
      elOld.style.display = '';
      elOld.textContent = UI.money(product.oldPrice);
    }else{
      elOld.style.display = 'none';
      elOld.textContent = '';
    }
  }

  if(elStock){
    const available = Store.getStock(product.id);
    elStock.textContent = available > 0 ? 'В наличии' : 'Нет в наличии';
    elStock.style.borderColor = available > 0 ? 'rgba(46,229,157,.28)' : 'rgba(255,77,109,.28)';
    elStock.style.background = available > 0 ? 'rgba(46,229,157,.10)' : 'rgba(255,77,109,.10)';
  }

  if(elSize) elSize.textContent = product.size || '—';
  if(elStockCount) elStockCount.textContent = UI.stockLabel(product.id);
  if(elDeliv) elDeliv.textContent = `${product.deliveryDays || 3} дн. • ${product.price >= 80000 ? 'бесплатно' : '990 ₽'}`;
  if(elDesc) elDesc.textContent = product.description || '';

  function reviewCard(review){
    const stars = '★'.repeat(Number(review.rating) || 5) + '☆'.repeat(5 - (Number(review.rating) || 5));
    return UI.el(`
      <article class="review-card">
        <div class="stars">${stars}</div>
        <p>${UI.esc(review.text)}</p>
        <div class="author">${UI.esc(review.userName)}</div>
        <div class="meta">${UI.esc(review.city || 'Проверенная покупка')} • ${UI.esc(UI.formatDateTime(review.createdAt))}</div>
      </article>
    `);
  }

  function renderReviews(){
    if(!productReviewsList || !productReviewsEmpty) return;
    const reviews = Store.getReviews(product.id, 'approved');
    productReviewsList.innerHTML = '';
    if(!reviews.length){
      productReviewsEmpty.classList.remove('hidden');
      productReviewsList.classList.add('hidden');
      return;
    }
    productReviewsEmpty.classList.add('hidden');
    productReviewsList.classList.remove('hidden');
    const frag = document.createDocumentFragment();
    reviews.forEach(review => frag.append(reviewCard(review)));
    productReviewsList.append(frag);
  }

  function recoCard(item){
    const node = UI.el(`
      <div class="card">
        <div class="thumb"></div>
        <div class="body">
          <div class="row spread"><h3 class="title">${UI.esc(item.title)}</h3></div>
          <div class="small">${UI.esc(item.category)} • ${UI.esc(item.material)} • ${UI.esc(item.color)}</div>
          <div class="price" style="margin-top:10px">
            <b>${UI.money(item.price)}</b>
            ${item.oldPrice ? `<s>${UI.money(item.oldPrice)}</s>` : ``}
          </div>
          <div class="actions">
            <a class="btn primary small" href="product.html?id=${encodeURIComponent(item.id)}">Подробнее</a>
            ${Store.getStock(item.id) > 0 ? `<button class="btn small" type="button" data-add-cart="${item.id}">В корзину</button>` : `<button class="btn small" type="button" disabled>Нет в наличии</button>`}
          </div>
        </div>
      </div>
    `);
    UI.applyProductImage(node.querySelector('.thumb'), item.id);
    return node;
  }

  if(addToCartBtn){
    const available = Store.getStock(product.id);
    if(available <= 0){ addToCartBtn.disabled = true; addToCartBtn.textContent = 'Нет в наличии'; }
    addToCartBtn.addEventListener('click', () => {
      const result = Store.addToCart(product.id, 1);
      if(!result.ok){ UI.showModal('Нет в наличии', `<p>${UI.esc(result.error)}</p>`); return; }
      const extra = result.limited ? `<p class="small">Вы выбрали весь доступный остаток: ${result.max} шт.</p>` : '';
      UI.showModal('Товар добавлен', `<p><b>${UI.esc(product.title)}</b> добавлен в корзину.</p>${extra}<p><a class="btn primary small" href="cart.html">Перейти в корзину</a></p>`);
    });
  }

  if(productReviewBtn){
    const purchased = Store.hasPurchasedProduct(product.id);
    productReviewBtn.href = `reviews.html?product=${encodeURIComponent(product.id)}`;
    productReviewBtn.textContent = purchased ? 'Оценить купленный товар' : 'Как оставить отзыв';
  }

  if(reco){
    const sameCategory = products.filter(item => item.id !== product.id && item.category === product.category);
    const pool = (sameCategory.length ? sameCategory : products.filter(item => item.id !== product.id))
      .slice()
      .sort((a, b) => (Store.getStock(b.id) - Store.getStock(a.id)) || (a.price - b.price))
      .slice(0, 4);
    reco.innerHTML = '';
    pool.forEach(item => reco.append(recoCard(item)));
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-cart]');
    if(!btn) return;
    const nextId = btn.getAttribute('data-add-cart');
    const item = UI.getProductById(nextId);
    const result = Store.addToCart(nextId, 1);
    if(!result.ok){ UI.showModal('Нет в наличии', `<p>${UI.esc(result.error)}</p>`); return; }
    const extra = result.limited ? `<p class="small">В корзине уже максимально возможное количество: ${result.max} шт.</p>` : '';
    UI.showModal('Товар добавлен', `<p><b>${UI.esc(item?.title || 'Товар')}</b> добавлен в корзину.</p>${extra}<p><a class="btn primary small" href="cart.html">Перейти в корзину</a></p>`);
  });

  renderReviews();
})();
