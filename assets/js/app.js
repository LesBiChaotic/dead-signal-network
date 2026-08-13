(() => {
  const body = document.body;
  const sidebar = document.querySelector('.sidebar');
  const menuButton = document.querySelector('#mobile-menu');
  const settingsButton = document.querySelector('#settings-button');
  const notificationButton = document.querySelector('#notification-button');
  const settingsDrawer = document.querySelector('#settings-drawer');
  const notificationsDrawer = document.querySelector('#notifications-drawer');
  const profileDrawer = document.querySelector('#profile-drawer');
  const profileContent = document.querySelector('#profile-content');
  const backdrop = document.querySelector('#drawer-backdrop');
  const toast = document.querySelector('#toast');
  const toastMessage = document.querySelector('#toast-message');
  const search = document.querySelector('#site-search');
  const contentGrid = document.querySelector('.content-grid');
  const mainColumn = document.querySelector('.main-column');
  const rightRail = document.querySelector('.right-rail');
  const directoryView = document.querySelector('.directory-view');
  const memberGrid = document.querySelector('#member-grid');
  const memberSearch = document.querySelector('#member-search');
  const directoryCount = document.querySelector('#directory-count');
  const settingsKey = 'dsn-display-settings';
  let memberDirectory = [];
  let activeMemberFilter = 'all';
  let memberSystem = null;
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
    [settingsDrawer, notificationsDrawer, profileDrawer].forEach((item) => { item.hidden = item !== drawer; });
    backdrop.hidden = false;
    drawer.querySelector('.close-drawer')?.focus();
    settingsButton.setAttribute('aria-expanded', String(drawer === settingsDrawer));
    notificationButton.setAttribute('aria-expanded', String(drawer === notificationsDrawer));
  }

  function closeDrawers() {
    settingsDrawer.hidden = true;
    notificationsDrawer.hidden = true;
    profileDrawer.hidden = true;
    backdrop.hidden = true;
    settingsButton.setAttribute('aria-expanded', 'false');
    notificationButton.setAttribute('aria-expanded', 'false');
  }

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>'"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  }

  function initials(name) {
    return name.replace(/^Dr\.\s+/, '').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  function stateLabel(state) {
    return memberSystem?.accountStates.find((item) => item.id === state)?.label || state.replaceAll('-', ' ');
  }

  function distinctionLabel(id) {
    return memberSystem?.distinctions.find((item) => item.id === id)?.label || id.replaceAll('-', ' ');
  }

  function renderDirectory() {
    const query = memberSearch.value.trim().toLowerCase();
    const visible = memberDirectory.filter((member) => {
      const matchesGroup = activeMemberFilter === 'all' || member.group === activeMemberFilter || (activeMemberFilter === 'wren-seven' && member.team === 'Wren’s End Expedition');
      const haystack = [member.name, member.handle, member.role, member.location, member.team, ...member.specialties].filter(Boolean).join(' ').toLowerCase();
      return matchesGroup && (!query || haystack.includes(query));
    });
    memberGrid.innerHTML = visible.map((member) => `
      <button class="member-card" type="button" data-member-id="${escapeHTML(member.id)}" aria-label="Open profile for ${escapeHTML(member.name)}">
        <span class="profile-frame frame-${escapeHTML(member.frame)}" aria-hidden="true">${escapeHTML(initials(member.name))}</span>
        <span class="member-card-copy">
          <span class="member-card-name"><strong>${escapeHTML(member.name)}</strong>${member.access.includes('verified') || member.officialRoles.includes('Founder') ? '<span class="verified" title="Verified account">✓</span>' : ''}</span>
          <small>${escapeHTML(member.handle)} · ${escapeHTML(member.location)}</small>
          <p>${escapeHTML(member.role)}</p>
          <span class="member-status state-${escapeHTML(member.accountState)}">${escapeHTML(stateLabel(member.accountState))}</span>
        </span>
      </button>`).join('');
    directoryCount.textContent = `${visible.length} ${visible.length === 1 ? 'record' : 'records'} displayed`;
    memberGrid.querySelectorAll('[data-member-id]').forEach((button) => button.addEventListener('click', () => openMemberProfile(button.dataset.memberId)));
  }

  function openMemberProfile(id) {
    const member = memberDirectory.find((item) => item.id === id);
    if (!member) return;
    const distinctions = member.distinctions.length ? member.distinctions.map((item) => `<span>${escapeHTML(distinctionLabel(item))}</span>`).join('') : '<span>No public distinctions</span>';
    profileContent.innerHTML = `
      <div class="profile-hero">
        <span class="profile-frame frame-${escapeHTML(member.frame)}" aria-hidden="true">${escapeHTML(initials(member.name))}</span>
        <div><h3>${escapeHTML(member.name)}</h3><p>${escapeHTML(member.handle)} · ${escapeHTML(member.pronouns)}</p><p class="profile-record-status">${escapeHTML(stateLabel(member.accountState))}</p></div>
      </div>
      <p class="profile-summary">${escapeHTML(member.summary)}</p>
      <section class="profile-section"><h3>Network record</h3><dl class="profile-facts"><dt>Title</dt><dd>${escapeHTML(member.role)}</dd><dt>Location</dt><dd>${escapeHTML(member.location)}</dd><dt>Joined</dt><dd>${escapeHTML(member.joined)}</dd><dt>Languages</dt><dd>${escapeHTML(member.languages.join(', '))}</dd><dt>Team</dt><dd>${escapeHTML(member.team || 'Independent')}</dd><dt>Last seen</dt><dd>${escapeHTML(member.lastSeen)}</dd></dl></section>
      <section class="profile-section"><h3>Specialties</h3><div class="profile-tags">${member.specialties.map((item) => `<span>${escapeHTML(item)}</span>`).join('')}</div></section>
      <section class="profile-section"><h3>Roles and distinctions</h3><div class="profile-tags">${member.officialRoles.map((item) => `<span>${escapeHTML(item)}</span>`).join('')}${distinctions}</div></section>
      <section class="profile-section"><h3>Portrait record</h3><div class="profile-portrait-note"><strong>${escapeHTML(member.portraitMode.replaceAll('-', ' '))}</strong>${escapeHTML(member.portraitBrief)}</div></section>`;
    openDrawer(profileDrawer);
  }

  async function loadMemberDirectory() {
    if (memberDirectory.length) return renderDirectory();
    directoryCount.textContent = 'Loading personnel index…';
    try {
      const [membersResponse, profilesResponse, systemResponse] = await Promise.all([
        fetch('assets/data/members.json'),
        fetch('assets/data/profile-seeds.json'),
        fetch('assets/data/member-system.json')
      ]);
      if (!membersResponse.ok || !profilesResponse.ok || !systemResponse.ok) throw new Error('Personnel index unavailable');
      const [membersData, profilesData, systemData] = await Promise.all([membersResponse.json(), profilesResponse.json(), systemResponse.json()]);
      memberSystem = systemData;
      const profilesById = new Map(profilesData.profiles.map((profile) => [profile.id, profile]));
      memberDirectory = membersData.members.map((member) => ({...member, ...profilesById.get(member.id)}));
      renderDirectory();
    } catch (error) {
      directoryCount.textContent = 'Personnel index unavailable';
      memberGrid.innerHTML = '<p class="profile-summary">The public directory could not be loaded. The incident has been added to Systems review.</p>';
    }
  }

  function showRoute(route) {
    const isDirectory = route === 'directory';
    mainColumn.hidden = isDirectory;
    rightRail.hidden = isDirectory;
    directoryView.hidden = !isDirectory;
    contentGrid.classList.toggle('directory-mode', isDirectory);
    if (isDirectory) loadMemberDirectory();
    document.querySelectorAll('.nav-item[data-view]').forEach((nav) => {
      const active = isDirectory ? nav.dataset.route === 'directory' : nav.dataset.view === 'Home';
      nav.classList.toggle('active', active);
      if (active) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-mobile-route]').forEach((nav) => nav.classList.toggle('active', nav.dataset.mobileRoute === route));
    window.location.hash = isDirectory ? 'members' : 'home';
    window.scrollTo({top: 0, behavior: body.classList.contains('reduce-motion') ? 'auto' : 'smooth'});
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
      const isDirectory = item.dataset.route === 'directory';
      if (!isHome && !isDirectory) {
        event.preventDefault();
        showToast(`${item.dataset.view} is queued for the next build checkpoint.`);
        return;
      }
      event.preventDefault();
      showRoute(isDirectory ? 'directory' : 'home');
      document.querySelectorAll('.nav-item[data-view]').forEach((nav) => {
        nav.classList.toggle('active', nav === item);
        nav.removeAttribute('aria-current');
      });
      item.setAttribute('aria-current', 'page');
      sidebar.classList.remove('open');
    });
  });

  document.querySelectorAll('[data-mobile-route]').forEach((item) => item.addEventListener('click', (event) => {
    event.preventDefault();
    showRoute(item.dataset.mobileRoute);
    document.querySelectorAll('[data-mobile-route]').forEach((nav) => nav.classList.toggle('active', nav === item));
  }));

  document.querySelectorAll('[data-member-filter]').forEach((button) => button.addEventListener('click', () => {
    activeMemberFilter = button.dataset.memberFilter;
    document.querySelectorAll('[data-member-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderDirectory();
  }));
  memberSearch.addEventListener('input', renderDirectory);

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
      button.style.color = active ? 'var(--accent-bright)' : '';
    });
  });

  document.querySelector('.play-button')?.addEventListener('click', (event) => {
    event.currentTarget.classList.toggle('active');
    event.currentTarget.setAttribute('aria-label', event.currentTarget.classList.contains('active') ? 'Pause evidence recording' : 'Play evidence recording');
    showToast('Evidence audio placeholder. Transcript-first playback arrives with the Evidence Lab.');
  });
  toast.querySelector('button').addEventListener('click', () => { toast.hidden = true; });

  if (window.location.hash === '#members') showRoute('directory');
})();
