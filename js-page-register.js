(function(){
  UI.injectLayout();

  const guest = UI.qs('#registerGuest');
  const done = UI.qs('#registerDone');

  function syncState(){
    const user = Store.getCurrentUser();
    guest?.classList.toggle('hidden', !!user);
    done?.classList.toggle('hidden', !user);
  }

  UI.qs('#registerForm')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const result = Store.register(UI.qs('#regName').value, UI.qs('#regEmail').value, UI.qs('#regPassword').value);
    if(!result.ok){ UI.showModal('Ошибка регистрации', `<p>${UI.esc(result.error)}</p>`); return; }
    syncState();
    UI.showModal('Аккаунт создан', '<p>Регистрация завершена. Теперь вы можете открыть личный кабинет и видеть историю заказов.</p>');
  });

  syncState();
})();
