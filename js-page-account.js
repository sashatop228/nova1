(function(){
  UI.injectLayout();

  const guest = UI.qs('#accountGuest');
  const userWrap = UI.qs('#accountUser');
  const adminWrap = UI.qs('#accountAdmin');
  const meta = UI.qs('#accountMeta');
  const ordersList = UI.qs('#ordersList');
  const archiveWrap = UI.qs('#ordersArchiveWrap');
  const returnsArchiveWrap = UI.qs('#returnsArchiveWrap');
  const returnsList = UI.qs('#returnsList');
  const favoritesText = UI.qs('#favoritesText');
  const lastOrderEmpty = UI.qs('#lastOrderEmpty');
  const lastOrderCard = UI.qs('#lastOrderCard');
  const lastOrderId = UI.qs('#lastOrderId');
  const lastOrderDate = UI.qs('#lastOrderDate');
  const lastOrderItems = UI.qs('#lastOrderItems');
  const lastOrderTotal = UI.qs('#lastOrderTotal');
  const lastOrderPayment = UI.qs('#lastOrderPayment');
  const lastOrderDelivery = UI.qs('#lastOrderDelivery');

  const adminMeta = UI.qs('#adminMeta');
  const adminStats = UI.qs('#adminStats');
  const adminInventory = UI.qs('#adminInventory');
  const adminReviewsQueue = UI.qs('#adminReviewsQueue');
  const adminReturnsQueue = UI.qs('#adminReturnsQueue');
  const adminOrdersList = UI.qs('#adminOrdersList');
  const adminProductForm = UI.qs('#adminProductForm');


  function getReturnStatusMeta(status){
    switch(String(status || 'new')){
      case 'approved':
        return { label:'Возврат одобрен', note:'Администратор подтвердил возврат. С вами свяжутся по указанным контактам.', className:'is-approved' };
      case 'rejected':
        return { label:'В возврате отказано', note:'Заявка отклонена. При необходимости можно отправить новую с уточнением причины.', className:'is-rejected' };
      case 'in_progress':
        return { label:'Заявка в работе', note:'Заявка рассматривается администратором.', className:'is-progress' };
      default:
        return { label:'Заявка отправлена', note:'Заявка зарегистрирована и ожидает рассмотрения.', className:'is-new' };
    }
  }

  function findReturnRequest(orderId, productId, requests){
    return (requests || []).find(request => String(request.orderId) === String(orderId) && String(request.productId) === String(productId)) || null;
  }

  function orderActions(order, item, requests){
    const request = findReturnRequest(order.id, item.id, requests);
    const statusMarkup = request
      ? `<span class="status-pill ${getReturnStatusMeta(request.status).className}">${getReturnStatusMeta(request.status).label}</span>`
      : '';
    return `
      <div class="account-line-actions">
        ${statusMarkup}
        <a class="btn small" href="reviews.html?product=${encodeURIComponent(item.id)}&order=${encodeURIComponent(order.id)}">Оценить</a>
        <a class="btn small" href="contacts.html?product=${encodeURIComponent(item.id)}&order=${encodeURIComponent(order.id)}">Возврат</a>
      </div>
    `;
  }

  function renderOrderItems(order, full, requests){
    return (order.items || []).map(item => {
      const product = UI.getProductById(item.id);
      const title = UI.esc(product ? product.title : item.id);
      const qty = Number(item.qty) || 0;
      const price = UI.money((product?.price || item.price || 0) * qty);
      if(full){
        return `
          <div class="order-item order-item-extended">
            <div>
              <span>${title} × ${qty}</span>
              ${orderActions(order, item, requests)}
            </div>
            <b>${price}</b>
          </div>
        `;
      }
      return `
        <div class="account-order-line account-order-line-extended">
          <div>• ${title} — ${qty} x ${UI.money(product?.price || item.price || 0)}</div>
          ${orderActions(order, item, requests)}
        </div>
      `;
    }).join('');
  }

  function renderCustomer(){
    const user = Store.getCurrentUser();
    const orders = Store.getOrders();
    const returnRequests = Store.getReturnRequests();
    guest?.classList.toggle('hidden', !!user);
    userWrap?.classList.toggle('hidden', !user || Store.isAdmin(user));
    adminWrap?.classList.toggle('hidden', true);
    if(!user || Store.isAdmin(user)) return;

    if(meta) meta.textContent = `История покупок и быстрые действия. ${user.email}`;
    if(favoritesText) favoritesText.textContent = 'Теперь после покупки можно оставить отзыв или оформить возврат по браку.';

    const latest = orders[0];
    const hasOrders = !!latest;
    lastOrderEmpty?.classList.toggle('hidden', hasOrders);
    lastOrderCard?.classList.toggle('hidden', !hasOrders);
    archiveWrap?.classList.toggle('hidden', orders.length < 2);
    returnsArchiveWrap?.classList.toggle('hidden', !returnRequests.length);

    if(hasOrders){
      if(lastOrderId) lastOrderId.textContent = latest.id.replace('NOVA-', 'NF-');
      if(lastOrderDate) lastOrderDate.textContent = UI.formatDateTime(latest.createdAt);
      if(lastOrderItems) lastOrderItems.innerHTML = renderOrderItems(latest, false, returnRequests);
      if(lastOrderTotal) lastOrderTotal.textContent = UI.money(latest.totals.total);
      if(lastOrderPayment) lastOrderPayment.textContent = latest.paymentMethod === 'sbp' ? 'СБП' : 'Карта';
      if(lastOrderDelivery) lastOrderDelivery.textContent = latest.deliveryPlace || 'Место доставки не указано';
    }

    if(ordersList){
      ordersList.innerHTML = '';
      orders.slice(1).forEach(order => {
        ordersList.append(UI.el(`
          <article class="order-card account-history-card">
            <div class="spread wrap">
              <div>
                <div style="font-weight:800">${UI.esc(order.id.replace('NOVA-', 'NF-'))}</div>
                <div class="small">${UI.esc(UI.formatDateTime(order.createdAt))}</div>
              </div>
              <div class="pill small">${order.paymentMethod === 'sbp' ? 'СБП' : 'Карта'} • ${UI.money(order.totals.total)}</div>
            </div>
            <div class="small" style="margin-top:10px">Доставка: ${UI.esc(order.deliveryPlace || 'не указана')}</div>
            <div class="order-items">${renderOrderItems(order, true, returnRequests)}</div>
          </article>
        `));
      });
    }

    if(returnsList){
      returnsList.innerHTML = '';
      returnRequests.forEach(request => {
        const meta = getReturnStatusMeta(request.status);
        returnsList.append(UI.el(`
          <article class="panel return-status-card">
            <div class="spread wrap">
              <div>
                <h4 style="margin-bottom:6px">${UI.esc(request.productTitle)}</h4>
                <div class="small">Заказ ${UI.esc(request.orderId.replace('NOVA-', 'NF-'))} • ${UI.esc(UI.formatDateTime(request.createdAt))}</div>
              </div>
              <span class="status-pill ${meta.className}">${meta.label}</span>
            </div>
            <div class="small" style="margin-top:10px"><b>Причина:</b> ${UI.esc(request.reason)}</div>
            <p style="margin-top:10px">${UI.esc(request.comment)}</p>
            <div class="notice" style="margin-top:12px">${UI.esc(meta.note)}</div>
          </article>
        `));
      });
    }
  }

  function renderAdmin(){
    const user = Store.getCurrentUser();
    const isAdmin = Store.isAdmin(user);
    guest?.classList.toggle('hidden', !!user);
    userWrap?.classList.toggle('hidden', true);
    adminWrap?.classList.toggle('hidden', !isAdmin);
    if(!isAdmin) return;

    const products = Store.getProducts();
    const orders = Store.getAllOrders();
    const reviewQueue = Store.getReviews('', 'pending');
    const returnQueue = Store.getReturnRequests();

    if(adminMeta) adminMeta.textContent = `Вы вошли как ${user.name}. Здесь можно управлять карточками товаров, остатками, отзывами и возвратами.`;

    if(adminStats){
      adminStats.innerHTML = `
        <div class="admin-stat"><b>${products.length}</b><span>товаров в каталоге</span></div>
        <div class="admin-stat"><b>${orders.length}</b><span>оформленных заказов</span></div>
        <div class="admin-stat"><b>${reviewQueue.length}</b><span>отзывов ждут модерации</span></div>
        <div class="admin-stat"><b>${returnQueue.filter(item => item.status === 'new').length}</b><span>новых заявок на возврат</span></div>
      `;
    }

    if(adminInventory){
      adminInventory.innerHTML = '';
      products.forEach(product => {
        adminInventory.append(UI.el(`
          <article class="panel admin-card">
            <div class="spread wrap">
              <div>
                <h4 style="margin-bottom:6px">${UI.esc(product.title)}</h4>
                <div class="small">${UI.esc(product.category)} • ${UI.money(product.price)}</div>
              </div>
              <span class="pill small">Остаток: ${Store.getStock(product.id)} шт.</span>
            </div>
            <div class="admin-stock-controls">
              <button class="btn small" type="button" data-stock-quick="-1" data-product-id="${product.id}">-1</button>
              <button class="btn small" type="button" data-stock-quick="1" data-product-id="${product.id}">+1</button>
              <form class="admin-stock-form" data-stock-form="${product.id}">
                <input class="input" type="number" min="1" value="1" name="amount" />
                <button class="btn small" type="submit" data-stock-op="add">Добавить</button>
                <button class="btn small" type="submit" data-stock-op="remove">Списать</button>
              </form>
            </div>
          </article>
        `));
      });
    }

    if(adminReviewsQueue){
      adminReviewsQueue.innerHTML = '';
      if(!reviewQueue.length){
        adminReviewsQueue.innerHTML = '<div class="notice">Новых отзывов на модерации нет.</div>';
      }else{
        reviewQueue.forEach(review => {
          adminReviewsQueue.append(UI.el(`
            <article class="panel admin-card">
              <div class="spread wrap">
                <div>
                  <h4 style="margin-bottom:6px">${UI.esc(review.productTitle)}</h4>
                  <div class="small">${UI.esc(review.userName)} • заказ ${UI.esc(review.orderId.replace('NOVA-', 'NF-'))} • ${UI.esc(UI.formatDateTime(review.createdAt))}</div>
                </div>
                <span class="pill small">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
              </div>
              <p style="margin-top:10px">${UI.esc(review.text)}</p>
              <div class="actions" style="margin-top:12px">
                <button class="btn primary small" type="button" data-review-action="approved" data-review-id="${review.id}">Одобрить</button>
                <button class="btn small" type="button" data-review-action="rejected" data-review-id="${review.id}">Отклонить</button>
              </div>
            </article>
          `));
        });
      }
    }

    if(adminReturnsQueue){
      adminReturnsQueue.innerHTML = '';
      if(!returnQueue.length){
        adminReturnsQueue.innerHTML = '<div class="notice">Заявок на возврат пока нет.</div>';
      }else{
        returnQueue.forEach(request => {
          const statusMeta = getReturnStatusMeta(request.status);
          adminReturnsQueue.append(UI.el(`
            <article class="panel admin-card">
              <div class="spread wrap">
                <div>
                  <h4 style="margin-bottom:6px">${UI.esc(request.productTitle)}</h4>
                  <div class="small">${UI.esc(request.userName)} • ${UI.esc(request.userEmail)} • заказ ${UI.esc(request.orderId.replace('NOVA-', 'NF-'))}</div>
                </div>
                <span class="status-pill ${statusMeta.className}">${UI.esc(statusMeta.label)}</span>
              </div>
              <div class="small" style="margin-top:10px"><b>Причина:</b> ${UI.esc(request.reason)}</div>
              <div class="small" style="margin-top:6px"><b>Контакт:</b> ${UI.esc(request.contact || 'не указан')}</div>
              <p style="margin-top:10px">${UI.esc(request.comment)}</p>
              <div class="actions" style="margin-top:12px">
                <button class="btn small" type="button" data-return-action="in_progress" data-return-id="${request.id}">В работу</button>
                <button class="btn primary small" type="button" data-return-action="approved" data-return-id="${request.id}">Принять</button>
                <button class="btn small" type="button" data-return-action="rejected" data-return-id="${request.id}">Отклонить</button>
              </div>
            </article>
          `));
        });
      }
    }

    if(adminOrdersList){
      adminOrdersList.innerHTML = '';
      if(!orders.length){
        adminOrdersList.innerHTML = '<div class="notice">Оформленных заказов пока нет.</div>';
      }else{
        orders.slice(0, 8).forEach(order => {
          adminOrdersList.append(UI.el(`
            <article class="panel admin-card">
              <div class="spread wrap">
                <div>
                  <h4 style="margin-bottom:6px">${UI.esc(order.id.replace('NOVA-', 'NF-'))}</h4>
                  <div class="small">${UI.esc(order.userName)} • ${UI.esc(order.userEmail)}</div>
                </div>
                <span class="pill small">${UI.money(order.totals.total)}</span>
              </div>
              <div class="small" style="margin-top:10px">${UI.esc(UI.formatDateTime(order.createdAt))} • ${UI.esc(order.deliveryPlace || 'адрес не указан')}</div>
            </article>
          `));
        });
      }
    }
  }

  function render(){
    const user = Store.getCurrentUser();
    if(!user){
      guest?.classList.remove('hidden');
      userWrap?.classList.add('hidden');
      adminWrap?.classList.add('hidden');
      return;
    }
    if(Store.isAdmin(user)) renderAdmin();
    else renderCustomer();
  }

  UI.qs('#loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = Store.login(UI.qs('#loginEmail').value, UI.qs('#loginPassword').value);
    if(!result.ok){ UI.showModal('Ошибка входа', `<p>${UI.esc(result.error)}</p>`); return; }
    render();
  });

  adminProductForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const result = Store.addProduct({
      title: fd.get('title'),
      category: fd.get('category'),
      price: fd.get('price'),
      oldPrice: fd.get('oldPrice'),
      material: fd.get('material'),
      color: fd.get('color'),
      stockCount: fd.get('stockCount'),
      deliveryDays: fd.get('deliveryDays'),
      size: fd.get('size'),
      image: fd.get('image'),
      tags: fd.get('tags'),
      description: fd.get('description')
    });
    if(!result.ok){
      UI.showModal('Не удалось добавить товар', `<p>${UI.esc(result.error)}</p>`);
      return;
    }
    form.reset();
    UI.showModal('Товар добавлен', `<p>Карточка товара <b>${UI.esc(result.product.title)}</b> добавлена в каталог.</p>`);
    renderAdmin();
  });

  document.addEventListener('click', (e) => {
    const logoutBtn = e.target.closest('#logoutBtn, #adminLogoutBtn, #accountLogoutBtn');
    if(logoutBtn){
      Store.logout();
      render();
      return;
    }

    const quick = e.target.closest('[data-stock-quick]');
    if(quick){
      const delta = Number(quick.getAttribute('data-stock-quick') || 0);
      const id = quick.getAttribute('data-product-id');
      Store.adjustStock(id, delta);
      renderAdmin();
      return;
    }

    const reviewAction = e.target.closest('[data-review-action]');
    if(reviewAction){
      const status = reviewAction.getAttribute('data-review-action');
      const id = reviewAction.getAttribute('data-review-id');
      const result = Store.moderateReview(id, status);
      if(!result.ok) UI.showModal('Ошибка', `<p>${UI.esc(result.error)}</p>`);
      renderAdmin();
      return;
    }

    const returnAction = e.target.closest('[data-return-action]');
    if(returnAction){
      const status = returnAction.getAttribute('data-return-action');
      const id = returnAction.getAttribute('data-return-id');
      const result = Store.updateReturnRequest(id, status);
      if(!result.ok) UI.showModal('Ошибка', `<p>${UI.esc(result.error)}</p>`);
      renderAdmin();
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-stock-form]');
    if(!form) return;
    e.preventDefault();
    const productId = form.getAttribute('data-stock-form');
    const amount = Math.max(1, Number(new FormData(form).get('amount')) || 1);
    const submitter = e.submitter;
    const op = submitter?.getAttribute('data-stock-op') || 'add';
    Store.adjustStock(productId, op === 'remove' ? -amount : amount);
    renderAdmin();
  });

  render();
})();
