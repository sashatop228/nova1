(function(){
  UI.injectLayout();

  const returnForm = document.getElementById('returnForm');
  const returnPurchase = document.getElementById('return-purchase');
  const returnGuestState = document.getElementById('returnGuestState');
  const returnReadyState = document.getElementById('returnReadyState');
  const returnContact = document.getElementById('return-contact');
  const returnStatusSection = document.getElementById('returnStatusSection');
  const returnStatusList = document.getElementById('returnStatusList');

  function getReturnStatusMeta(status){
    switch(String(status || 'new')){
      case 'approved':
        return { label:'Возврат одобрен', note:'Администратор подтвердил заявку. Ожидайте дальнейшую связь по контактам.', className:'is-approved' };
      case 'rejected':
        return { label:'В возврате отказано', note:'Заявка отклонена. При необходимости можно отправить новую с уточнением причины.', className:'is-rejected' };
      case 'in_progress':
        return { label:'Заявка в работе', note:'Заявка рассматривается администратором.', className:'is-progress' };
      default:
        return { label:'Заявка отправлена', note:'Заявка зарегистрирована и ожидает решения администратора.', className:'is-new' };
    }
  }

  const params = new URLSearchParams(location.search);
  const preselectedProduct = params.get('product') || '';
  const preselectedOrder = params.get('order') || '';

  function renderState(){
    const user = Store.getCurrentUser();
    const purchases = Store.getPurchasedProducts();
    const requests = Store.getReturnRequests();
    if(returnGuestState) returnGuestState.classList.toggle('hidden', !!user);
    if(returnReadyState) returnReadyState.classList.toggle('hidden', !user);
    if(returnForm) returnForm.classList.toggle('hidden', !user);
    if(returnStatusSection) returnStatusSection.classList.toggle('hidden', !user || !requests.length);

    if(returnStatusList){
      returnStatusList.innerHTML = '';
      requests.forEach(request => {
        const meta = getReturnStatusMeta(request.status);
        returnStatusList.append(UI.el(`
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

    if(!user || !returnPurchase) return;

    if(returnContact) returnContact.value = user.email || '';
    let list = purchases.slice();
    if(preselectedProduct) list = list.filter(item => item.productId === preselectedProduct);

    returnPurchase.innerHTML = '<option value="">Выберите товар из заказа</option>';
    const frag = document.createDocumentFragment();
    list.forEach(item => {
      const option = document.createElement('option');
      option.value = item.key;
      option.textContent = `${item.productTitle} • заказ ${item.orderId.replace('NOVA-', 'NF-')} • ${UI.formatDateTime(item.createdAt)}`;
      if(preselectedOrder && item.orderId === preselectedOrder) option.selected = true;
      frag.append(option);
    });
    returnPurchase.append(frag);

    const hasItems = list.length > 0;
    if(returnReadyState){
      returnReadyState.innerHTML = hasItems
        ? `<span class="small">Выберите купленный товар и опишите проблему. ${requests.length ? 'Ниже можно отслеживать решение по уже отправленным заявкам.' : 'После решения администратора здесь появится отметка об одобрении или отказе.'}</span>`
        : '<span class="small">Для этого аккаунта пока нет покупок, по которым можно оформить заявку.</span>';
    }
    [returnPurchase, document.getElementById('return-reason'), document.getElementById('return-comment'), returnContact].forEach(field => { if(field) field.disabled = !hasItems; });
    const submitBtn = returnForm?.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.disabled = !hasItems;
    if(hasItems && list.length === 1 && !returnPurchase.value) returnPurchase.value = list[0].key;
  }

  returnForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const selected = String(returnPurchase?.value || '');
    if(!selected){
      UI.showModal('Выберите товар', '<p>Для оформления возврата выберите товар из совершённой покупки.</p>');
      return;
    }
    const [orderId, productId] = selected.split('::');
    const result = Store.submitReturnRequest({
      orderId,
      productId,
      reason: document.getElementById('return-reason')?.value,
      comment: document.getElementById('return-comment')?.value,
      contact: returnContact?.value
    });
    if(!result.ok){
      UI.showModal('Не удалось отправить заявку', `<p>${UI.esc(result.error)}</p>`);
      return;
    }
    returnForm.reset();
    renderState();
    UI.showModal('Заявка отправлена', `<p>Возврат по товару <b>${UI.esc(result.request.productTitle)}</b> зарегистрирован. Администратор увидит заявку в панели и свяжется с вами.</p>`);
  });

  renderState();
})();
