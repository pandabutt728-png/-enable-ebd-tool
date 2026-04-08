/* ============================================================
   EBD Brief Generator — Enable
   app.js
   ============================================================ */

const STORAGE_KEY = 'ebd_draft_v2';
const HIST_KEY    = 'ebd_history_v2';

let saveTimer = null;
let currentBriefData = null;

/* ---- Tab switching ---- */
function switchTab(t) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${t}"]`).classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + t).classList.add('active');
  if (t === 'history') renderHistory();
}

/* ---- Tag toggle ---- */
function tog(el) {
  const g = el.dataset.g;
  document.querySelectorAll(`[data-g="${g}"]`).forEach(e => e.classList.remove('on'));
  el.classList.add('on');
  debounceSave();
}

function activeTag(g) {
  const el = document.querySelector(`[data-g="${g}"].on`);
  return el ? el.textContent.trim() : '';
}

/* ---- Field helpers ---- */
function gv(id) { return (document.getElementById(id) || {}).value || ''; }
function sv(id, val) { const el = document.getElementById(id); if (el && val) el.value = val; }

/* ---- Date/time formatting ---- */
function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}, ${y}`;
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

/* ---- Collect form data ---- */
function getFormData() {
  return {
    meetingType: activeTag('mt'),
    format:      activeTag('fmt'),
    company:     gv('f-company'),
    date:        gv('f-date'),
    time:        gv('f-time'),
    tz:          gv('f-tz'),
    loc:         gv('f-loc'),
    value:       gv('f-value'),
    close:       gv('f-close'),
    stage:       gv('f-stage'),
    enable:      gv('f-enable'),
    client:      gv('f-client'),
    snapshot:    gv('f-snapshot'),
    pain:        gv('f-pain'),
    roi:         gv('f-roi'),
    andrew:      gv('f-andrew'),
    push:        gv('f-push'),
    avoid:       gv('f-avoid'),
    obj:         gv('f-obj'),
    win:         gv('f-win'),
    notes:       gv('f-notes'),
  };
}

/* ---- Restore form from saved data ---- */
function restoreFormData(d) {
  if (!d) return;
  sv('f-company', d.company); sv('f-date', d.date);   sv('f-time', d.time);
  sv('f-tz', d.tz);           sv('f-loc', d.loc);     sv('f-value', d.value);
  sv('f-close', d.close);     sv('f-stage', d.stage); sv('f-enable', d.enable);
  sv('f-client', d.client);   sv('f-snapshot', d.snapshot);
  sv('f-pain', d.pain);       sv('f-roi', d.roi);     sv('f-andrew', d.andrew);
  sv('f-push', d.push);       sv('f-avoid', d.avoid); sv('f-obj', d.obj);
  sv('f-win', d.win);         sv('f-notes', d.notes);

  if (d.meetingType) document.querySelectorAll('[data-g="mt"]').forEach(e => { if (e.textContent.trim() === d.meetingType) e.classList.add('on'); });
  if (d.format)      document.querySelectorAll('[data-g="fmt"]').forEach(e => { if (e.textContent.trim() === d.format) e.classList.add('on'); });
}

/* ---- Auto-save ---- */
function debounceSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormData())); } catch(e) {}
    const b = document.getElementById('save-badge');
    b.textContent = 'Draft saved';
    b.classList.add('visible');
    setTimeout(() => b.classList.remove('visible'), 2000);
  }, 800);
}

/* ---- Clear form ---- */
function clearForm() {
  if (!confirm('Clear all form fields?')) return;
  ['f-company','f-date','f-time','f-tz','f-loc','f-value','f-close','f-stage',
   'f-enable','f-client','f-snapshot','f-pain','f-roi','f-andrew',
   'f-push','f-avoid','f-obj','f-win','f-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('.tag.on').forEach(t => t.classList.remove('on'));
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
}

/* ---- Attendee rendering with auto-generated LinkedIn search ---- */
function parseAttendee(line) {
  const parts = line.split(',').map(s => s.trim()).filter(Boolean);
  return { name: parts[0] || '', title: parts.slice(1).join(', ') };
}

function buildLinkedInSearchURL(name, title, company) {
  const q = `site:linkedin.com/in "${name}" "${company || title}"`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function renderAttendee(line, opts) {
  const a = parseAttendee(line);
  const linkedinSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
  let linkedinIcon = '';
  if (opts && opts.showLinkedIn && a.name) {
    const url = buildLinkedInSearchURL(a.name, a.title, opts.company);
    linkedinIcon = ` <a href="${url}" target="_blank" rel="noopener" class="brief-linkedin-link" title="Search LinkedIn for ${a.name}">${linkedinSvg}</a>`;
  }
  const titlePart = a.title ? `<span class="brief-attendee-title">, ${a.title}</span>` : '';
  return `<div class="brief-attendee-item">${a.name}${titlePart}${linkedinIcon}</div>`;
}

/* ---- Live LinkedIn links under Client contacts textarea ---- */
function renderClientLinkedInLinks() {
  const raw = gv('f-client').trim();
  const container = document.getElementById('client-linkedin-links');
  if (!container) return;
  if (!raw) { container.innerHTML = ''; return; }

  const company = gv('f-company');
  const contacts = raw.split('\n').map(l => l.trim()).filter(Boolean);

  container.innerHTML = contacts.map(line => {
    const a = parseAttendee(line);
    if (!a.name) return '';
    const url = buildLinkedInSearchURL(a.name, a.title, company);
    const titlePart = a.title ? ` · ${a.title}` : '';
    return `<a href="${url}" target="_blank" rel="noopener" class="client-li-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      <span>${a.name}${titlePart}</span>
    </a>`;
  }).join('');
}

/* ---- Build the brief HTML ---- */
function buildBriefHTML(d) {
  const lines = t => (t || '').split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = (arr) => arr.map(l => `<li>${l}</li>`).join('');

  const enableLines  = lines(d.enable);
  const clientLines  = lines(d.client);
  const pushLines    = lines(d.push);
  const avoidLines   = lines(d.avoid);
  const objLines     = lines(d.obj);

  const metaItems = [
    { label: 'Format',      value: d.format || '—' },
    { label: 'Date',        value: [fmtDate(d.date), fmtTime(d.time), d.tz].filter(Boolean).join(' ') || '—' },
    { label: 'Location',    value: d.loc || '—' },
    { label: 'Deal value',  value: d.value || '—' },
    { label: 'Close date',  value: fmtDate(d.close) || '—' },
    { label: 'Stage',       value: d.stage || '—' },
  ];

  return `
    <div class="brief-header-block">
      <div class="brief-company">${d.company || 'Unnamed company'}</div>
      ${d.meetingType ? `<span class="brief-meeting-type">${d.meetingType}</span>` : ''}
      <div class="brief-meta-grid">
        ${metaItems.map(m => `
          <div class="brief-meta-item">
            <div class="brief-meta-label">${m.label}</div>
            <div class="brief-meta-value">${m.value}</div>
          </div>`).join('')}
      </div>
    </div>

    ${(enableLines.length || clientLines.length) ? `
    <div class="brief-section">
      <div class="brief-section-title">Attendees</div>
      <div class="brief-attendees">
        <div class="brief-attendee-group">
          <div class="brief-attendee-label">Enable team</div>
          ${enableLines.map(l => renderAttendee(l)).join('') || '<div class="brief-attendee-item" style="color:var(--text-hint)">—</div>'}
        </div>
        <div class="brief-attendee-group">
          <div class="brief-attendee-label">Client contacts</div>
          ${clientLines.map(l => renderAttendee(l, { showLinkedIn: true, company: d.company })).join('') || '<div class="brief-attendee-item" style="color:var(--text-hint)">—</div>'}
        </div>
      </div>
    </div>` : ''}

    ${(d.snapshot || d.pain || d.roi) ? `
    <div class="brief-section">
      <div class="brief-section-title">Company context</div>
      ${d.snapshot ? `<p class="brief-body-text" style="margin-bottom:12px">${d.snapshot}</p>` : ''}
      <div class="brief-two-col">
        ${d.pain ? `<div class="brief-col-card"><div class="brief-col-card-title">Pain points</div><p class="brief-body-text">${d.pain}</p></div>` : ''}
        ${d.roi  ? `<div class="brief-col-card"><div class="brief-col-card-title">ROI / value</div><p class="brief-body-text">${d.roi}</p></div>` : ''}
      </div>
    </div>` : ''}

    ${d.andrew ? `
    <div class="brief-section">
      <div class="brief-section-title green">Andrew's role in this meeting</div>
      <div class="brief-andrew-box"><p>${d.andrew}</p></div>
    </div>` : ''}

    ${(pushLines.length || avoidLines.length) ? `
    <div class="brief-section">
      <div class="brief-section-title">Messaging strategy</div>
      <div class="brief-two-col">
        <div class="brief-col-card">
          <div class="brief-col-card-title push">What to push</div>
          <ul>${bullets(pushLines)}</ul>
        </div>
        <div class="brief-col-card">
          <div class="brief-col-card-title avoid">What to avoid</div>
          <ul>${bullets(avoidLines)}</ul>
        </div>
      </div>
    </div>` : ''}

    ${objLines.length ? `
    <div class="brief-section">
      <div class="brief-section-title">Meeting objectives</div>
      <ol class="brief-objectives">
        ${objLines.map((l, i) => `
          <li>
            <span class="brief-obj-num">${i + 1}</span>
            <span>${l.replace(/^\d+[.)]\s*/, '')}</span>
          </li>`).join('')}
      </ol>
    </div>` : ''}

    ${d.notes ? `
    <div class="brief-section">
      <div class="brief-section-title">Notes</div>
      <p class="brief-body-text">${d.notes}</p>
    </div>` : ''}

    ${d.win ? `
    <div class="brief-section">
      <div class="brief-win-box">
        <div class="brief-win-icon">
          <svg viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div>
          <div class="brief-win-label">Win condition</div>
          <div class="brief-win-text">${d.win}</div>
        </div>
      </div>
    </div>` : ''}

    <div class="brief-footer">Generated by Enable EBD Brief Generator</div>
  `;
}

/* ---- Generate brief ---- */
function generateBrief() {
  const d = getFormData();
  currentBriefData = d;
  saveToHistory(d);

  document.getElementById('brief-content').innerHTML = buildBriefHTML(d);
  document.getElementById('brief-modal').style.display = 'flex';
}

/* ---- Modal controls ---- */
function closeBriefModal(e) {
  if (!e || e.target.id === 'brief-modal') {
    document.getElementById('brief-modal').style.display = 'none';
  }
}

function printBrief() {
  window.print();
}

/* ---- History ---- */
function saveToHistory(d) {
  try {
    let hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    hist.unshift({ id: Date.now(), savedAt: new Date().toISOString(), ...d });
    if (hist.length > 20) hist = hist.slice(0, 20);
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
    updateHistCount(hist.length);
  } catch(e) {}
}

function updateHistCount(n) {
  const el = document.getElementById('hist-count');
  if (el) el.textContent = n ? ` (${n})` : '';
}

function renderHistory() {
  try {
    const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    const el = document.getElementById('hist-list');
    const label = document.getElementById('hist-label');
    updateHistCount(hist.length);

    if (!hist.length) {
      el.innerHTML = `<div class="history-empty">No saved briefs yet.<br>Generate a brief to see it here.</div>`;
      if (label) label.textContent = 'Saved briefs';
      return;
    }

    if (label) label.textContent = `${hist.length} saved brief${hist.length !== 1 ? 's' : ''}`;

    el.innerHTML = hist.map((h, i) => `
      <div class="hist-item" style="margin-bottom:10px">
        <div class="hist-top">
          <span class="hist-badge">${h.meetingType || 'Brief'}</span>
          <span class="hist-company">${h.company || 'Unnamed company'}</span>
        </div>
        <div class="hist-meta">${[h.stage, h.value, fmtDate(h.date)].filter(Boolean).join(' · ')}</div>
        <div class="hist-meta">Saved ${new Date(h.savedAt).toLocaleString()}</div>
        <div class="hist-actions">
          <button class="btn-secondary btn-sm" style="background:#1a2e3d;color:#fff;border-color:#1a2e3d" onclick="loadFromHistory(${i})">Load into form</button>
          <button class="btn-secondary btn-sm" onclick="viewBriefFromHistory(${i})">View brief</button>
          <button class="btn-secondary btn-sm" onclick="deleteFromHistory(${i})">Delete</button>
        </div>
      </div>`).join('');
  } catch(e) {}
}

function loadFromHistory(i) {
  try {
    const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    restoreFormData(hist[i]);
    switchTab('form');
  } catch(e) {}
}

function viewBriefFromHistory(i) {
  try {
    const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    document.getElementById('brief-content').innerHTML = buildBriefHTML(hist[i]);
    document.getElementById('brief-modal').style.display = 'flex';
  } catch(e) {}
}

function deleteFromHistory(i) {
  try {
    let hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    hist.splice(i, 1);
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
    renderHistory();
  } catch(e) {}
}

function clearHistory() {
  if (!confirm('Clear all saved briefs?')) return;
  try { localStorage.removeItem(HIST_KEY); renderHistory(); } catch(e) {}
}

/* ---- LinkedIn lookup ---- */
function initials(name) {
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function lookupLinkedIn() {
  const raw = document.getElementById('li-input').value.trim();
  if (!raw) return;

  const contacts = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const container = document.getElementById('li-results');

  container.innerHTML = contacts.map(c => {
    const name = c.split(',')[0].trim();
    const rest = c.split(',').slice(1).join(',').trim();
    const id   = 'li-' + btoa(encodeURIComponent(c)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    return `
      <div class="li-card" id="${id}">
        <div class="li-card-header">
          <div class="li-avatar">${initials(name)}</div>
          <div>
            <div class="li-name">${name}</div>
            <div class="li-title">${rest}</div>
          </div>
        </div>
        <div class="li-card-body">
          <div class="li-loading">Researching profile...</div>
        </div>
      </div>`;
  }).join('');

  // Fire into Claude chat via the prompt interface
  const prompt = buildLinkedInPrompt(contacts);
  if (typeof sendPrompt === 'function') {
    sendPrompt(prompt);
  } else {
    // Standalone mode — show placeholder
    contacts.forEach(c => {
      const name = c.split(',')[0].trim();
      const rest = c.split(',').slice(1).join(',').trim();
      const id   = 'li-' + btoa(encodeURIComponent(c)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
      const body = document.querySelector(`#${id} .li-card-body`);
      if (body) body.innerHTML = `<p style="font-size:13px;color:var(--text-muted)">In the Claude interface, this will trigger an AI-powered research brief for <strong>${name}</strong>.</p>`;
    });
  }
}

function buildLinkedInPrompt(contacts) {
  return `For each of the following client contacts, provide a concise professional intelligence brief to help a sales rep (Andrew) prepare. For each person include:
- Career background and current role tenure
- What drives someone in their role
- Priorities or concerns about a rebate management software purchase
- Any known public information
- 2–3 personalised talking points for Andrew

Format each person as a clear, distinct card/section.

Contacts:
${contacts.join('\n')}`;
}

/* ---- Init ---- */
(function init() {
  try {
    const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (draft) restoreFormData(draft);
    renderClientLinkedInLinks();
    const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    updateHistCount(hist.length);
  } catch(e) {}
})();
