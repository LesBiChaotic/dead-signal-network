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
  const caseDrawer = document.querySelector('#case-drawer');
  const caseContent = document.querySelector('#case-content');
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
  const caseRegistryView = document.querySelector('.case-registry-view');
  const caseGrid = document.querySelector('#case-grid');
  const caseSearch = document.querySelector('#case-search');
  const caseCount = document.querySelector('#case-count');
  const staticBreach = document.querySelector('#static-breach');
  const settingsKey = 'dsn-display-settings';
  let memberDirectory = [];
  let activeMemberFilter = 'all';
  let memberSystem = null;
  let caseRegistry = [];
  let activeCaseFilter = 'all';
  let caseLoadPromise = null;
  let breachSeen = false;
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
    [settingsDrawer, notificationsDrawer, profileDrawer, caseDrawer].forEach((item) => { item.hidden = item !== drawer; });
    backdrop.hidden = false;
    drawer.querySelector('.close-drawer')?.focus();
    settingsButton.setAttribute('aria-expanded', String(drawer === settingsDrawer));
    notificationButton.setAttribute('aria-expanded', String(drawer === notificationsDrawer));
  }

  function closeDrawers() {
    settingsDrawer.hidden = true;
    notificationsDrawer.hidden = true;
    profileDrawer.hidden = true;
    caseDrawer.hidden = true;
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

  function portraitMarkup(member, decorative = true) {
    if (!member.image) return escapeHTML(initials(member.name));
    return `<img src="${escapeHTML(member.image)}" alt="${decorative ? '' : escapeHTML(member.portraitAlt || `Portrait of ${member.name}`)}">`;
  }

  function hasUnstableAccount(member) {
    return ['missing', 'memorialized', 'record-error'].some((state) => member.accountState.includes(state));
  }

  function triggerStaticBreach() {
    if (breachSeen || savedSettings.static || savedSettings.motion) return;
    breachSeen = true;
    staticBreach.hidden = false;
    staticBreach.getBoundingClientRect();
    window.setTimeout(() => { staticBreach.hidden = true; }, 680);
  }

  function renderDirectory() {
    const query = memberSearch.value.trim().toLowerCase();
    const visible = memberDirectory.filter((member) => {
      const matchesGroup = activeMemberFilter === 'all' || member.group === activeMemberFilter || (activeMemberFilter === 'wren-seven' && member.team === 'Wren’s End Expedition');
      const haystack = [member.name, member.handle, member.role, member.location, member.team, ...member.specialties].filter(Boolean).join(' ').toLowerCase();
      return matchesGroup && (!query || haystack.includes(query));
    });
    memberGrid.innerHTML = visible.map((member, index) => `
      <button class="member-card signal-arrival ${hasUnstableAccount(member) ? 'account-ghost' : ''}" style="--signal-delay:${Math.min(index * 34, 240)}ms" type="button" data-member-id="${escapeHTML(member.id)}" aria-label="Open profile for ${escapeHTML(member.name)}">
        <span class="profile-frame frame-${escapeHTML(member.frame)}" aria-hidden="true">${portraitMarkup(member)}</span>
        <span class="member-card-copy">
          <span class="member-card-name" data-ghost-name="${escapeHTML(member.name)}"><strong>${escapeHTML(member.name)}</strong>${member.access.includes('verified') || member.officialRoles.includes('Founder') ? '<span class="verified" title="Verified account">✓</span>' : ''}</span>
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
        <span class="profile-frame frame-${escapeHTML(member.frame)}">${portraitMarkup(member, false)}</span>
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

  function caseStatusLabel(status) {
    return status.replaceAll('-', ' ');
  }

  function riskNumeral(risk) {
    return ({1: 'I', 2: 'II', 3: 'III'})[risk] || '—';
  }

  function signalStrength(caseFile) {
    if (caseFile.status === 'sealed') return {level: 'unknown', label: 'Signal source unknown'};
    const level = ({active: 4, monitoring: 3, resolved: 2, archived: 1})[caseFile.status] || 2;
    return {level: `strength-${level}`, label: `Signal strength ${level} of 4`};
  }

  function signalMeter(caseFile) {
    const strength = signalStrength(caseFile);
    return `<span class="signal-meter ${strength.level}" role="img" aria-label="${strength.label}"><i></i><i></i><i></i><i></i></span>`;
  }

  function memberName(id) {
    return memberDirectory.find((member) => member.id === id)?.name || id.replaceAll('-', ' ');
  }

  function renderCaseRegistry() {
    const query = caseSearch.value.trim().toLowerCase();
    const visible = caseRegistry.filter((caseFile) => {
      const matchesStatus = activeCaseFilter === 'all' || caseFile.status === activeCaseFilter;
      const haystack = [caseFile.id, caseFile.title, caseFile.location, caseFile.classification, caseFile.team, ...caseFile.tags].join(' ').toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
    caseGrid.innerHTML = visible.length ? visible.map((caseFile, index) => `
      <button class="case-card signal-arrival case-risk-${caseFile.risk || 'unknown'} ${caseFile.status === 'sealed' ? 'case-sealed' : ''}" style="--signal-delay:${Math.min(index * 42, 300)}ms" type="button" data-case-card="${escapeHTML(caseFile.id)}" aria-label="Open case file ${escapeHTML(caseFile.id)}, ${escapeHTML(caseFile.title)}">
        <span class="case-card-header">
          <span class="risk risk-${caseFile.risk === 3 ? 'three' : caseFile.risk === 2 ? 'two' : 'one'}" aria-label="Risk level ${escapeHTML(riskNumeral(caseFile.risk))}">${escapeHTML(riskNumeral(caseFile.risk))}</span>
          <span><span class="case-card-id">${escapeHTML(caseFile.id)}</span><h2>${escapeHTML(caseFile.title)}</h2></span>
          <span class="case-status case-status-${escapeHTML(caseFile.status)}">${escapeHTML(caseStatusLabel(caseFile.status))}</span>
        </span>
        <span class="case-location"><svg class="ui-icon" aria-hidden="true"><use href="assets/images/dsn-icons.svg#map"></use></svg>${escapeHTML(caseFile.location)}</span>
        <p>${escapeHTML(caseFile.summary)}</p>
        <span class="case-card-footer"><span>Classification<strong>${escapeHTML(caseFile.classification)}</strong></span><span class="case-file-link">${signalMeter(caseFile)}${caseFile.evidence.length} evidence ${caseFile.evidence.length === 1 ? 'item' : 'items'} →</span></span>
      </button>`).join('') : '<p class="empty-registry">No public case records match this query.</p>';
    caseCount.textContent = `${visible.length} ${visible.length === 1 ? 'record' : 'records'} displayed`;
    caseSearch.closest('.member-search').classList.toggle('signal-acquired', query.length >= 3 && visible.length > 0);
    caseGrid.querySelectorAll('[data-case-card]').forEach((button) => button.addEventListener('click', () => openCaseFile(button.dataset.caseCard)));
  }

  function openCaseFile(id) {
    const caseFile = caseRegistry.find((item) => item.id === id);
    if (!caseFile) return;
    const personnel = caseFile.personnel.length ? caseFile.personnel.map((person) => escapeHTML(memberName(person))).join(', ') : '[SEVEN RECORDS WITHHELD]';
    const timeline = caseFile.timeline.map((entry) => `<div class="timeline-entry"><time>${escapeHTML(entry.date)}</time><div><strong>${escapeHTML(entry.label)}</strong><small>${escapeHTML(entry.detail)}</small></div></div>`).join('');
    const evidence = caseFile.evidence.map((item) => `<div class="evidence-item"><div><span class="evidence-id">${escapeHTML(item.id)} · ${escapeHTML(item.type)}</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.summary)}</small></div><span class="evidence-access">${escapeHTML(item.access)}</span></div>`).join('');
    const related = caseFile.relatedCases.length ? caseFile.relatedCases.map((relatedId) => `<button type="button" data-related-case="${escapeHTML(relatedId)}">${escapeHTML(relatedId)}</button>`).join('') : '<span class="profile-summary">No public links.</span>';
    caseContent.innerHTML = `
      <div class="case-file-hero">
        <span class="risk case-file-risk risk-${caseFile.risk === 3 ? 'three' : caseFile.risk === 2 ? 'two' : 'one'}">${escapeHTML(riskNumeral(caseFile.risk))}</span>
        <div><span class="case-id">${escapeHTML(caseFile.id)}</span><h3>${escapeHTML(caseFile.title)}</h3></div>
        <span class="case-status case-status-${escapeHTML(caseFile.status)}">${escapeHTML(caseStatusLabel(caseFile.status))}</span>
      </div>
      <p class="case-file-summary">${escapeHTML(caseFile.summary)}</p>
      <p class="case-finding"><strong>Public finding:</strong> ${escapeHTML(caseFile.publicFinding)}</p>
      <section class="profile-section"><h3>Registry details</h3><dl class="profile-facts"><dt>Location</dt><dd>${escapeHTML(caseFile.location)}</dd><dt>Opened</dt><dd>${escapeHTML(caseFile.opened)}</dd><dt>Updated</dt><dd>${escapeHTML(caseFile.updated)}</dd><dt>Classification</dt><dd>${escapeHTML(caseFile.classification)}</dd><dt>Assigned team</dt><dd>${escapeHTML(caseFile.team)}</dd><dt>Personnel</dt><dd>${personnel}</dd></dl></section>
      <section class="profile-section"><h3>Tags</h3><div class="profile-tags">${caseFile.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div></section>
      <section class="profile-section"><h3>Public timeline</h3><div class="case-timeline">${timeline}</div></section>
      <section class="profile-section"><h3>Evidence inventory</h3><div class="evidence-list">${evidence}</div></section>
      <section class="profile-section"><h3>Related records</h3><div class="related-case-list">${related}</div></section>`;
    caseContent.querySelectorAll('[data-related-case]').forEach((button) => button.addEventListener('click', () => openCaseFile(button.dataset.relatedCase)));
    window.history.replaceState(null, '', `#case-${caseFile.id.replace('DSN-', '')}`);
    openDrawer(caseDrawer);
    if (caseFile.id === 'DSN-0000') window.setTimeout(triggerStaticBreach, 90);
  }

  async function loadCaseRegistry(openId) {
    if (!caseLoadPromise) {
      caseLoadPromise = Promise.all([
        fetch('assets/data/cases.json').then((response) => { if (!response.ok) throw new Error('Case index unavailable'); return response.json(); }),
        loadMemberDirectory()
      ]).then(([caseData]) => {
        caseRegistry = caseData.cases;
        renderCaseRegistry();
      }).catch(() => {
        caseCount.textContent = 'Case index unavailable';
        caseGrid.innerHTML = '<p class="empty-registry">The public case registry could not be loaded. Systems has been notified.</p>';
      });
    }
    await caseLoadPromise;
    if (openId) openCaseFile(openId);
  }

  function showRoute(route, openCaseId) {
    closeDrawers();
    const isHome = route === 'home';
    const isDirectory = route === 'directory';
    const isCases = route === 'cases';
    mainColumn.hidden = !isHome;
    rightRail.hidden = !isHome;
    directoryView.hidden = !isDirectory;
    caseRegistryView.hidden = !isCases;
    contentGrid.classList.toggle('full-page-mode', !isHome);
    if (isDirectory) loadMemberDirectory();
    if (isCases) loadCaseRegistry(openCaseId);
    document.querySelectorAll('.nav-item[data-view]').forEach((nav) => {
      const active = isHome ? nav.dataset.view === 'Home' : nav.dataset.route === route;
      nav.classList.toggle('active', active);
      if (active) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-mobile-route]').forEach((nav) => nav.classList.toggle('active', nav.dataset.mobileRoute === route));
    if (!openCaseId) window.history.replaceState(null, '', isDirectory ? '#members' : isCases ? '#cases' : '#home');
    window.scrollTo({top: 0, behavior: body.classList.contains('reduce-motion') ? 'auto' : 'smooth'});
  }

  function showToast(message) {
    toastMessage.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => { toast.hidden = true; }, 4200);
  }

  applySettings();

  document.querySelectorAll('.post-card').forEach((post, index) => {
    post.classList.add('signal-arrival');
    post.style.setProperty('--signal-delay', `${Math.min(index * 75, 260)}ms`);
  });

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
      const isCases = item.dataset.route === 'cases';
      if (!isHome && !isDirectory && !isCases) {
        event.preventDefault();
        showToast(`${item.dataset.view} is queued for the next build checkpoint.`);
        return;
      }
      event.preventDefault();
      showRoute(isDirectory ? 'directory' : isCases ? 'cases' : 'home');
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

  document.querySelectorAll('[data-case-filter]').forEach((button) => button.addEventListener('click', () => {
    activeCaseFilter = button.dataset.caseFilter;
    document.querySelectorAll('[data-case-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderCaseRegistry();
  }));
  caseSearch.addEventListener('input', renderCaseRegistry);

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.action === 'cases') showRoute('cases');
      else showToast(`${button.textContent.trim()} will open in the next checkpoint.`);
    });
  });
  document.querySelector('#report-button').addEventListener('click', () => showToast('Witness reporting will be enabled with the Signal Feed build.'));
  document.querySelectorAll('[data-case-route]').forEach((item) => item.addEventListener('click', () => showRoute('cases')));
  document.querySelectorAll('.case-row[data-case-id]').forEach((item) => item.addEventListener('click', (event) => {
    event.preventDefault();
    showRoute('cases', item.dataset.caseId);
  }));
  document.querySelectorAll('.text-button:not([data-case-route])').forEach((item) => item.addEventListener('click', (event) => {
    event.preventDefault(); showToast('This notice is queued for a later checkpoint.');
  }));

  document.querySelectorAll('.filter-chips [data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chips [data-filter]').forEach((item) => item.classList.toggle('active', item === chip));
      const filter = chip.dataset.filter;
      document.querySelectorAll('.post-card').forEach((post) => { post.hidden = filter !== 'all' && post.dataset.category !== filter; });
    });
  });

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    document.querySelectorAll('.post-card').forEach((post) => {
      post.hidden = Boolean(query) && !post.dataset.search.includes(query) && !post.textContent.toLowerCase().includes(query);
      if (!post.hidden) matches += 1;
    });
    const acquired = query.length >= 3 && matches > 0;
    search.closest('.global-search').classList.toggle('signal-acquired', acquired);
    search.closest('.global-search').querySelector('kbd').textContent = acquired ? 'LOCK' : '/';
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

  const initialHash = window.location.hash;
  if (initialHash === '#members') showRoute('directory');
  else if (initialHash === '#cases') showRoute('cases');
  else if (/^#case-\d{4}$/.test(initialHash)) showRoute('cases', `DSN-${initialHash.slice(-4)}`);
})();
