(function(){
  UI.injectLayout();

  const sampleReviews = [
    { id:'sample-1', userName:'Марина', city:'Киров', rating:5, text:'Заказывали угловой диван для гостиной. Доставили аккуратно, собрали в тот же день, ткань выглядит даже лучше, чем на фото.', createdAt:'2026-03-18T10:30:00.000Z', productTitle:'Угловой диван' },
    { id:'sample-2', userName:'Илья', city:'Яранск', rating:5, text:'Понравилось, что менеджер помог подобрать стол под размеры кухни. Всё пришло вовремя, упаковка была надёжная.', createdAt:'2026-03-06T09:10:00.000Z', productTitle:'Обеденный стол' },
    { id:'sample-3', userName:'Светлана', city:'Котельнич', rating:4, text:'Брали кровать и две тумбы. Сервис вежливый, сборка быстрая. Отдельный плюс за понятные ответы по срокам доставки.', createdAt:'2026-02-22T15:20:00.000Z', productTitle:'Кровать' }
  ];

  const reviewForm = document.getElementById('reviewForm');
  const reviewGuestState = document.getElementById('reviewGuestState');
  const reviewReadyState = document.getElementById('reviewReadyState');
  const reviewPurchase = document.getElementById('review-purchase');
  const reviewName = document.getElementById('review-name');
  const reviewCity = document.getElementById('review-city');
  const reviewText = document.getElementById('review-text');
  const reviewsList = document.getElementById('reviewsList');
  const emptyState = document.getElementById('reviewsEmpty');
  const ratingInput = document.getElementById('review-rating');
  const ratingStars = Array.from(document.querySelectorAll('.rating-star'));

  const params = new URLSearchParams(location.search);
  const preselectedProduct = params.get('product') || '';
  const preselectedOrder = params.get('order') || '';

  function setRating(value){
    const rating = Math.max(1, Math.min(5, Number(value) || 5));
    if(ratingInput) ratingInput.value = String(rating);
    ratingStars.forEach((star, index) => {
      const active = index < rating;
      star.classList.toggle('active', active);
      star.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  ratingStars.forEach(star => {
    star.addEventListener('click', () => setRating(star.getAttribute('data-rating')));
  });
  setRating(5);

  function renderPublicReviews(){
    if(!reviewsList || !emptyState) return;
    const dynamic = Store.getReviews('', 'approved').map(review => ({ ...review, dynamic:true }));
    const items = [...dynamic, ...sampleReviews].sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    reviewsList.innerHTML = '';
    if(!items.length){
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    const frag = document.createDocumentFragment();
    items.forEach(review => {
      const stars = '★'.repeat(Number(review.rating) || 5) + '☆'.repeat(5 - (Number(review.rating) || 5));
      const metaParts = [review.city || 'Проверенная покупка'];
      if(review.productTitle) metaParts.unshift(review.productTitle);
      frag.append(UI.el(`
        <article class="review-card">
          <div class="stars">${stars}</div>
          <p>${UI.esc(review.text)}</p>
          <div class="author">${UI.esc(review.userName)}</div>
          <div class="meta">${UI.esc(metaParts.join(' • '))}</div>
        </article>
      `));
    });
    reviewsList.append(frag);
  }

  function buildPurchaseOptions(){
    const purchases = Store.getPurchasedProducts();
    const user = Store.getCurrentUser();
    if(reviewName && user) reviewName.value = user.name || '';

    if(!reviewGuestState || !reviewReadyState || !reviewPurchase) return;
    reviewGuestState.classList.toggle('hidden', !!user);
    reviewReadyState.classList.toggle('hidden', !user);
    reviewForm?.classList.toggle('hidden', !user);
    if(!user) return;

    reviewPurchase.innerHTML = '<option value="">Выберите купленный товар</option>';
    let list = purchases.slice();
    if(preselectedProduct) list = list.filter(item => item.productId === preselectedProduct);
    const frag = document.createDocumentFragment();
    list.forEach(item => {
      const option = document.createElement('option');
      option.value = item.key;
      option.textContent = `${item.productTitle} • заказ ${item.orderId.replace('NOVA-', 'NF-')} • ${UI.formatDateTime(item.createdAt)}`;
      if(preselectedOrder && item.orderId === preselectedOrder) option.selected = true;
      frag.append(option);
    });
    reviewPurchase.append(frag);

    const hasItems = list.length > 0;
    reviewReadyState.innerHTML = hasItems
      ? '<span class="small">Оставить отзыв можно только для товаров, которые уже были куплены через этот аккаунт. Сначала отзыв попадёт на модерацию.</span>'
      : '<span class="small">У этого аккаунта пока нет покупок, доступных для оценки.</span>';

    [reviewPurchase, reviewName, reviewCity, reviewText, ...ratingStars].forEach(el => { if(el) el.disabled = !hasItems; });
    const submitBtn = reviewForm?.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.disabled = !hasItems;
    if(hasItems && !reviewPurchase.value && list.length === 1) reviewPurchase.value = list[0].key;
  }

  if(reviewForm){
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const selected = String(reviewPurchase?.value || '');
      if(!selected){
        UI.showModal('Выберите покупку', '<p>Чтобы оставить отзыв, выберите купленный товар из списка.</p>');
        return;
      }
      const [orderId, productId] = selected.split('::');
      const result = Store.addReview({
        orderId,
        productId,
        userName: reviewName?.value,
        city: reviewCity?.value,
        rating: Number(ratingInput?.value || 5),
        text: reviewText?.value
      });
      if(!result.ok){
        UI.showModal('Не удалось отправить отзыв', `<p>${UI.esc(result.error)}</p>`);
        return;
      }
      UI.showModal('Спасибо за отзыв', `<p>Ваш отзыв по товару <b>${UI.esc(result.review.productTitle)}</b> принят и отправлен на модерацию.</p>`);
      reviewForm.reset();
      if(reviewName && Store.getCurrentUser()) reviewName.value = Store.getCurrentUser().name || '';
      setRating(5);
      buildPurchaseOptions();
    });
  }

  renderPublicReviews();
  buildPurchaseOptions();
})();
