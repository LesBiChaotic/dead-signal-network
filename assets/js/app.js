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
  const contentGrid = document.querySelector('.content-grid');
  const mainColumn = document.querySelector('.main-column');
  const rightRail = document.querySelector('.right-rail');
  const directoryView = document.querySelector('.directory-view');
  const memberProfileView = document.querySelector('.member-profile-view');
  const memberProfileContent = document.querySelector('#member-profile-content');
  const teamsView = document.querySelector('.teams-view');
  const teamProfileView = document.querySelector('.team-profile-view');
  const teamGrid = document.querySelector('#team-grid');
  const teamSearch = document.querySelector('#team-search');
  const teamCount = document.querySelector('#team-count');
  const communityRanks = document.querySelector('#community-ranks');
  const teamNetworkRail = document.querySelector('#team-network-rail');
  const teamProfileContent = document.querySelector('#team-profile-content');
  const memberGrid = document.querySelector('#member-grid');
  const memberSearch = document.querySelector('#member-search');
  const directoryCount = document.querySelector('#directory-count');
  const caseRegistryView = document.querySelector('.case-registry-view');
  const caseFileView = document.querySelector('.case-file-view');
  const caseFileContent = document.querySelector('#case-file-content');
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
  let memberFiles = [];
  let activeMemberProfile = null;
  let memberReturnRoute = {route: 'directory'};
  let communityNetwork = null;
  let activeTeamFilter = 'all';
  let activeTeamProfile = null;
  let teamLoadPromise = null;
  let activeMemberFilter = 'all';
  let memberSystem = null;
  let caseRegistry = [];
  let caseFileRecords = [];
  let activeCaseFile = null;
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

  async function loadMemberDirectory() {
    if (memberDirectory.length) return renderDirectory();
    directoryCount.textContent = 'Loading personnel index…';
    try {
      const [membersResponse, profilesResponse, systemResponse, filesResponse] = await Promise.all([
        fetch('assets/data/members.json'),
        fetch('assets/data/profile-seeds.json'),
        fetch('assets/data/member-system.json'),
        fetch('assets/data/member-files.json')
      ]);
      if (!membersResponse.ok || !profilesResponse.ok || !systemResponse.ok || !filesResponse.ok) throw new Error('Personnel index unavailable');
      const [membersData, profilesData, systemData, filesData] = await Promise.all([membersResponse.json(), profilesResponse.json(), systemResponse.json(), filesResponse.json()]);
      memberSystem = systemData;
      memberFiles = filesData.profiles;
      const profilesById = new Map(profilesData.profiles.map((profile) => [profile.id, profile]));
      memberDirectory = membersData.members.map((member) => ({...member, ...profilesById.get(member.id)}));
      renderDirectory();
    } catch (error) {
      directoryCount.textContent = 'Personnel index unavailable';
      memberGrid.innerHTML = '<p class="profile-summary">The public directory could not be loaded. The incident has been added to Systems review.</p>';
    }
  }

  function memberReturnFromCurrentView() {
    if (!caseFileView.hidden && activeCaseFile) return {route: 'case-file', id: activeCaseFile};
    if (!teamProfileView.hidden && activeTeamProfile) return {route:'team-profile',id:activeTeamProfile};
    if (!teamsView.hidden) return {route:'teams'};
    if (!signalsView.hidden) return {route: 'signals'};
    if (!caseRegistryView.hidden) return {route: 'cases'};
    if (!mainColumn.hidden) return {route: 'home'};
    return {route: 'directory'};
  }

  async function openMemberProfile(id, returnOverride) {
    const member = memberDirectory.find((item) => item.id === id);
    const details = memberFiles.find((item) => item.id === id);
    if (!member || !details) return;
    if (memberProfileView.hidden) memberReturnRoute = returnOverride || memberReturnFromCurrentView();
    await Promise.all([
      caseRegistry.length ? Promise.resolve() : loadCaseRegistry(),
      signalFeed.length ? Promise.resolve() : loadSignalFeed()
    ]);
    activeMemberProfile = id;
    const distinctions = member.distinctions.map((item) => `<span>${escapeHTML(distinctionLabel(item))}</span>`).join('');
    const roles = member.officialRoles.map((item) => `<span>${escapeHTML(item)}</span>`).join('');
    const authoredPosts = signalFeed.filter((post) => post.author === id);
    const assignedCases = caseRegistry.filter((caseFile) => caseFile.personnel.includes(id));
    const affiliations = details.affiliations.map((item) => `<span>${escapeHTML(item)}</span>`).join('');
    const specialties = member.specialties.map((item) => `<span>${escapeHTML(item)}</span>`).join('');
    const stats = Object.entries(details.stats).map(([label, value]) => `<span><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong></span>`).join('');
    const connections = details.connections.map((connection) => {
      const person = memberDirectory.find((item) => item.id === connection.id);
      if (!person) return '';
      return `<button class="connection-card connection-${escapeHTML(connection.tone)}" type="button" data-feed-member="${escapeHTML(person.id)}">
        <span class="profile-frame frame-${escapeHTML(person.frame)}" aria-hidden="true">${portraitMarkup(person)}</span>
        <span><small>${escapeHTML(connection.label)}</small><strong>${escapeHTML(person.name)}</strong><p>${escapeHTML(connection.note)}</p></span>
        <i>View profile →</i>
      </button>`;
    }).join('');
    const history = details.history.map((entry) => `<article class="member-history-entry member-history-${escapeHTML(entry.tone)}"><time>${escapeHTML(entry.date)}</time><div><strong>${escapeHTML(entry.label)}</strong><p>${escapeHTML(entry.detail)}</p></div></article>`).join('');
    const recentHistory = details.history.slice(-2).reverse().map((entry) => `<article class="member-history-entry member-history-${escapeHTML(entry.tone)}"><time>${escapeHTML(entry.date)}</time><div><strong>${escapeHTML(entry.label)}</strong><p>${escapeHTML(entry.detail)}</p></div></article>`).join('');
    const notes = details.accountNotes.map((note) => `<article class="member-record-note member-record-${escapeHTML(note.tone)}"><span>${escapeHTML(note.label)}</span><p>${escapeHTML(note.text)}</p></article>`).join('');
    const casework = assignedCases.length ? assignedCases.map((caseFile) => `<button class="member-case-card case-risk-${caseFile.risk || 'unknown'}" type="button" data-related-case="${escapeHTML(caseFile.id)}">
      <span><small>${escapeHTML(caseFile.id)} / ${escapeHTML(caseStatusLabel(caseFile.status))}</small><strong>${escapeHTML(caseFile.title)}</strong><p>${escapeHTML(caseFile.classification)} · ${escapeHTML(caseFile.location)}</p></span>
      <i>Open dossier →</i>
    </button>`).join('') : '<p class="case-empty-note">No public case assignments are indexed for this member.</p>';
    const posts = authoredPosts.length ? authoredPosts.map((post) => `<article class="member-activity-post signal-${escapeHTML(post.signal)}">
      <header><span>${escapeHTML(post.badge)}</span><time>${escapeHTML(post.time)}</time></header>
      <p>${escapeHTML(post.text)}</p>
      <footer><span>${compactNumber(post.acknowledgements)} acknowledgements</span><span>${compactNumber(post.comments)} replies</span>${post.case ? `<button type="button" data-related-case="${escapeHTML(post.case)}">${escapeHTML(post.case)}</button>` : ''}</footer>
    </article>`).join('') : '<p class="case-empty-note">No public Signal Feed posts are currently indexed.</p>';
    const unstable = hasUnstableAccount(member);
    memberProfileContent.innerHTML = `
      <button class="case-back-button" type="button" data-member-back>← Return to ${memberReturnRoute.route === 'case-file' ? 'case file' : memberReturnRoute.route === 'team-profile' ? 'group' : memberReturnRoute.route === 'teams' ? 'Teams & Groups' : memberReturnRoute.route === 'signals' ? 'Signal Feed' : memberReturnRoute.route === 'home' ? 'Home' : 'Member Directory'}</button>
      <header class="member-dossier-hero ${unstable ? 'member-dossier-unstable' : ''}">
        <div class="member-dossier-identity">
          <span class="profile-frame frame-${escapeHTML(member.frame)} ${unstable ? 'account-ghost' : ''}">${portraitMarkup(member, false)}</span>
          <div><p class="eyebrow">Dead Signal Network / Public Personnel Record</p><span class="member-number">${escapeHTML(details.memberNumber)}</span><h1 id="member-profile-title">${escapeHTML(member.name)}</h1><p>${escapeHTML(member.handle)} · ${escapeHTML(member.pronouns)} · ${escapeHTML(member.location)}</p></div>
        </div>
        <div class="member-profile-actions"><button class="button button-primary" type="button" data-profile-action="follow">Follow</button><button class="button button-secondary" type="button" data-profile-action="invite">Invite</button></div>
        <blockquote>“${escapeHTML(details.tagline)}”</blockquote>
        <div class="member-stat-grid">${stats}</div>
      </header>
      <nav class="case-file-tabs member-profile-tabs" aria-label="Member profile sections">
        <button class="active" type="button" data-member-tab="overview">Overview</button><button type="button" data-member-tab="activity">Activity <span>${authoredPosts.length}</span></button><button type="button" data-member-tab="casework">Casework <span>${assignedCases.length}</span></button><button type="button" data-member-tab="connections">Connections <span>${details.connections.length}</span></button><button type="button" data-member-tab="record">Account record</button>
      </nav>
      <div class="member-profile-body">
        <main class="member-profile-main">
          <section class="member-tab-panel" data-member-panel="overview">
            <div class="case-section-heading"><div><p class="eyebrow">Public biography</p><h2>About ${escapeHTML(member.name.replace(/^Dr\.\s+/, ''))}</h2></div><span>${escapeHTML(stateLabel(member.accountState))}</span></div>
            <p class="member-profile-summary">${escapeHTML(member.summary)}</p>
            <div class="member-profile-callout"><span>FIELD STATUS</span><p>${escapeHTML(details.fieldStatus)}</p></div>
            <section class="member-profile-subsection"><h3>Specialties</h3><div class="profile-tags">${specialties}</div></section>
            <section class="member-profile-subsection"><h3>Affiliations</h3><div class="profile-tags">${affiliations}</div></section>
            <section class="member-profile-subsection"><h3>Recent record activity</h3><div class="member-history member-history-compact">${recentHistory}</div><button class="text-button member-show-record" type="button" data-member-tab-jump="record">View complete account history →</button></section>
          </section>
          <section class="member-tab-panel" data-member-panel="activity" hidden><div class="case-section-heading"><div><p class="eyebrow">Public transmissions</p><h2>Signal Feed activity</h2></div><span>${authoredPosts.length} INDEXED</span></div><div class="member-activity-list">${posts}</div></section>
          <section class="member-tab-panel" data-member-panel="casework" hidden><div class="case-section-heading"><div><p class="eyebrow">Public assignments</p><h2>Case history</h2></div><span>${assignedCases.length} RECORDS</span></div><div class="member-case-grid">${casework}</div></section>
          <section class="member-tab-panel" data-member-panel="connections" hidden><div class="case-section-heading"><div><p class="eyebrow">Declared and indexed associations</p><h2>Connections</h2></div><span>PUBLIC CONTEXT ONLY</span></div><div class="connection-grid">${connections}</div></section>
          <section class="member-tab-panel" data-member-panel="record" hidden>
            <div class="case-section-heading"><div><p class="eyebrow">Credential chronology</p><h2>Account history</h2></div><span>${escapeHTML(details.memberNumber)}</span></div>
            <div class="member-history">${history}</div>
            <section class="member-profile-subsection"><h3>Access notes</h3><div class="member-record-note-grid">${notes}</div></section>
            <section class="member-profile-subsection"><h3>Invitation provenance</h3><div class="invitation-record"><span>${escapeHTML(details.invitation.type)}</span><dl><dt>Issued by</dt><dd>${escapeHTML(details.invitation.issuer)}</dd><dt>Accepted</dt><dd>${escapeHTML(details.invitation.date)}</dd><dt>Record note</dt><dd>${escapeHTML(details.invitation.note)}</dd></dl></div></section>
          </section>
        </main>
        <aside class="member-profile-rail">
          <section class="member-standing-card"><span>NETWORK STANDING</span><strong>${escapeHTML(member.role)}</strong><small class="member-status state-${escapeHTML(member.accountState)}">${escapeHTML(stateLabel(member.accountState))}</small><dl><dt>Member</dt><dd>${escapeHTML(details.memberNumber)}</dd><dt>Joined</dt><dd>${escapeHTML(member.joined)}</dd><dt>Last seen</dt><dd>${escapeHTML(member.lastSeen)}</dd><dt>Access</dt><dd>${escapeHTML(member.access.replaceAll('-', ' '))}</dd><dt>Languages</dt><dd>${escapeHTML(member.languages.join(', '))}</dd></dl></section>
          <section><span>ROLES + DISTINCTIONS</span><div class="profile-tags profile-rail-tags">${roles}${distinctions || '<span>No public distinctions</span>'}</div></section>
          <section class="member-team-card"><span>PRIMARY TEAM</span><strong>${escapeHTML(member.team || 'Independent')}</strong><p>${escapeHTML(details.affiliations.join(' / '))}</p></section>
          <section class="member-portrait-card"><span>PORTRAIT RECORD</span><strong>${escapeHTML(member.portraitMode.replaceAll('-', ' '))}</strong><p>${escapeHTML(member.portraitBrief)}</p></section>
        </aside>
      </div>`;
    showRoute('member-profile', id);
    window.history.replaceState(null, '', `#member-${member.id}`);
    if (unstable && ['imani-okafor','camille-arsenault','ari-santos','santi-rojas','lidia-varga'].includes(id)) window.setTimeout(triggerStaticBreach, 120);
  }

  function caseStatusLabel(status) {
    return status.replaceAll('-', ' ');
  }

  function teamTypeLabel(type) {
    return ({official:'Official department',field:'Field team',specialist:'Specialist circle',community:'Community group',restricted:'Restricted group'})[type] || type;
  }

  function renderTeams() {
    if (!communityNetwork) return;
    const query = teamSearch.value.trim().toLowerCase();
    const visible = communityNetwork.groups.filter((group) => {
      const matchesType = activeTeamFilter === 'all' || group.type === activeTeamFilter;
      const memberNames = group.members.map(memberName).join(' ');
      const haystack = [group.name,group.code,group.summary,group.motto,group.type,memberNames,...group.requirements,...group.channels].join(' ').toLowerCase();
      return matchesType && (!query || haystack.includes(query));
    });
    teamGrid.innerHTML = visible.length ? visible.map((group,index) => {
      const lead = memberDirectory.find((member) => member.id === group.lead);
      const displayed = group.members.slice(0,4).map((id) => {
        const member = memberDirectory.find((item) => item.id === id);
        return member ? `<span class="profile-frame frame-${escapeHTML(member.frame)}" title="${escapeHTML(member.name)}">${portraitMarkup(member)}</span>` : '';
      }).join('');
      return `<button class="team-card team-${escapeHTML(group.type)} signal-arrival" style="--signal-delay:${Math.min(index*45,260)}ms" type="button" data-team-id="${escapeHTML(group.id)}">
        <span class="team-card-top"><span class="team-code">${escapeHTML(group.code)}</span><span class="team-status team-status-${escapeHTML(group.status)}">${escapeHTML(group.status)}</span></span>
        <span class="team-card-title"><small>${escapeHTML(teamTypeLabel(group.type))}</small><strong>${escapeHTML(group.name)}</strong></span>
        <span class="team-motto">“${escapeHTML(group.motto)}”</span><p>${escapeHTML(group.summary)}</p>
        <span class="team-card-members"><span class="team-avatar-stack">${displayed}</span><span><strong>${escapeHTML(group.memberCount)} members</strong><small>${escapeHTML(group.online)} online · Led by ${escapeHTML(lead?.name || 'unavailable')}</small></span></span>
        <span class="team-card-footer"><span>${escapeHTML(group.invitation)}</span><strong>Open group →</strong></span>
      </button>`;
    }).join('') : '<p class="empty-registry">No teams or groups match this query.</p>';
    teamCount.textContent = `${visible.length} ${visible.length===1?'group':'groups'} displayed`;
    teamSearch.closest('.member-search').classList.toggle('signal-acquired',query.length>=3&&visible.length>0);
  }

  function renderCommunityRail() {
    const rules = communityNetwork.invitationRules.map((rule) => `<li><strong>${escapeHTML(rule.type)}</strong><span>${escapeHTML(rule.issuer)}</span><small>${escapeHTML(rule.expiry)} · ${escapeHTML(rule.grant)}</small></li>`).join('');
    teamNetworkRail.innerHTML = `<section class="rail-card"><p class="eyebrow">Invitation routes</p><h2>How membership spreads</h2><ol class="invitation-rule-list">${rules}</ol></section><section class="rail-card advisory-card"><p class="eyebrow">Public account</p><strong>Visitor access</strong><p>You can explore public groups. Joining, accepting invitations, and viewing private channels require a verified account.</p></section><section class="rail-card team-anomaly-card"><p class="eyebrow">Pending invitation</p><strong>Field Unit W-8</strong><p>Issuer unavailable · Invitation does not expire.</p><button type="button" data-team-id="w8">Inspect invitation →</button></section>`;
  }

  async function loadTeams(openId) {
    if (!teamLoadPromise) {
      teamLoadPromise = Promise.all([
        fetch('assets/data/community-network.json').then((response)=>{if(!response.ok)throw new Error('Community index unavailable');return response.json();}),
        loadMemberDirectory(),
        caseRegistry.length ? Promise.resolve() : loadCaseRegistry()
      ]).then(([data]) => {
        communityNetwork = data;
        communityRanks.innerHTML = data.ranks.map((rank,index) => `<span class="${index===0?'active':''}"><i>${escapeHTML(rank.mark)}</i><strong>${escapeHTML(rank.label)}</strong><small>${escapeHTML(rank.grants)}</small></span>`).join('');
        renderTeams();
        renderCommunityRail();
      }).catch(() => {
        teamCount.textContent='Community index unavailable';
        teamGrid.innerHTML='<p class="empty-registry">The group directory could not be synchronized.</p>';
      });
    }
    await teamLoadPromise;
    if(openId) openTeamProfile(openId);
  }

  function openTeamProfile(id) {
    const group = communityNetwork?.groups.find((item)=>item.id===id);
    if(!group)return;
    activeTeamProfile=id;
    const lead=memberDirectory.find((member)=>member.id===group.lead);
    const members=group.members.map((memberId)=>{
      const member=memberDirectory.find((item)=>item.id===memberId);
      if(!member)return '';
      return `<button class="team-roster-card" type="button" data-feed-member="${escapeHTML(member.id)}"><span class="profile-frame frame-${escapeHTML(member.frame)}">${portraitMarkup(member)}</span><span><strong>${escapeHTML(member.name)}</strong><small>${escapeHTML(member.role)}</small></span>${member.id===group.lead?'<i>LEAD</i>':''}</button>`;
    }).join('');
    const requirements=group.requirements.map((item)=>`<li>${escapeHTML(item)}</li>`).join('');
    const channels=group.channels.map((item)=>`<span>${escapeHTML(item)}</span>`).join('');
    const cases=group.caseIds.map((caseId)=>{
      const caseFile=caseRegistry.find((item)=>item.id===caseId);
      return `<button type="button" data-related-case="${escapeHTML(caseId)}"><span>${escapeHTML(caseId)}</span><strong>${escapeHTML(caseFile?.title||'Record unavailable')}</strong></button>`;
    }).join('');
    const updates=group.updates.map((item)=>`<article><time>${escapeHTML(item.time)}</time><p>${escapeHTML(item.text)}</p></article>`).join('');
    const rivalries=group.rivalries.map((item)=>{
      const rival=communityNetwork.groups.find((entry)=>entry.id===item.group);
      return `<button class="rivalry-card" type="button" data-team-id="${escapeHTML(item.group)}"><span>${escapeHTML(item.label)}</span><strong>${escapeHTML(rival?.name||item.group)}</strong><p>${escapeHTML(item.note)}</p></button>`;
    }).join('');
    teamProfileContent.innerHTML=`
      <button class="case-back-button" type="button" data-team-back>← Return to Teams & Groups</button>
      <header class="team-profile-hero team-profile-${escapeHTML(group.type)}"><div><p class="eyebrow">${escapeHTML(teamTypeLabel(group.type))} / ${escapeHTML(group.code)}</p><h1 id="team-profile-title">${escapeHTML(group.name)}</h1><blockquote>“${escapeHTML(group.motto)}”</blockquote></div><div class="team-profile-stamp"><span>${escapeHTML(group.visibility)}</span><strong>${escapeHTML(group.status)}</strong><small>EST. ${escapeHTML(group.founded)}</small></div><p>${escapeHTML(group.summary)}</p><div class="team-profile-stats"><span><small>Members</small><strong>${escapeHTML(group.memberCount)}</strong></span><span><small>Online</small><strong>${escapeHTML(group.online)}</strong></span><span><small>Lead</small><strong>${escapeHTML(lead?.name||'Unavailable')}</strong></span><span><small>Invitation</small><strong>${escapeHTML(group.invitation)}</strong></span></div></header>
      <div class="team-profile-layout"><main><section class="team-profile-section"><div class="case-section-heading"><div><p class="eyebrow">Public roster</p><h2>Members</h2></div><span>${escapeHTML(group.members.length)} DISPLAYED</span></div><div class="team-roster-grid">${members}</div>${group.memberCount>group.members.length?`<p class="team-roster-note">+${group.memberCount-group.members.length} members are not displayed in this public roster.</p>`:''}</section><section class="team-profile-section"><div class="case-section-heading"><div><p class="eyebrow">Social weather</p><h2>Rivalries & tensions</h2></div></div><div class="rivalry-grid">${rivalries}</div></section></main><aside><section><span>MEMBERSHIP REQUIREMENTS</span><ul>${requirements}</ul><button type="button" data-team-join>${escapeHTML(group.invitation)}</button></section><section><span>PUBLIC CHANNELS</span><div class="team-channel-list">${channels}</div></section><section><span>RELATED CASES</span><div class="team-case-list">${cases}</div></section><section><span>RECENT ACTIVITY</span><div class="team-update-list">${updates}</div></section></aside></div>`;
    showRoute('team-profile',id);
    window.history.replaceState(null,'',`#team-${group.id}`);
    if(group.id==='w8')window.setTimeout(triggerStaticBreach,100);
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
    const details = caseFileRecords.find((item) => item.id === id);
    if (!caseFile || !details) return;
    activeCaseFile = id;
    const allTimeline = [...caseFile.timeline, ...details.timeline].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const relatedPosts = signalFeed.filter((post) => post.case === id || details.relatedSignals.includes(post.id));
    const personnel = caseFile.personnel.map((person) => memberDirectory.find((member) => member.id === person)).filter(Boolean);
    const conditions = details.conditions.map((item) => `<span><small>${escapeHTML(item.label)}</small><strong>${escapeHTML(item.value)}</strong></span>`).join('');
    const notes = details.fieldNotes.map((note) => `<article class="case-note case-note-${escapeHTML(note.tone)}"><span>${escapeHTML(note.label)}</span><p>${escapeHTML(note.text)}</p></article>`).join('');
    const timeline = allTimeline.map((entry) => `<div class="case-chronology-entry"><time>${escapeHTML(entry.date)}</time><div><strong>${escapeHTML(entry.label)}</strong><p>${escapeHTML(entry.detail)}</p></div></div>`).join('');
    const evidence = details.evidence.map((item, index) => `<article class="case-evidence-card state-${escapeHTML(item.state)}">
      <button type="button" data-evidence-toggle="${escapeHTML(item.id)}" aria-expanded="${index === 0}" aria-controls="evidence-${escapeHTML(item.id)}">
        <span class="evidence-type-mark">${escapeHTML(item.format.split(' ')[0].slice(0, 3))}</span>
        <span><small>${escapeHTML(item.id)} · ${escapeHTML(item.format)}</small><strong>${escapeHTML(item.description)}</strong><i>Custody: ${escapeHTML(item.custody)}</i></span>
        <span class="evidence-access">${escapeHTML(item.access)}</span>
      </button>
      <div class="evidence-detail" id="evidence-${escapeHTML(item.id)}" ${index === 0 ? '' : 'hidden'}>
        <div><small>RECOVERED CONTENT / TRANSCRIPT</small><p>${escapeHTML(item.transcript)}</p></div>
        <div><small>REVIEW FINDING</small><p>${escapeHTML(item.finding)}</p></div>
      </div>
    </article>`).join('');
    const witnesses = details.witnesses.map((witness) => `<blockquote><p>“${escapeHTML(witness.statement)}”</p><footer>${escapeHTML(witness.name)} <span>/ ${escapeHTML(witness.role)}</span></footer></blockquote>`).join('');
    const memberCards = personnel.length ? personnel.map((member) => `<button class="case-personnel-card" type="button" data-feed-member="${escapeHTML(member.id)}"><span class="profile-frame frame-${escapeHTML(member.frame)}" aria-hidden="true">${portraitMarkup(member)}</span><span><strong>${escapeHTML(member.name)}</strong><small>${escapeHTML(member.role)}</small></span></button>`).join('') : '<div class="case-redaction">███████ / SEVEN PERSONNEL RECORDS WITHHELD</div>';
    const relatedCases = caseFile.relatedCases.length ? caseFile.relatedCases.map((relatedId) => {
      const related = caseRegistry.find((item) => item.id === relatedId);
      return `<button class="related-dossier" type="button" data-related-case="${escapeHTML(relatedId)}"><span>${escapeHTML(relatedId)}</span><strong>${escapeHTML(related?.title || 'Record unavailable')}</strong><small>Open linked dossier →</small></button>`;
    }).join('') : '<p class="case-empty-note">No public case links.</p>';
    const relatedSignals = relatedPosts.length ? relatedPosts.map((post) => {
      const member = feedMember(post.author);
      return `<article class="case-signal"><div><span>${escapeHTML(member?.name || 'Unavailable account')}</span><small>${escapeHTML(post.time)}</small></div><p>${escapeHTML(post.text)}</p><button type="button" data-case-signal="${escapeHTML(post.id)}">Open in Signal Feed →</button></article>`;
    }).join('') : '<p class="case-empty-note">No indexed public signals. Discussions may exist outside public routing.</p>';
    const discussion = details.discussion.posts.map((post) => {
      const member = feedMember(post.author);
      return `<article class="case-comment state-${escapeHTML(post.state)}"><button type="button" data-feed-member="${escapeHTML(post.author)}">${escapeHTML(initials(member?.name || 'Unavailable account'))}</button><div><header><strong>${escapeHTML(member?.name || 'Unavailable account')}</strong><span>${escapeHTML(post.time)}</span><i>${escapeHTML(post.state)}</i></header><p>${escapeHTML(post.text)}</p></div></article>`;
    }).join('');
    caseFileContent.innerHTML = `
      <button class="case-back-button" type="button" data-case-back>← Return to Case Registry</button>
      <header class="case-dossier-hero ${caseFile.status === 'sealed' ? 'case-dossier-sealed' : ''}">
        <div class="case-dossier-heading"><span class="risk case-file-risk risk-${caseFile.risk === 3 ? 'three' : caseFile.risk === 2 ? 'two' : 'one'}">${escapeHTML(riskNumeral(caseFile.risk))}</span><div><p class="eyebrow">Dead Signal Network / Public Case File</p><span class="case-id">${escapeHTML(caseFile.id)}</span><h1 id="case-file-title">${escapeHTML(caseFile.title)}</h1></div></div>
        <div class="case-dossier-stamp"><span>STATUS</span><strong>${escapeHTML(caseStatusLabel(caseFile.status))}</strong><small>UPDATED / ${escapeHTML(caseFile.updated)}</small></div>
        <p class="case-dossier-summary">${escapeHTML(details.brief)}</p>
        <div class="case-condition-grid">${conditions}</div>
      </header>
      <nav class="case-file-tabs" aria-label="Case file sections">
        <button class="active" type="button" data-case-tab="overview">Overview</button><button type="button" data-case-tab="chronology">Chronology <span>${allTimeline.length}</span></button><button type="button" data-case-tab="evidence">Evidence <span>${details.evidence.length}</span></button><button type="button" data-case-tab="personnel">Personnel <span>${caseFile.personnel.length || 7}</span></button><button type="button" data-case-tab="signals">Related signals <span>${relatedPosts.length}</span></button><button type="button" data-case-tab="discussion">Discussion <span>${details.discussion.count}</span></button>
      </nav>
      <div class="case-file-body">
        <main class="case-file-main">
          <section class="case-tab-panel" data-case-panel="overview">
            <div class="case-section-heading"><div><p class="eyebrow">File summary</p><h2>Investigation overview</h2></div><span>PUBLIC ACCESS</span></div>
            <p class="case-lead">${escapeHTML(caseFile.summary)}</p>
            <div class="case-public-finding"><span>PUBLIC FINDING</span><p>${escapeHTML(caseFile.publicFinding)}</p></div>
            <div class="case-note-grid">${notes}</div>
            <section class="case-subsection"><h3>Witness statements</h3><div class="case-witness-grid">${witnesses}</div></section>
          </section>
          <section class="case-tab-panel" data-case-panel="chronology" hidden><div class="case-section-heading"><div><p class="eyebrow">Verified sequence</p><h2>Case chronology</h2></div><span>LOCAL + UTC MIXED</span></div><div class="case-chronology">${timeline}</div></section>
          <section class="case-tab-panel" data-case-panel="evidence" hidden><div class="case-section-heading"><div><p class="eyebrow">Chain of custody</p><h2>Evidence inventory</h2></div><span>SELECT TO INSPECT</span></div><div class="case-evidence-list">${evidence}</div></section>
          <section class="case-tab-panel" data-case-panel="personnel" hidden><div class="case-section-heading"><div><p class="eyebrow">Assigned network personnel</p><h2>Investigation team</h2></div><span>${escapeHTML(caseFile.team)}</span></div><div class="case-personnel-grid">${memberCards}</div></section>
          <section class="case-tab-panel" data-case-panel="signals" hidden><div class="case-section-heading"><div><p class="eyebrow">Community cross-index</p><h2>Related Signal Feed posts</h2></div><span>${relatedPosts.length} INDEXED</span></div><div class="case-related-signals">${relatedSignals}</div></section>
          <section class="case-tab-panel" data-case-panel="discussion" hidden><div class="case-section-heading"><div><p class="eyebrow">Public case thread</p><h2>Discussion</h2></div><span>${details.discussion.count} RESPONSES</span></div><div class="case-discussion">${discussion}<div class="thread-access-note">${Math.max(0, details.discussion.count - details.discussion.posts.length)} additional replies require member access.</div><div class="reply-composer"><input type="text" aria-label="Reply to case discussion" placeholder="Sign in to reply…" disabled><button type="button" disabled>Reply</button></div></div></section>
        </main>
        <aside class="case-file-rail">
          <section><span>CASE CONTROL</span><dl><dt>Classification</dt><dd>${escapeHTML(caseFile.classification)}</dd><dt>Location</dt><dd>${escapeHTML(caseFile.location)}</dd><dt>Opened</dt><dd>${escapeHTML(caseFile.opened)}</dd><dt>Assigned unit</dt><dd>${escapeHTML(caseFile.team)}</dd><dt>Visibility</dt><dd>${escapeHTML(caseFile.visibility)}</dd></dl></section>
          <section class="case-protocol"><span>FIELD PROTOCOL</span><p>${escapeHTML(details.protocol)}</p></section>
          <section><span>RELATED RECORDS</span><div class="related-dossier-list">${relatedCases}</div></section>
          <section class="case-access-card"><span>ACCESS TIER / PUBLIC</span><p>Unsafe procedures, exact coordinates, and protected witness identities are not included in this rendering.</p><button type="button" data-request-access>Request member access</button></section>
        </aside>
      </div>`;
    showRoute('case-file', id);
    window.history.replaceState(null, '', `#case-${caseFile.id.replace('DSN-', '')}`);
    if (caseFile.id === 'DSN-0000') window.setTimeout(triggerStaticBreach, 90);
  }

  async function loadCaseRegistry(openId) {
    if (!caseLoadPromise) {
      caseLoadPromise = Promise.all([
        fetch('assets/data/cases.json').then((response) => { if (!response.ok) throw new Error('Case index unavailable'); return response.json(); }),
        fetch('assets/data/case-files.json').then((response) => { if (!response.ok) throw new Error('Case files unavailable'); return response.json(); }),
        loadMemberDirectory()
      ]).then(([caseData, fileData]) => {
        caseRegistry = caseData.cases;
        caseFileRecords = fileData.files;
        renderCaseRegistry();
      }).catch(() => {
        caseCount.textContent = 'Case index unavailable';
        caseGrid.innerHTML = '<p class="empty-registry">The public case registry could not be loaded. Systems has been notified.</p>';
      });
    }
    await caseLoadPromise;
    if (openId) {
      await loadSignalFeed();
      openCaseFile(openId);
    }
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
    const isMemberProfile = route === 'member-profile';
    const isTeams = route === 'teams';
    const isTeamProfile = route === 'team-profile';
    const isCases = route === 'cases';
    const isSignals = route === 'signals';
    const isCaseFile = route === 'case-file';
    mainColumn.hidden = !isHome;
    rightRail.hidden = !isHome;
    directoryView.hidden = !isDirectory;
    memberProfileView.hidden = !isMemberProfile;
    teamsView.hidden = !isTeams;
    teamProfileView.hidden = !isTeamProfile;
    caseRegistryView.hidden = !isCases;
    signalsView.hidden = !isSignals;
    caseFileView.hidden = !isCaseFile;
    contentGrid.classList.toggle('full-page-mode', !isHome);
    if (isDirectory) loadMemberDirectory();
    if (isTeams) loadTeams();
    if (isCases) loadCaseRegistry(openCaseId);
    if (isCaseFile && openCaseId && activeCaseFile !== openCaseId) loadCaseRegistry(openCaseId);
    if (isSignals) loadSignalFeed();
    document.querySelectorAll('.nav-item[data-view]').forEach((nav) => {
      const active = isHome ? nav.dataset.view === 'Home' : (isCaseFile ? nav.dataset.route === 'cases' : isMemberProfile ? nav.dataset.route === 'directory' : isTeamProfile ? nav.dataset.route === 'teams' : nav.dataset.route === route);
      nav.classList.toggle('active', active);
      if (active) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-mobile-route]').forEach((nav) => nav.classList.toggle('active', nav.dataset.mobileRoute === (isCaseFile ? 'cases' : isMemberProfile ? 'directory' : route)));
    if (!openCaseId) window.history.replaceState(null, '', isDirectory ? '#members' : isCases ? '#cases' : isSignals ? '#signals' : isTeams ? '#teams' : '#home');
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
      if (!isHome && !['directory', 'cases', 'signals', 'teams'].includes(route)) {
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
  document.querySelectorAll('[data-team-filter]').forEach((button)=>button.addEventListener('click',()=>{
    activeTeamFilter=button.dataset.teamFilter;
    document.querySelectorAll('[data-team-filter]').forEach((item)=>item.classList.toggle('active',item===button));
    renderTeams();
  }));
  teamSearch.addEventListener('input',renderTeams);

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
    const teamBack=event.target.closest('[data-team-back]');
    if(teamBack){activeTeamProfile=null;showRoute('teams');return;}
    const teamLink=event.target.closest('[data-team-id]');
    if(teamLink){loadTeams().then(()=>openTeamProfile(teamLink.dataset.teamId));return;}
    if(event.target.closest('[data-team-join]')){showToast('Joining this group requires an eligible invitation and verified member account.');return;}
    const memberBack = event.target.closest('[data-member-back]');
    if (memberBack) {
      const destination = memberReturnRoute;
      activeMemberProfile = null;
      showRoute(destination.route, destination.id);
      if (destination.route === 'case-file' && destination.id) window.history.replaceState(null, '', `#case-${destination.id.replace('DSN-', '')}`);
      if (destination.route === 'team-profile' && destination.id) window.history.replaceState(null,'',`#team-${destination.id}`);
      return;
    }
    const memberTab = event.target.closest('[data-member-tab], [data-member-tab-jump]');
    if (memberTab) {
      const tab = memberTab.dataset.memberTab || memberTab.dataset.memberTabJump;
      memberProfileContent.querySelectorAll('[data-member-tab]').forEach((button) => button.classList.toggle('active', button.dataset.memberTab === tab));
      memberProfileContent.querySelectorAll('[data-member-panel]').forEach((panel) => { panel.hidden = panel.dataset.memberPanel !== tab; });
      memberProfileContent.querySelector('[data-member-panel]:not([hidden])')?.scrollIntoView?.({block:'start', behavior:body.classList.contains('reduce-motion') ? 'auto' : 'smooth'});
      return;
    }
    const profileAction = event.target.closest('[data-profile-action]');
    if (profileAction) {
      if (profileAction.dataset.profileAction === 'follow') {
        const following = profileAction.classList.toggle('active');
        profileAction.textContent = following ? 'Following' : 'Follow';
        showToast(following ? 'Member activity added to your local receiver.' : 'Member removed from your local receiver.');
      } else {
        showToast('Invitations require a verified member credential and an eligible issuer.');
      }
      return;
    }
    const backButton = event.target.closest('[data-case-back]');
    if (backButton) {
      activeCaseFile = null;
      showRoute('cases');
      return;
    }
    const tabButton = event.target.closest('[data-case-tab]');
    if (tabButton) {
      const tab = tabButton.dataset.caseTab;
      caseFileContent.querySelectorAll('[data-case-tab]').forEach((button) => button.classList.toggle('active', button === tabButton));
      caseFileContent.querySelectorAll('[data-case-panel]').forEach((panel) => { panel.hidden = panel.dataset.casePanel !== tab; });
      return;
    }
    const evidenceButton = event.target.closest('[data-evidence-toggle]');
    if (evidenceButton) {
      const detail = document.getElementById(`evidence-${evidenceButton.dataset.evidenceToggle}`);
      const opening = detail.hidden;
      detail.hidden = !opening;
      evidenceButton.setAttribute('aria-expanded', String(opening));
      return;
    }
    const relatedCase = event.target.closest('[data-related-case]');
    if (relatedCase) {
      openCaseFile(relatedCase.dataset.relatedCase);
      window.scrollTo({top: 0, behavior: body.classList.contains('reduce-motion') ? 'auto' : 'smooth'});
      return;
    }
    const caseSignal = event.target.closest('[data-case-signal]');
    if (caseSignal) {
      showRoute('signals');
      signalSearch.value = caseSignal.closest('.case-signal')?.querySelector('p')?.textContent.slice(0, 36) || '';
      renderSignalFeed();
      return;
    }
    if (event.target.closest('[data-request-access]')) {
      showToast('Public access request prepared. Verified membership is required to submit it.');
      return;
    }
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
  else if (initialHash === '#teams') showRoute('teams');
  else if (/^#case-\d{4}$/.test(initialHash)) showRoute('cases', `DSN-${initialHash.slice(-4)}`);
  else if (/^#member-[a-z0-9-]+$/.test(initialHash)) loadMemberDirectory().then(() => openMemberProfile(initialHash.replace('#member-', ''), {route:'directory'}));
  else if (/^#team-[a-z0-9-]+$/.test(initialHash)) loadTeams().then(()=>openTeamProfile(initialHash.replace('#team-','')));
})();
