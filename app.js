/* ============================================================
   EBD Brief Generator — Enable
   app.js
   ============================================================ */

const STORAGE_KEY = 'ebd_draft_v2';
const HIST_KEY    = 'ebd_history_v2';

let saveTimer = null;
let liTimer   = null;
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
function gv(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  if (el.contentEditable === 'true') {
    const h = el.innerHTML;
    return (h === '' || h === '<br>') ? '' : h;
  }
  return el.value || '';
}

function sv(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.contentEditable === 'true') {
    el.innerHTML = val || '';
  } else {
    if (val) el.value = val;
  }
}

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
    meetingType:  activeTag('mt'),
    format:       activeTag('fmt'),
    company:      gv('f-company'),
    date:         gv('f-date'),
    time:         gv('f-time'),
    tz:           gv('f-tz'),
    loc:          gv('f-loc'),
    value:        gv('f-value'),
    close:        gv('f-close'),
    stage:        gv('f-stage'),
    enable:       gv('f-enable'),
    client:       gv('f-client'),
    clientLiUrls: gv('f-client-li-urls'),
    snapshot:     gv('f-snapshot'),
    pain:         gv('f-pain'),
    roi:          gv('f-roi'),
    andrew:       gv('f-andrew'),
    agenda:       gv('f-agenda'),
    push:         gv('f-push'),
    avoid:        gv('f-avoid'),
    obj:          gv('f-obj'),
    win:          gv('f-win'),
    notes:        gv('f-notes'),
  };
}

/* ---- Restore form from saved data ---- */
function restoreFormData(d) {
  if (!d) return;
  sv('f-company', d.company);       sv('f-date', d.date);    sv('f-time', d.time);
  sv('f-tz', d.tz);                 sv('f-loc', d.loc);      sv('f-value', d.value);
  sv('f-close', d.close);           sv('f-stage', d.stage);  sv('f-enable', d.enable);
  sv('f-client', d.client);         sv('f-client-li-urls', d.clientLiUrls);
  sv('f-snapshot', d.snapshot);
  sv('f-pain', d.pain);             sv('f-roi', d.roi);      sv('f-andrew', d.andrew);
  sv('f-agenda', d.agenda);
  sv('f-push', d.push);             sv('f-avoid', d.avoid);  sv('f-obj', d.obj);
  sv('f-win', d.win);               sv('f-notes', d.notes);

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
   'f-enable','f-client','f-client-li-urls','f-roi',
   'f-agenda','f-push','f-avoid','f-obj','f-win'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Clear rich editors
  ['f-snapshot','f-pain','f-andrew','f-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.contentEditable === 'true') el.innerHTML = '';
  });
  document.querySelectorAll('.tag.on').forEach(t => t.classList.remove('on'));
  document.getElementById('client-linkedin-links').innerHTML = '';
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
}

/* ---- Attendee rendering with auto-generated LinkedIn search ---- */
function parseAttendee(line) {
  const parts = line.split(',').map(s => s.trim()).filter(Boolean);
  // Format: Name, Title, Company (company is optional)
  return { name: parts[0] || '', title: parts[1] || '', company: parts[2] || '' };
}

function buildLinkedInSearchURL(name, title, company) {
  const parts = [`site:linkedin.com/in`, `"${name}"`];
  if (company) parts.push(`"${company}"`);
  if (title) parts.push(title);
  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(' '))}`;
}

function renderAttendee(line, opts) {
  const a = parseAttendee(line);
  let linkedinLink = '';
  if (opts && opts.showLinkedIn && a.name) {
    const isDirect = opts.linkedinUrl && opts.linkedinUrl.startsWith('http');
    const url = isDirect ? opts.linkedinUrl : buildLinkedInSearchURL(a.name, a.title, opts.company);
    const title = isDirect ? `Open LinkedIn profile for ${a.name}` : `Search LinkedIn for ${a.name}`;
    linkedinLink = ` <a href="${url}" target="_blank" rel="noopener" class="brief-linkedin-link" title="${title}">in</a>`;
  }
  const titlePart = a.title ? `<span class="brief-attendee-title">, ${a.title}</span>` : '';
  return `<div class="brief-attendee-item">${a.name}${titlePart}${linkedinLink}</div>`;
}

/* ---- Live LinkedIn links under Client contacts textarea ---- */
function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function debounceLinkedIn() {
  clearTimeout(liTimer);
  liTimer = setTimeout(renderClientLinkedInLinks, 400);
}

function renderClientLinkedInLinks() {
  const raw = gv('f-client').trim();
  const container = document.getElementById('client-linkedin-links');
  if (!container) return;
  if (!raw) { container.innerHTML = ''; return; }

  const dealCompany = gv('f-company');
  const contacts = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const rawUrls = (gv('f-client-li-urls') || '').split('\n').map(l => l.trim());

  container.innerHTML = contacts.map((line, i) => {
    const a = parseAttendee(line);
    if (!a.name) return '';
    const directUrl = rawUrls[i] && rawUrls[i].startsWith('http') ? rawUrls[i] : null;
    // Use per-contact company if provided, otherwise fall back to deal company
    const searchCompany = a.company || dealCompany;
    const url = directUrl || buildLinkedInSearchURL(a.name, a.title, searchCompany);
    const titlePart = a.title ? ` \u00B7 ${esc(a.title)}` : '';
    const companyPart = a.company ? ` \u00B7 ${esc(a.company)}` : '';
    const tag = directUrl
      ? `<span class="li-tag li-tag-direct">direct</span>`
      : `<span class="li-tag">search</span>`;
    return `<a href="${esc(url)}" target="_blank" rel="noopener" class="client-li-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      <span>${esc(a.name)}${titlePart}${companyPart}</span>
      ${tag}
    </a>`;
  }).join('');
}

/* ---- Build the brief HTML ---- */
function buildBriefHTML(d) {
  const lines = t => (t || '').split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = (arr) => arr.map(l => `<li>${l}</li>`).join('');
  // Rich text fields already contain HTML; plain text fields need wrapping
  const richHtml = (h) => h || '';

  const enableLines  = lines(d.enable);
  const clientLines  = lines(d.client);
  const clientLiUrls = (d.clientLiUrls || '').split('\n').map(l => l.trim());
  const agendaLines  = lines(d.agenda);
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
          ${clientLines.map((l, i) => renderAttendee(l, { showLinkedIn: true, company: d.company, linkedinUrl: clientLiUrls[i] })).join('') || '<div class="brief-attendee-item" style="color:var(--text-hint)">—</div>'}
        </div>
      </div>
    </div>` : ''}

    ${(d.snapshot || d.pain || d.roi) ? `
    <div class="brief-section">
      <div class="brief-section-title">Company context</div>
      ${d.snapshot ? `<div class="brief-body-text" style="margin-bottom:12px">${richHtml(d.snapshot)}</div>` : ''}
      <div class="brief-two-col">
        ${d.pain ? `<div class="brief-col-card"><div class="brief-col-card-title">Pain points</div><div class="brief-body-text">${richHtml(d.pain)}</div></div>` : ''}
        ${d.roi  ? `<div class="brief-col-card"><div class="brief-col-card-title">ROI / value</div><p class="brief-body-text">${d.roi}</p></div>` : ''}
      </div>
    </div>` : ''}

    ${d.andrew ? `
    <div class="brief-section">
      <div class="brief-section-title green">Andrew's role in this meeting</div>
      <div class="brief-andrew-box"><div class="brief-andrew-content">${richHtml(d.andrew)}</div></div>
    </div>` : ''}

    ${agendaLines.length ? `
    <div class="brief-section">
      <div class="brief-section-title">Meeting agenda</div>
      <ol class="brief-agenda">
        ${agendaLines.map((l, i) => `
          <li>
            <span class="brief-agenda-num">${i + 1}</span>
            <span>${l.replace(/^\d+[.)]\s*/, '')}</span>
          </li>`).join('')}
      </ol>
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
      <div class="brief-body-text">${richHtml(d.notes)}</div>
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
        <div class="hist-meta">${[h.stage, h.value, fmtDate(h.date)].filter(Boolean).join(' \u00B7 ')}</div>
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

/* ---- Word counts (250-word limit) ---- */
const WC_LIMIT = 150;
const WC_WARN  = 120;

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function trimToWordLimit(text, limit) {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ');
}

function updateWordCount(id) {
  const el    = document.getElementById(id);
  const badge = document.getElementById(id + '-wc');
  if (!el || !badge) return;
  const text = el.contentEditable === 'true' ? (el.innerText || '') : (el.value || '');
  const n = countWords(text);
  badge.textContent = '\u00B7 ' + n + ' / ' + WC_LIMIT + ' words';
  badge.classList.toggle('wc-warn', n >= WC_WARN && n < WC_LIMIT);
  badge.classList.toggle('wc-over', n >= WC_LIMIT);
}

function initWordCount(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.contentEditable === 'true') {
    el.addEventListener('input', () => {
      const text = el.innerText || '';
      if (countWords(text) > WC_LIMIT) {
        el.innerText = trimToWordLimit(text, WC_LIMIT);
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      updateWordCount(id);
    });
  } else {
    el.addEventListener('input', () => {
      if (countWords(el.value) > WC_LIMIT) {
        el.value = trimToWordLimit(el.value, WC_LIMIT);
      }
      updateWordCount(id);
    });
  }
  updateWordCount(id);
}

function refreshWordCounts() {
  ['f-andrew', 'f-push', 'f-avoid'].forEach(updateWordCount);
}

/* ---- Rich text editor ---- */
function convertToRichEditor(id) {
  const ta = document.getElementById(id);
  if (!ta) return;

  const isAndrew = id === 'f-andrew';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = isAndrew ? 'rich-toolbar andrew-toolbar' : 'rich-toolbar';
  const extraTools = isAndrew ? '' : `
    <button type="button" class="rich-btn" title="Underline (⌘U)" onmousedown="event.preventDefault();document.execCommand('underline')"><u>U</u></button>
    <span class="rich-sep"></span>
    <button type="button" class="rich-btn" title="Numbered list" onmousedown="event.preventDefault();document.execCommand('insertOrderedList')">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style="display:inline-block;vertical-align:middle"><text x="0" y="4" font-size="4" fill="currentColor" font-family="sans-serif">1.</text><rect x="5" y="2.5" width="8" height="2" rx="1" fill="currentColor"/><text x="0" y="8.5" font-size="4" fill="currentColor" font-family="sans-serif">2.</text><rect x="5" y="6" width="8" height="2" rx="1" fill="currentColor"/><text x="0" y="13" font-size="4" fill="currentColor" font-family="sans-serif">3.</text><rect x="5" y="9.5" width="8" height="2" rx="1" fill="currentColor"/></svg>
      1. List
    </button>
    <button type="button" class="rich-btn" title="Clear formatting" onmousedown="event.preventDefault();document.execCommand('removeFormat')">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style="display:inline-block;vertical-align:middle"><path d="M2 3h10M5 3l1 8M9 3l-1 8M4 11h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="11" y1="10" x2="13" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
    </button>
  `;
  toolbar.innerHTML = `
    <button type="button" class="rich-btn" title="Bold (⌘B)" onmousedown="event.preventDefault();document.execCommand('bold')"><b>B</b></button>
    <button type="button" class="rich-btn" title="Italic (⌘I)" onmousedown="event.preventDefault();document.execCommand('italic')"><i>I</i></button>
    <button type="button" class="rich-btn" title="Bullet list" onmousedown="event.preventDefault();document.execCommand('insertUnorderedList')">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style="display:inline-block;vertical-align:middle"><circle cx="2" cy="3.5" r="1.2" fill="currentColor"/><rect x="5" y="2.5" width="8" height="2" rx="1" fill="currentColor"/><circle cx="2" cy="7" r="1.2" fill="currentColor"/><rect x="5" y="6" width="8" height="2" rx="1" fill="currentColor"/><circle cx="2" cy="10.5" r="1.2" fill="currentColor"/><rect x="5" y="9.5" width="8" height="2" rx="1" fill="currentColor"/></svg>
      List
    </button>
    ${extraTools}
  `;

  // Editor div
  const editor = document.createElement('div');
  editor.id = id;
  editor.contentEditable = 'true';
  editor.className = isAndrew ? 'rich-editor andrew-rich-editor' : 'rich-editor';
  editor.setAttribute('data-placeholder', ta.placeholder || '');
  editor.addEventListener('input', debounceSave);
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
  });

  const parent = ta.parentNode;

  if (isAndrew) {
    // Andrew: toolbar + editor both go inside the existing andrew-box
    parent.insertBefore(toolbar, ta);
    parent.replaceChild(editor, ta);
  } else {
    // Wrap toolbar + editor together so they share a border
    const wrap = document.createElement('div');
    wrap.className = 'rich-editor-wrap';
    wrap.appendChild(toolbar);
    wrap.appendChild(editor);
    parent.replaceChild(wrap, ta);
  }
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
  // Convert textareas to rich editors first (before restoring saved data)
  ['f-snapshot', 'f-pain', 'f-andrew', 'f-notes'].forEach(convertToRichEditor);

  // Wire up word counts
  ['f-andrew', 'f-push', 'f-avoid'].forEach(initWordCount);

  try {
    const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (draft) { restoreFormData(draft); refreshWordCounts(); }
    renderClientLinkedInLinks();
    const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    updateHistCount(hist.length);
  } catch(e) {}
})();
