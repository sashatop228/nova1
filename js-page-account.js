(function(){
  UI.injectLayout();

  const guest = UI.qs('#accountGuest');
  const userWrap = UI.qs('#accountUser');
  const meta = UI.qs('#accountMeta');
  const ordersList = UI.qs('#ordersList');
  const archiveWrap = UI.qs('#ordersArchiveWrap');
  const favoritesText = UI.qs('#favoritesText');
  const lastOrderEmpty = UI.qs('#lastOrderEmpty');
  const lastOrderCard = UI.qs('#lastOrderCard');
  const lastOrderId = UI.qs('#lastOrderId');
  const lastOrderDate = UI.qs('#lastOrderDate');
  const lastOrderItems = UI.qs('#lastOrderItems');
  const lastOrderTotal = UI.qs('#lastOrderTotal');
  const lastOrderPayment = UI.qs('#lastOrderPayment');
  const lastOrderDelivery = UI.qs('#lastOrderDelivery');

  function fmtDate(iso){
    return new Date(iso).toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
  }

  function renderOrderItems(order, full){
    return order.items.map(item=>{
      const p = UI.getProductById(item.id);
      const title = UI.esc(p ? p.title : item.id);
      const qty = Number(item.qty) || 0;
      const sum = UI.money((p?.price || item.price || 0) * qty);
      return full
        ? `<div class="order-item"><span>${title} × ${qty}</span><b>${sum}</b></div>`
        : `<div class="account-order-line">• ${title} — ${qty} x ${UI.money(p?.price || item.price || 0)}</div>`;
    }).join('');
  }

  function renderOrders(){
    const user = Store.getCurrentUser();
    const orders = Store.getOrders();
    guest?.classList.toggle('hidden', !!user);
    userWrap?.classList.toggle('hidden', !user);
    if(!user) return;

    if(meta) meta.textContent = `Избранное и последний заказ. ${user.email}`;
    if(favoritesText) favoritesText.textContent = 'В избранном пока пусто.';

    const latest = orders[0];
    const hasOrders = !!latest;
    lastOrderEmpty?.classList.toggle('hidden', hasOrders);
    lastOrderCard?.classList.toggle('hidden', !hasOrders);
    archiveWrap?.classList.toggle('hidden', orders.length < 2);

    if(hasOrders){
      if(lastOrderId) lastOrderId.textContent = latest.id.replace('NOVA-', 'NF-');
      if(lastOrderDate) lastOrderDate.textContent = fmtDate(latest.createdAt);
      if(lastOrderItems) lastOrderItems.innerHTML = renderOrderItems(latest, false);
      if(lastOrderTotal) lastOrderTotal.textContent = UI.money(latest.totals.total);
      if(lastOrderPayment) lastOrderPayment.textContent = latest.paymentMethod === 'sbp' ? 'СБП' : 'Карта';
      if(lastOrderDelivery) lastOrderDelivery.textContent = latest.deliveryPlace || 'Место доставки не указано';
    }

    if(ordersList){
      ordersList.innerHTML = '';
      orders.slice(1).forEach(order=>{
        const node = UI.el(`
          <article class="order-card account-history-card">
            <div class="spread wrap">
              <div>
                <div style="font-weight:800">${UI.esc(order.id.replace('NOVA-', 'NF-'))}</div>
                <div class="small">${fmtDate(order.createdAt)}</div>
              </div>
              <div class="pill small">${order.paymentMethod === 'sbp' ? 'СБП' : 'Карта'} • ${UI.money(order.totals.total)}</div>
            </div>
            <div class="small" style="margin-top:10px">Доставка: ${UI.esc(order.deliveryPlace || 'не указана')}</div>
            <div class="order-items">
              ${renderOrderItems(order, true)}
            </div>
          </article>
        `);
        ordersList.append(node);
      });
    }
  }

  UI.qs('#loginForm')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const result = Store.login(UI.qs('#loginEmail').value, UI.qs('#loginPassword').value);
    if(!result.ok){ UI.showModal('Ошибка входа', `<p>${UI.esc(result.error)}</p>`); return; }
    renderOrders();
  });

  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('#logoutBtn');
    if(!btn) return;
    Store.logout();
    renderOrders();
  });

  renderOrders();
})();
