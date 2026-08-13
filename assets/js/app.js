(() => {
  const body = document.body;
  const sidebar = document.querySelector('.sidebar');
  const menuButton = document.querySelector('#mobile-menu');
  const settingsButton = document.querySelector('#settings-button');
  const notificationButton = document.querySelector('#notification-button');
  const settingsDrawer = document.querySelector('#settings-drawer');
  const notificationsDrawer = document.querySelector('#notifications-drawer');
  const backdrop = document.querySelector('#drawer-backdrop');
  const toast = document.querySelector('#toast');
  const toastMessage = document.querySelector('#toast-message');
  const search = document.querySelector('#site-search');
  const settingsKey = 'dsn-display-settings';
  const classMap = {
    readable: 'readable',
    largeText: 'large-text',
    contrast: 'high-contrast',
    motion: 'reduce-motion',
    static: 'static-free'
  };

  const savedSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');

  function applySettings() {
    Object.entries(classMap).forEach(([setting, className]) => {
      body.classList.toggle(className, Boolean(savedSettings[setting]));
      const toggle = document.querySelector(`[data-setting="${setting}"]`);
      if (toggle) toggle.setAttribute('aria-checked', String(Boolean(savedSettings[setting])));
    });
    localStorage.setItem(settingsKey, JSON.stringify(savedSettings));
  }

  function openDrawer(drawer) {
    [settingsDrawer, notificationsDrawer].forEach((item) => { item.hidden = item !== drawer; });
    backdrop.hidden = false;
    drawer.querySelector('.close-drawer')?.focus();
    settingsButton.setAttribute('aria-expanded', String(drawer === settingsDrawer));
    notificationButton.setAttribute('aria-expanded', String(drawer === notificationsDrawer));
  }

  function closeDrawers() {
    settingsDrawer.hidden = true;
    notificationsDrawer.hidden = true;
    backdrop.hidden = true;
    settingsButton.setAttribute('aria-expanded', 'false');
    notificationButton.setAttribute('aria-expanded', 'false');
  }

  function showToast(message) {
    toastMessage.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => { toast.hidden = true; }, 4200);
  }

  applySettings();

  document.querySelectorAll('[data-setting]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const setting = toggle.dataset.setting;
      savedSettings[setting] = !savedSettings[setting];
      applySettings();
    });
  });

  document.querySelector('.reset-settings')?.addEventListener('click', () => {
    Object.keys(savedSettings).forEach((key) => delete savedSettings[key]);
    applySettings();
    showToast('Display settings restored.');
  });

  settingsButton.addEventListener('click', () => openDrawer(settingsDrawer));
  notificationButton.addEventListener('click', () => openDrawer(notificationsDrawer));
  backdrop.addEventListener('click', closeDrawers);
  document.querySelectorAll('.close-drawer').forEach((button) => button.addEventListener('click', closeDrawers));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeDrawers(); sidebar.classList.remove('open'); }
    if (event.key === '/' && document.activeElement !== search) { event.preventDefault(); search.focus(); }
  });

  menuButton.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
    item.addEventListener('click', (event) => {
      const isHome = item.dataset.view === 'Home';
      if (!isHome) {
        event.preventDefault();
        showToast(`${item.dataset.view} is queued for the next build checkpoint.`);
      }
      document.querySelectorAll('.nav-item[data-view]').forEach((nav) => {
        nav.classList.toggle('active', nav === item);
        nav.removeAttribute('aria-current');
      });
      item.setAttribute('aria-current', 'page');
      sidebar.classList.remove('open');
    });
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => showToast(`${button.textContent.trim()} will open in the next checkpoint.`));
  });
  document.querySelector('#report-button').addEventListener('click', () => showToast('Witness reporting will be enabled with the Signal Feed build.'));
  document.querySelectorAll('.text-button, .case-row').forEach((item) => item.addEventListener('click', (event) => {
    event.preventDefault(); showToast('Case detail view is queued for the Case Registry checkpoint.');
  }));

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((item) => item.classList.toggle('active', item === chip));
      const filter = chip.dataset.filter;
      document.querySelectorAll('.post-card').forEach((post) => { post.hidden = filter !== 'all' && post.dataset.category !== filter; });
    });
  });

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll('.post-card').forEach((post) => {
      post.hidden = Boolean(query) && !post.dataset.search.includes(query) && !post.textContent.toLowerCase().includes(query);
    });
  });

  document.querySelectorAll('.post-actions button').forEach((button) => {
    button.addEventListener('click', () => {
      const active = button.classList.toggle('active');
      button.style.color = active ? 'var(--green)' : '';
    });
  });

  document.querySelector('.play-button')?.addEventListener('click', (event) => {
    event.currentTarget.textContent = event.currentTarget.textContent === '▶' ? 'Ⅱ' : '▶';
    showToast('Evidence audio placeholder. Transcript-first playback arrives with the Evidence Lab.');
  });
  toast.querySelector('button').addEventListener('click', () => { toast.hidden = true; });
})();

