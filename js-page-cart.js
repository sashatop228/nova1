(function(){
  UI.injectLayout();

  const tbody = UI.qs('#cartTable');
  const empty = UI.qs('#cartEmpty');
  const wrap = UI.qs('#cartTableWrap');
  const sumCount = UI.qs('#sumCount');
  const sumSubtotal = UI.qs('#sumSubtotal');
  const sumDelivery = UI.qs('#sumDelivery');
  const sumTotal = UI.qs('#sumTotal');
  const clearBtn = UI.qs('#clearCartBtn');
  const checkoutBtn = UI.qs('#checkoutBtn');

  function itemRow(item){
    const p = UI.getProductById(item.id);
    if(!p) return document.createTextNode('');
    const stock = Store.getStock(p.id);
    const tr = UI.el(`
      <tr class="tr">
        <td class="td">
          <div class="cart-item">
            <div class="miniimg"></div>
            <div>
              <div style="font-weight:800; margin-bottom:4px">${p.title}</div>
              <div class="small">${p.category} • ${p.material} • ${p.color}</div>
              <div class="small">${UI.stockLabel(p.id)}</div>
              <a class="small" href="product.html?id=${encodeURIComponent(p.id)}">Открыть товар</a>
            </div>
          </div>
        </td>
        <td class="td" style="width:180px">
          <div class="qty">
            <button type="button" data-dec="${p.id}">−</button>
            <input type="text" value="${item.qty}" readonly />
            <button type="button" data-inc="${p.id}" ${stock <= item.qty ? 'disabled' : ''}>+</button>
          </div>
        </td>
        <td class="td" style="width:150px"><b>${UI.money(p.price)}</b></td>
        <td class="td" style="width:170px"><b>${UI.money(p.price * item.qty)}</b></td>
        <td class="td" style="width:120px"><button class="btn danger small" type="button" data-remove="${p.id}">Удалить</button></td>
      </tr>
    `);
    UI.applyProductImage(tr.querySelector('.miniimg'), p.id, 'mini');
    return tr;
  }

  function render(){
    const items = Store.getCart();
    tbody.innerHTML = '';
    const valid = items.filter(it => UI.getProductById(it.id));
    if(!valid.length){
      empty.style.display = '';
      wrap.style.display = 'none';
    } else {
      empty.style.display = 'none';
      wrap.style.display = '';
      valid.forEach(it => tbody.append(itemRow(it)));
    }
    const totals = UI.calcTotals(valid);
    sumCount.textContent = String(totals.count);
    sumSubtotal.textContent = UI.money(totals.subtotal);
    sumDelivery.textContent = UI.money(totals.delivery);
    sumTotal.textContent = UI.money(totals.total);
  }

  function getMaskedCard(card){
    const digits = String(card || '').replace(/\D/g, '');
    if(digits.length < 4) return 'карта';
    return 'карта •••• ' + digits.slice(-4);
  }

  function openPaymentModal(){
    const totals = UI.calcTotals(Store.getCart());
    if(!totals.count){ UI.showModal('Корзина пуста', '<p>Сначала добавьте товары в корзину.</p>'); return; }
    const currentUser = Store.getCurrentUser();
    if(!currentUser){
      UI.showModal('Нужен аккаунт', '<p>Чтобы оформить заказ и сохранить его историю, сначала <a href="account.html"><b>войдите или зарегистрируйтесь</b></a>.</p>');
      return;
    }

    UI.showModal('Оплата заказа', `
      <div class="pay-box">
        <div class="pay-summary">
          <div class="line"><span>Получатель</span><b>${UI.esc(currentUser.name || currentUser.email)}</b></div>
          <div class="line"><span>Email</span><b>${UI.esc(currentUser.email)}</b></div>
          <div class="line total"><span>К оплате</span><b>${UI.money(totals.total)}</b></div>
        </div>

        <form class="pay-form" id="paymentForm">
          <div class="form-grid" style="margin-bottom:14px">
            <label class="field full">
              <span>Место доставки</span>
              <input type="text" name="deliveryPlace" placeholder="Город, улица, дом, квартира" />
            </label>
          </div>

          <div class="pay-methods" id="payMethods">
            <button type="button" class="pay-method active" data-pay-method="card">
              <span class="pay-method-title">Картой</span>
              <span class="small">Безопасная онлайн-оплата</span>
            </button>
            <button type="button" class="pay-method" data-pay-method="sbp">
              <span class="pay-method-title">СБП</span>
              <span class="small">Оплата по номеру телефона</span>
            </button>
          </div>

          <input type="hidden" name="payMethod" id="payMethodInput" value="card" />

          <div id="cardFields" class="pay-fields">
            <div class="form-grid">
              <label class="field full">
                <span>Номер карты</span>
                <input type="text" name="cardNumber" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" />
              </label>
              <label class="field">
                <span>Срок действия</span>
                <input type="text" name="cardExpiry" maxlength="5" placeholder="MM/YY" />
              </label>
              <label class="field">
                <span>CVV</span>
                <input type="password" name="cardCvv" inputmode="numeric" maxlength="3" placeholder="•••" />
              </label>
              <label class="field full">
                <span>Имя владельца</span>
                <input type="text" name="cardName" placeholder="IVAN IVANOV" />
              </label>
            </div>
          </div>

          <div id="sbpFields" class="pay-fields" style="display:none">
            <div class="form-grid">
              <label class="field full">
                <span>Телефон для СБП</span>
                <input type="tel" name="sbpPhone" placeholder="+7 (999) 000-00-00" />
              </label>
              <label class="field full">
                <span>Банк</span>
                <select name="sbpBank">
                  <option value="">Выберите банк</option>
                  <option>СберБанк</option>
                  <option>Т-Банк</option>
                  <option>Альфа-Банк</option>
                  <option>ВТБ</option>
                  <option>Другой банк</option>
                </select>
              </label>
            </div>
            <div class="notice" style="margin-top:10px">После нажатия на кнопку заказ будет оформлен, а на экране появится подтверждение оплаты через СБП.</div>
          </div>

          <div class="pay-actions">
            <button class="btn" type="button" id="cancelPaymentBtn">Отмена</button>
            <button class="btn primary" type="submit">Оплатить и оформить</button>
          </div>
        </form>
      </div>
    `);

    const form = document.getElementById('paymentForm');
    const methodInput = document.getElementById('payMethodInput');
    const cardFields = document.getElementById('cardFields');
    const sbpFields = document.getElementById('sbpFields');

    function applyMethod(method){
      methodInput.value = method;
      document.querySelectorAll('[data-pay-method]').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-pay-method') === method));
      cardFields.style.display = method === 'card' ? '' : 'none';
      sbpFields.style.display = method === 'sbp' ? '' : 'none';
    }

    document.getElementById('payMethods')?.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-pay-method]');
      if(!btn) return;
      applyMethod(btn.getAttribute('data-pay-method'));
    });

    document.querySelector('input[name="cardNumber"]')?.addEventListener('input', (e)=>{
      const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
      e.target.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    });

    document.querySelector('input[name="cardExpiry"]')?.addEventListener('input', (e)=>{
      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
      e.target.value = digits.length > 2 ? digits.slice(0,2) + '/' + digits.slice(2) : digits;
    });

    document.querySelector('input[name="sbpPhone"]')?.addEventListener('input', (e)=>{
      let digits = e.target.value.replace(/\D/g, '');
      if(digits.startsWith('8')) digits = '7' + digits.slice(1);
      digits = digits.slice(0, 11);
      let out = '+7';
      if(digits.length > 1) out += ' (' + digits.slice(1,4);
      if(digits.length >= 4) out += ') ' + digits.slice(4,7);
      if(digits.length >= 7) out += '-' + digits.slice(7,9);
      if(digits.length >= 9) out += '-' + digits.slice(9,11);
      e.target.value = out;
    });

    document.getElementById('cancelPaymentBtn')?.addEventListener('click', UI.hideModal);

    form?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const method = fd.get('payMethod');
      const deliveryPlace = String(fd.get('deliveryPlace') || '').trim();
      let paymentLabel = '';

      if(!deliveryPlace){
        UI.showModal('Укажите доставку', '<p>Перед оплатой заполните поле <b>«Место доставки»</b>.</p>');
        return;
      }

      if(method === 'card'){
        const cardNumber = String(fd.get('cardNumber') || '').replace(/\D/g, '');
        const cardExpiry = String(fd.get('cardExpiry') || '').trim();
        const cardCvv = String(fd.get('cardCvv') || '').replace(/\D/g, '');
        const cardName = String(fd.get('cardName') || '').trim();
        if(cardNumber.length !== 16 || !/^\d{2}\/\d{2}$/.test(cardExpiry) || cardCvv.length !== 3 || !cardName){
          UI.showModal('Ошибка оплаты', '<p>Заполните данные карты полностью: номер, срок действия, CVV и имя владельца.</p>');
          return;
        }
        paymentLabel = getMaskedCard(cardNumber);
      } else {
        const sbpPhone = String(fd.get('sbpPhone') || '').replace(/\D/g, '');
        const sbpBank = String(fd.get('sbpBank') || '').trim();
        if(sbpPhone.length < 11 || !sbpBank){
          UI.showModal('Ошибка оплаты', '<p>Для оплаты через СБП укажите телефон и выберите банк.</p>');
          return;
        }
        paymentLabel = 'СБП • ' + UI.esc(sbpBank);

        UI.showModal('Оплата через СБП', `
          <div class="sbp-qr-box">
            <div class="sbp-qr-wrap">
              <img src="sbp-qr.png" alt="QR-код для оплаты через СБП" class="sbp-qr-image" />
            </div>
            <div class="notice sbp-qr-note">
              <b>Банк:</b> ${UI.esc(sbpBank)}<br>
              <b>Телефон:</b> ${UI.esc(document.querySelector('input[name="sbpPhone"]')?.value || '')}<br>
              Отсканируйте QR-код в приложении банка и подтвердите перевод по СБП.
            </div>
            <div class="pay-actions">
              <button class="btn" type="button" id="cancelSbpPaymentBtn">Отмена</button>
              <button class="btn primary" type="button" id="confirmSbpPaymentBtn">Я оплатил</button>
            </div>
          </div>
        `);

        document.getElementById('cancelSbpPaymentBtn')?.addEventListener('click', UI.hideModal);
        document.getElementById('confirmSbpPaymentBtn')?.addEventListener('click', ()=>{
          const result = Store.placeOrder({
            paymentMethod: method,
            paymentLabel,
            deliveryPlace
          });
          if(!result.ok){ UI.showModal('Не удалось оформить заказ', `<p>${UI.esc(result.error)}</p>`); render(); return; }
          UI.showModal('Заказ оформлен', `<p>Заказ <b>${result.order.id}</b> на сумму <b>${UI.money(result.order.totals.total)}</b> успешно оплачен.</p><p>Способ оплаты: <b>${paymentLabel}</b>.</p><p>Доставка: <b>${UI.esc(deliveryPlace)}</b>.</p><p>Заказ сохранён в аккаунте <b>${UI.esc(currentUser.email)}</b>.</p><p><a class="btn primary small" href="account.html">Открыть мои заказы</a></p>`);
          render();
        });
        return;
      }

      const result = Store.placeOrder({
        paymentMethod: method,
        paymentLabel,
        deliveryPlace
      });
      if(!result.ok){ UI.showModal('Не удалось оформить заказ', `<p>${UI.esc(result.error)}</p>`); render(); return; }
      UI.showModal('Заказ оформлен', `<p>Заказ <b>${result.order.id}</b> на сумму <b>${UI.money(result.order.totals.total)}</b> успешно оплачен.</p><p>Способ оплаты: <b>${paymentLabel}</b>.</p><p>Доставка: <b>${UI.esc(deliveryPlace)}</b>.</p><p>Заказ сохранён в аккаунте <b>${UI.esc(currentUser.email)}</b>.</p><p><a class="btn primary small" href="account.html">Открыть мои заказы</a></p>`);
      render();
    });
  }

  document.addEventListener('click', (e)=>{
    const dec = e.target.closest('[data-dec]');
    const inc = e.target.closest('[data-inc]');
    const rem = e.target.closest('[data-remove]');
    if(dec){
      const id = dec.getAttribute('data-dec');
      const item = Store.getCart().find(x => x.id === id);
      if(item && item.qty > 1) Store.setQty(id, item.qty - 1);
      else if(item) Store.removeFromCart(id);
      render();
    }
    if(inc){
      const id = inc.getAttribute('data-inc');
      const item = Store.getCart().find(x => x.id === id);
      const result = Store.setQty(id, (item?.qty || 1) + 1);
      if(result && result.limited){ UI.showModal('Достигнут лимит', `<p>Нельзя добавить больше, чем есть в наличии. Сейчас доступно <b>${result.max}</b> шт.</p>`); }
      render();
    }
    if(rem){
      Store.removeFromCart(rem.getAttribute('data-remove'));
      render();
    }
  });

  clearBtn?.addEventListener('click', ()=>{ Store.clearCart(); render(); });
  checkoutBtn?.addEventListener('click', openPaymentModal);

  render();
})();
