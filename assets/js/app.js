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
  const signalsView = document.querySelector('.signals-view');
  const signalList = document.querySelector('#signal-list');
  const signalSearch = document.querySelector('#signal-search');
  const signalCount = document.querySelector('#signal-count');
  const staticBreach = document.querySelector('#static-breach');
  const settingsKey = 'dsn-display-settings';
  const feedStateKey = 'dsn-feed-actions';
  let memberDirectory = [];
  let activeMemberFilter = 'all';
  let memberSystem = null;
  let caseRegistry = [];
  let activeCaseFilter = 'all';
  let caseLoadPromise = null;
  let signalFeed = [];
  let activeSignalFilter = 'all';
  let signalFeedLimit = 12;
  let signalLoadPromise = null;
  let breachSeen = false;
  const classMap = {
    readable: 'readable',
    largeText: 'large-text',
    contrast: 'high-contrast',
    motion: 'reduce-motion',
    static: 'static-free'
  };

  const savedSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
  const savedFeedState = JSON.parse(localStorage.getItem(feedStateKey) || '{"acknowledged":[],"archived":[]}');
  const acknowledgedSignals = new Set(savedFeedState.acknowledged || []);
  const archivedSignals = new Set(savedFeedState.archived || []);

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

  function saveFeedState() {
    localStorage.setItem(feedStateKey, JSON.stringify({acknowledged: [...acknowledgedSignals], archived: [...archivedSignals]}));
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

  function compactNumber(value) {
    return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.0', '')}K` : String(value);
  }

  function feedMember(id) {
    return memberDirectory.find((member) => member.id === id);
  }

  function feedAttachmentMarkup(post) {
    const attachment = post.attachment;
    if (!attachment) return '';
    const type = escapeHTML(attachment.type);
    if (attachment.type === 'poll') {
      const options = attachment.description.split('|').map((option, index) => {
        const [label, percentage = '0%'] = option.split(' · ');
        return `<button type="button" style="--poll-width:${escapeHTML(percentage)}" data-poll-option="${index}">${escapeHTML(label)} <strong>${escapeHTML(percentage)}</strong></button>`;
      }).join('');
      return `<div class="feed-attachment feed-attachment-poll"><span><b>${escapeHTML(attachment.label)}</b><i>POLL</i></span><div class="feed-poll-options">${options}</div></div>`;
    }
    const caseAttribute = attachment.type === 'case' && post.case ? ` data-feed-case="${escapeHTML(post.case)}" role="button" tabindex="0" aria-label="Open case ${escapeHTML(post.case)}"` : '';
    return `<div class="feed-attachment feed-attachment-${type}"${caseAttribute}><span><b>${escapeHTML(attachment.label)}</b><i>${type.toUpperCase()}</i></span><p>${escapeHTML(attachment.description)}</p></div>`;
  }

  function replyMarkup(reply, index) {
    const member = feedMember(reply.author);
    const name = member?.name || 'Unavailable account';
    const state = reply.state ? ` ${escapeHTML(reply.state)}` : '';
    return `<article class="reply depth-${reply.depth || 0}${state}" ${index > 1 ? 'data-extra-reply hidden' : ''}>
      <button class="reply-author" type="button" data-feed-member="${escapeHTML(reply.author)}" aria-label="Open profile for ${escapeHTML(name)}">${escapeHTML(initials(name))}</button>
      <div class="reply-copy"><div class="reply-meta"><button type="button" data-feed-member="${escapeHTML(reply.author)}">${escapeHTML(name)}</button><span>${escapeHTML(reply.time)}</span>${reply.state === 'moderator' ? '<span class="badge badge-field">MODERATOR</span>' : ''}${reply.state === 'record-error' ? '<span class="badge badge-community">RECORD ERROR</span>' : ''}</div><p>${escapeHTML(reply.text)}</p></div>
    </article>`;
  }

  function discussionMarkup(post, prefix = 'feed') {
    const id = `${prefix}-discussion-${post.id}`;
    const storedExtra = Math.max(0, post.thread.length - 2);
    const unavailable = Math.max(0, post.comments - post.thread.length);
    const moreLabel = Math.min(Math.max(post.comments - 2, storedExtra), 18);
    return `<section class="discussion-thread" id="${escapeHTML(id)}" data-discussion-for="${escapeHTML(post.id)}" hidden>
      <div class="discussion-heading"><span>Selected public replies</span><button type="button" data-collapse-thread="${escapeHTML(post.id)}">Collapse ↑</button></div>
      ${post.thread.map(replyMarkup).join('')}
      ${storedExtra ? `<button class="thread-more" type="button" data-thread-more="${escapeHTML(post.id)}">View ${moreLabel} more replies</button>` : ''}
      ${unavailable ? `<div class="thread-access-note" data-thread-access hidden>${unavailable} additional replies require member access.</div>` : ''}
      <div class="reply-composer"><input type="text" aria-label="Reply to discussion" placeholder="Sign in to reply…" disabled><button type="button" disabled>Reply</button></div>
    </section>`;
  }

  function signalPostMarkup(post, index) {
    const member = feedMember(post.author);
    if (!member) return '';
    const acknowledged = acknowledgedSignals.has(post.id);
    const archived = archivedSignals.has(post.id);
    const unstable = hasUnstableAccount(member) || post.signal === 'unknown';
    const location = post.location ? ` · ${escapeHTML(post.location)}` : '';
    const portrait = portraitMarkup(member);
    const verified = member.access.includes('verified') || member.officialRoles.includes('Founder') || ['official','field','evidence'].includes(post.category);
    return `<article class="post-card feed-post signal-arrival signal-${escapeHTML(post.signal)} ${unstable ? 'account-ghost' : ''}" style="--signal-delay:${Math.min(index * 45, 260)}ms" data-feed-post="${escapeHTML(post.id)}" data-category="${escapeHTML(post.category)}">
      <header class="post-header">
        <button class="feed-author-button" type="button" data-feed-member="${escapeHTML(member.id)}" aria-label="Open profile for ${escapeHTML(member.name)}">
          <span class="profile-frame frame-${escapeHTML(member.frame)}" aria-hidden="true">${portrait}</span>
          <span class="feed-author-copy"><span class="feed-author-name" data-ghost-name="${escapeHTML(member.name)}"><strong>${escapeHTML(member.name)}</strong>${verified ? '<span class="verified" title="Verified account">✓</span>' : ''}</span><small>${escapeHTML(member.handle)} · ${escapeHTML(post.time)}${location}</small><span class="feed-badge feed-badge-${escapeHTML(post.category)}">${escapeHTML(post.badge)}</span></span>
        </button>
        <span class="feed-signal-state ${escapeHTML(post.signal)}">${escapeHTML(post.signal)}</span>
      </header>
      <p>${escapeHTML(post.text)}</p>
      ${feedAttachmentMarkup(post)}
      <footer class="post-actions">
        <button type="button" data-feed-action="acknowledge" class="${acknowledged ? 'active' : ''}" aria-pressed="${acknowledged}" aria-label="Acknowledge signal"><svg class="action-icon"><use href="assets/images/dsn-icons.svg#acknowledge"></use></svg><span>Acknowledge</span><b class="feed-count">${compactNumber(post.acknowledgements + (acknowledged ? 1 : 0))}</b></button>
        <button type="button" data-feed-action="discuss" aria-expanded="false" aria-controls="feed-discussion-${escapeHTML(post.id)}" aria-label="Discuss signal"><svg class="action-icon"><use href="assets/images/dsn-icons.svg#discuss"></use></svg><span>Discuss</span><b class="feed-count">${compactNumber(post.comments)}</b></button>
        <button type="button" data-feed-action="archive" class="${archived ? 'active' : ''}" aria-pressed="${archived}" aria-label="Archive signal"><svg class="action-icon"><use href="assets/images/dsn-icons.svg#archive"></use></svg><span>${archived ? 'Archived' : 'Archive'}</span></button>
        <span class="signal-quality">${escapeHTML(post.signal.toUpperCase())} · ${escapeHTML(post.category.toUpperCase())}</span>
      </footer>
      ${discussionMarkup(post)}
    </article>`;
  }

  function renderSignalFeed() {
    const query = signalSearch.value.trim().toLowerCase();
    const matches = signalFeed.filter((post) => {
      const member = feedMember(post.author);
      const matchesCategory = activeSignalFilter === 'all' || post.category === activeSignalFilter;
      const haystack = [post.text, post.category, post.location, post.case, post.badge, member?.name, member?.handle, ...post.tags].filter(Boolean).join(' ').toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
    const visible = matches.slice(0, query ? matches.length : signalFeedLimit);
    signalList.innerHTML = visible.length ? visible.map(signalPostMarkup).join('') : '<p class="feed-empty">No public transmissions match this receiver query.</p>';
    if (visible.length < matches.length) signalList.insertAdjacentHTML('beforeend', `<button class="button button-secondary full-width load-signals" type="button" data-load-signals>Receive ${Math.min(10, matches.length - visible.length)} more signals</button>`);
    signalCount.textContent = `${visible.length} of ${matches.length} transmissions displayed`;
    signalSearch.closest('.member-search').classList.toggle('signal-acquired', query.length >= 3 && matches.length > 0);
  }

  function hydrateHomeDiscussions() {
    document.querySelectorAll('.main-column [data-post-id]').forEach((article) => {
      const post = signalFeed.find((item) => item.id === article.dataset.postId);
      if (!post || article.querySelector('.discussion-thread')) return;
      const discussButton = article.querySelector('[aria-label="Discuss signal"]');
      const acknowledgeButton = article.querySelector('[aria-label="Acknowledge signal"]');
      const archiveButton = article.querySelector('[aria-label="Archive signal"]');
      discussButton.dataset.feedAction = 'discuss';
      discussButton.setAttribute('aria-expanded', 'false');
      discussButton.setAttribute('aria-controls', `home-discussion-${post.id}`);
      acknowledgeButton.dataset.feedAction = 'acknowledge';
      acknowledgeButton.setAttribute('aria-pressed', String(acknowledgedSignals.has(post.id)));
      archiveButton.dataset.feedAction = 'archive';
      archiveButton.setAttribute('aria-pressed', String(archivedSignals.has(post.id)));
      if (acknowledgedSignals.has(post.id)) acknowledgeButton.classList.add('active');
      if (archivedSignals.has(post.id)) archiveButton.classList.add('active');
      article.insertAdjacentHTML('beforeend', discussionMarkup(post, 'home'));
    });
  }

  async function loadSignalFeed() {
    if (!signalLoadPromise) {
      signalLoadPromise = Promise.all([
        fetch('assets/data/feed.json').then((response) => { if (!response.ok) throw new Error('Signal feed unavailable'); return response.json(); }),
        loadMemberDirectory()
      ]).then(([feedData]) => {
        signalFeed = feedData.posts;
        renderSignalFeed();
        hydrateHomeDiscussions();
      }).catch(() => {
        signalCount.textContent = 'Receiver queue unavailable';
        signalList.innerHTML = '<p class="feed-empty">The public receiver could not synchronize. Systems has been notified.</p>';
      });
    }
    return signalLoadPromise;
  }

  function showRoute(route, openCaseId) {
    closeDrawers();
    const isHome = route === 'home';
    const isDirectory = route === 'directory';
    const isCases = route === 'cases';
    const isSignals = route === 'signals';
    mainColumn.hidden = !isHome;
    rightRail.hidden = !isHome;
    directoryView.hidden = !isDirectory;
    caseRegistryView.hidden = !isCases;
    signalsView.hidden = !isSignals;
    contentGrid.classList.toggle('full-page-mode', !isHome);
    if (isDirectory) loadMemberDirectory();
    if (isCases) loadCaseRegistry(openCaseId);
    if (isSignals) loadSignalFeed();
    document.querySelectorAll('.nav-item[data-view]').forEach((nav) => {
      const active = isHome ? nav.dataset.view === 'Home' : nav.dataset.route === route;
      nav.classList.toggle('active', active);
      if (active) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-mobile-route]').forEach((nav) => nav.classList.toggle('active', nav.dataset.mobileRoute === route));
    if (!openCaseId) window.history.replaceState(null, '', isDirectory ? '#members' : isCases ? '#cases' : isSignals ? '#signals' : '#home');
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
    const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (event.key === '/' && !typing) { event.preventDefault(); search.focus(); }
  });

  menuButton.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
    item.addEventListener('click', (event) => {
      const isHome = item.dataset.view === 'Home';
      const route = item.dataset.route;
      if (!isHome && !['directory', 'cases', 'signals'].includes(route)) {
        event.preventDefault();
        showToast(`${item.dataset.view} is queued for the next build checkpoint.`);
        return;
      }
      event.preventDefault();
      showRoute(isHome ? 'home' : route);
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

  document.querySelectorAll('[data-signal-filter]').forEach((button) => button.addEventListener('click', () => {
    activeSignalFilter = button.dataset.signalFilter;
    signalFeedLimit = 12;
    document.querySelectorAll('[data-signal-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderSignalFeed();
  }));
  signalSearch.addEventListener('input', renderSignalFeed);
  document.querySelectorAll('[data-feed-query]').forEach((button) => button.addEventListener('click', () => {
    signalSearch.value = button.dataset.feedQuery;
    activeSignalFilter = 'all';
    document.querySelectorAll('[data-signal-filter]').forEach((item) => item.classList.toggle('active', item.dataset.signalFilter === 'all'));
    renderSignalFeed();
    signalSearch.focus();
  }));

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.action === 'cases') showRoute('cases');
      else showToast(`${button.textContent.trim()} will open in the next checkpoint.`);
    });
  });
  document.querySelector('#report-button').addEventListener('click', () => showToast('Public access can prepare reports, but verified membership is required to submit them.'));
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
      document.querySelectorAll('.main-column .post-card').forEach((post) => { post.hidden = filter !== 'all' && post.dataset.category !== filter; });
    });
  });

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    if (!signalsView.hidden) {
      signalSearch.value = search.value;
      renderSignalFeed();
      return;
    }
    let matches = 0;
    document.querySelectorAll('.main-column .post-card').forEach((post) => {
      post.hidden = Boolean(query) && !post.dataset.search.includes(query) && !post.textContent.toLowerCase().includes(query);
      if (!post.hidden) matches += 1;
    });
    const acquired = query.length >= 3 && matches > 0;
    search.closest('.global-search').classList.toggle('signal-acquired', acquired);
    search.closest('.global-search').querySelector('kbd').textContent = acquired ? 'LOCK' : '/';
  });

  document.addEventListener('click', (event) => {
    const memberButton = event.target.closest('[data-feed-member]');
    if (memberButton) {
      loadMemberDirectory().then(() => openMemberProfile(memberButton.dataset.feedMember));
      return;
    }
    const caseLink = event.target.closest('[data-feed-case]');
    if (caseLink) {
      showRoute('cases', caseLink.dataset.feedCase);
      return;
    }
    const actionButton = event.target.closest('[data-feed-action]');
    if (actionButton) {
      const article = actionButton.closest('[data-feed-post], [data-post-id]');
      const postId = article?.dataset.feedPost || article?.dataset.postId;
      const post = signalFeed.find((item) => item.id === postId);
      if (!post) return;
      if (actionButton.dataset.feedAction === 'discuss') {
        const thread = article.querySelector('.discussion-thread');
        const opening = thread.hidden;
        thread.hidden = !opening;
        actionButton.setAttribute('aria-expanded', String(opening));
        actionButton.classList.toggle('active', opening);
        if (opening) thread.querySelector('.reply')?.scrollIntoView?.({block: 'nearest', behavior: body.classList.contains('reduce-motion') ? 'auto' : 'smooth'});
      }
      if (actionButton.dataset.feedAction === 'acknowledge') {
        if (acknowledgedSignals.has(postId)) acknowledgedSignals.delete(postId); else acknowledgedSignals.add(postId);
        const active = acknowledgedSignals.has(postId);
        actionButton.classList.toggle('active', active);
        actionButton.setAttribute('aria-pressed', String(active));
        const count = actionButton.querySelector('b');
        if (count) count.textContent = compactNumber(post.acknowledgements + (active ? 1 : 0));
        saveFeedState();
      }
      if (actionButton.dataset.feedAction === 'archive') {
        if (archivedSignals.has(postId)) archivedSignals.delete(postId); else archivedSignals.add(postId);
        const active = archivedSignals.has(postId);
        actionButton.classList.toggle('active', active);
        actionButton.setAttribute('aria-pressed', String(active));
        const label = actionButton.querySelector('span');
        if (label) label.textContent = active ? 'Archived' : 'Archive';
        saveFeedState();
        showToast(active ? 'Signal added to your local archive.' : 'Signal removed from your local archive.');
      }
      return;
    }
    const collapseButton = event.target.closest('[data-collapse-thread]');
    if (collapseButton) {
      const article = collapseButton.closest('[data-feed-post], [data-post-id]');
      article.querySelector('.discussion-thread').hidden = true;
      const discuss = article.querySelector('[data-feed-action="discuss"]');
      discuss?.setAttribute('aria-expanded', 'false');
      discuss?.classList.remove('active');
      return;
    }
    const moreButton = event.target.closest('[data-thread-more]');
    if (moreButton) {
      const thread = moreButton.closest('.discussion-thread');
      thread.querySelectorAll('[data-extra-reply]').forEach((reply) => { reply.hidden = false; });
      thread.querySelector('[data-thread-access]')?.removeAttribute('hidden');
      moreButton.remove();
      return;
    }
    const loadButton = event.target.closest('[data-load-signals]');
    if (loadButton) {
      signalFeedLimit += 10;
      renderSignalFeed();
      return;
    }
    const pollButton = event.target.closest('[data-poll-option]');
    if (pollButton) {
      pollButton.closest('.feed-poll-options').querySelectorAll('button').forEach((option) => option.classList.toggle('selected', option === pollButton));
      showToast('Vote recorded on this device. Public totals are simulated.');
    }
  });

  document.addEventListener('keydown', (event) => {
    const caseLink = event.target.closest('[data-feed-case]');
    if (caseLink && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      showRoute('cases', caseLink.dataset.feedCase);
    }
  });

  document.querySelector('.play-button')?.addEventListener('click', (event) => {
    event.currentTarget.classList.toggle('active');
    event.currentTarget.setAttribute('aria-label', event.currentTarget.classList.contains('active') ? 'Pause evidence recording' : 'Play evidence recording');
    showToast('Evidence audio placeholder. Transcript-first playback arrives with the Evidence Lab.');
  });
  toast.querySelector('button').addEventListener('click', () => { toast.hidden = true; });

  loadSignalFeed();

  const initialHash = window.location.hash;
  if (initialHash === '#members') showRoute('directory');
  else if (initialHash === '#cases') showRoute('cases');
  else if (initialHash === '#signals') showRoute('signals');
  else if (/^#case-\d{4}$/.test(initialHash)) showRoute('cases', `DSN-${initialHash.slice(-4)}`);
})();
