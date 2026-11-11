/* TechNeeds redesign v4 (v2 core + multi-file/link uploads, time picker, editable mentor profiles): Classroom-style submissions, editable deadlines, per-tab logins.
   Data = shared mock store (localStorage). Session = per tab (sessionStorage), so logins never clash.
   To use the real backend, replace the functions in the DATA LAYER block with fetch calls to API_BASE. */
(() => {
const API_BASE = 'http://localhost:8000';          // swap point for the real backend (see README)
const KEY = 'tn_redesign_v2', SKEY = 'tn_session_v2', DAY = 864e5, NOW = Date.now();
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0'), rnd = n => Math.random().toString(36).slice(2, 2 + n);
const fmt = t => new Date(t).toLocaleDateString(undefined, {day:'numeric', month:'short'});
const fmtT = t => new Date(t).toLocaleString(undefined, {day:'numeric', month:'short', hour:'numeric', minute:'2-digit'});
const dStr = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const tStr = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const TYPES = {video:['V','Video'], quiz:['Q','Quiz'], project:['P','Project']};
const STAT = {todo:['Assigned',''], turned:['Turned in','sun'], graded:['Graded','ok'], missing:['Missing','bad']};
const TIPS = {react:'Rebuild one page of this site as React components.', dsa:'Solve three graph problems this week and explain one aloud.',
  css:'Recreate a favourite app screen using only CSS grid.', python:'Automate one boring task with a 30-line script.', ai:'Train a tiny classifier and write down what surprised you.'};
const isUrl = t => /^https?:\/\//i.test(t);
const ansHtml = a => isUrl(a) ? `<a href="${esc(a)}" target="_blank" rel="noopener">${esc(a)}</a>` : `<p>${esc(a)}</p>`;

/* ---------- uploads: files + links (stored as data URLs in the mock store; swap for real file storage with the backend) ---------- */
const MAXF = 1 << 20, MAXN = 8;   // 1 MB per file, 8 files/links per upload
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const readFile = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok({k:'file', name:f.name, size:f.size, mime:f.type || 'application/octet-stream', data:r.result}); r.onerror = no; r.readAsDataURL(f); });
async function gather(f) {
  const files = [...(f.elements.files ? f.elements.files.files : [])], toks = (f.elements.links ? f.elements.links.value : '').split(/\s+/).filter(Boolean);
  const bad = toks.find(t => !isUrl(t)); if (bad) return {err:`"${bad.slice(0, 30)}" is not a valid link. Links must start with http:// or https://`};
  const big = files.find(x => x.size > MAXF); if (big) return {err:`${big.name} is over 1 MB. Choose a smaller file or share it as a link.`};
  if (files.length + toks.length > MAXN) return {err:`Add at most ${MAXN} files and links at a time.`};
  return {items:(await Promise.all(files.map(readFile))).concat(toks.map(u => ({k:'link', url:u})))};
}
const fits = items => JSON.stringify(S).length + items.reduce((a, i) => a + (i.data ? i.data.length : 90), 0) < 4.5e6;
const itemsHtml = list => list && list.length ? `<ul class="files">${list.map(i => i.k === 'link' ? `<li><span class="fi">Link</span><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.url)}</a></li>`
  : `<li><span class="fi">File</span><a href="${esc(i.data)}" download="${esc(i.name)}">${esc(i.name)}</a> <span class="small muted">${kb(i.size)}</span>${/^image\//.test(i.mime) ? `<img class="thumb" src="${esc(i.data)}" alt="${esc(i.name)}">` : ''}</li>`).join('')}</ul>` : '';
const attachFields = `<label>Files (pick several, up to 1 MB each)<input name="files" type="file" multiple></label><label>Links (one per line)<textarea name="links" rows="2" placeholder="https://"></textarea></label>`;

/* ---------- deadline time picker ---------- */
const readDue = f => { const e = f.elements, m = +e.mm.value; if (!e.date.value || e.mm.value === '' || m < 0 || m > 59) return NaN;
  return new Date(`${e.date.value}T${pad((+e.hh.value % 12) + (e.ap.value === 'PM' ? 12 : 0))}:${pad(m)}`).getTime(); };
const prevDue = f => { const t = readDue(f), p = f.querySelector('[data-prev]'); if (p) p.textContent = isNaN(t) ? 'Pick a date and a time' : 'Deadline: ' + new Date(t).toLocaleString(undefined, {weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit'}); };
const setDue = (f, t) => { const d = new Date(t), e = f.elements; e.date.value = dStr(t); e.hh.value = d.getHours() % 12 || 12; e.mm.value = d.getMinutes(); e.ap.value = d.getHours() >= 12 ? 'PM' : 'AM'; prevDue(f); };

/* ---------- mentor profile ---------- */
const handle = s => (s || '').trim().replace(/^https?:\/\/[^/]+\//i, '').replace(/^@/, '').replace(/\/+$/, '').split('/').pop().replace(/[^\w.-]/g, '');
const photoOf = u => u.photo ? `<img src="${esc(u.photo)}" alt="${esc(u.name)}">` : avatar(u.name + (u.av || 0));
const mlinks = u => [['LinkedIn', u.li && 'https://www.linkedin.com/in/' + u.li], ['GitHub', u.gh && 'https://github.com/' + u.gh], ['Instagram', u.ig && 'https://www.instagram.com/' + u.ig], ['Website', u.web]].filter(l => l[1]);
const linkChips = u => `<div class="chips">${mlinks(u).map(l => `<a class="lnk" href="${esc(l[1])}" target="_blank" rel="noopener">${l[0]}</a>`).join('')}</div>`;
const shrink = f => new Promise((ok, no) => { const url = URL.createObjectURL(f), im = new Image(); im.onload = () => { const c = document.createElement('canvas'), s = Math.min(im.width, im.height);
  c.width = c.height = 256; c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 256, 256); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .85)); }; im.onerror = no; im.src = url; });
const mentorCard = m => !m ? '' : `<div class="card mc"><span class="av">${photoOf(m)}</span><div><h3>Your mentor: ${esc(m.name)}</h3>${m.headline ? `<div class="muted small">${esc(m.headline)}</div>` : ''}${m.bio ? `<p class="small">${esc(m.bio)}</p>` : ''}
  ${m.skills && m.skills.length ? `<div class="chips">${m.skills.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}${m.avail ? `<p class="small muted">Availability: ${esc(m.avail)}</p>` : ''}${linkChips(m)}</div></div>`;
const mprofile = u => { const ms = S.mentees.filter(m => m.program === u.program), rs = S.res.filter(r => r.program === u.program), kinds = new Set(rs.map(r => r.type)).size, pend = S.subs.filter(s => s.status !== 'graded' && rs.some(r => r.id === s.r)).length, v = x => esc(x || '');
  return `<div class="pro"><div class="av">${photoOf(u)}</div><div><h1>${esc(u.name)}</h1><p>${esc(u.headline || 'Mentor')} · ${esc(prog(u.program))}</p>${linkChips(u)}</div></div>
  <div class="sec two"><div class="card"><h2>Edit your profile</h2><p class="small muted">Change anything, any time. Mentees see this on their dashboard.</p><form class="f" data-act="mprofile">
  <label>Display name<input name="name" required maxlength="60" value="${v(u.name)}"></label><label>Headline<input name="headline" maxlength="80" placeholder="e.g. 3rd year CSE, SDE intern" value="${v(u.headline)}"></label>
  <label>About you<textarea name="bio" rows="4" maxlength="500">${v(u.bio)}</textarea></label><label>Skills (comma separated)<input name="skills" placeholder="react, dsa, git" value="${v((u.skills || []).join(', '))}"></label>
  <label>Availability or office hours<input name="avail" maxlength="100" placeholder="e.g. Sat 5 to 6 pm on WhatsApp" value="${v(u.avail)}"></label>
  <div class="row2"><label>LinkedIn (username or URL)<input name="li" value="${v(u.li)}"></label><label>GitHub<input name="gh" value="${v(u.gh)}"></label></div>
  <div class="row2"><label>Instagram<input name="ig" value="${v(u.ig)}"></label><label>Website<input name="web" type="url" placeholder="https://" value="${v(u.web)}"></label></div>
  <label>Profile photo (optional image)<input name="photo" type="file" accept="image/*"></label>${u.photo ? '<label class="chk"><input type="checkbox" name="rmphoto"> Remove my photo and use the generated avatar</label>' : ''}
  <label>New password (leave empty to keep the current one)<input name="npw" type="password" minlength="6" autocomplete="new-password"></label>
  <div><button class="btn">Save profile</button> <button type="button" class="btn alt" data-act="avatar">New avatar</button></div></form></div>
  <div class="card"><h2>Summary</h2><p>${esc(u.name.split(' ')[0])} mentors ${ms.length} people and has published ${rs.length} resources across ${kinds} of 3 formats. The cohort has earned ${ms.reduce((a, m) => a + total(m.id), 0)} graded points, and ${pend} submission${pend === 1 ? ' is' : 's are'} waiting for review.</p>
  <div class="badges">${[['Cohort builder', ms.length >= 5], ['Full-format curator', kinds === 3], ['Active publisher', rs.length >= 5], ['Inbox zero', pend === 0]].map(b => `<div class="badge ${b[1] ? 'on' : 'off'}"><b>${b[0]}</b></div>`).join('')}</div></div></div>`; };

/* ---------- DATA LAYER (mock) ---------- */
function seed() {
  const names = [['Aanya Rao','react,css'],['Ishita Verma','dsa,python'],['Meera Nair','ai,python'],['Riya Sethi','css,react'],['Tanvi Bose','dsa']];
  const s = {programs:[{id:'p1',name:'Web Development'},{id:'p2',name:'DSA in C/C++'}],
    mentors:[{id:'m1',name:'Vidusi Agarwal',user:'vidusi',pass:'mentor123',program:'p1'},{id:'m2',name:'Shefali Kaushal',user:'shefali',pass:'mentor123',program:'p2'}],
    mentees:names.map((n, i) => ({id:'e' + i, name:n[0], enroll:'TN25' + pad(i + 1).padStart(3, '0'), pass:'learn123', program:'p1', tags:n[1].split(','), av:0})),
    res:[['video','HTML and CSS foundations',10,-12,'Watch the video, then write what you learned in 2 or 3 sentences.'],['quiz','JavaScript basics',20,-8,'Take the quiz and paste the link to your result page.'],
      ['project','Personal portfolio',50,6,'Build a one-page portfolio. Submit your GitHub repo or live site link.'],['quiz','React hooks',20,3,'Finish the quiz and share your result link.'],['video','How REST APIs work',10,9,'Watch and write your key takeaway.']]
      .map((r, i) => ({id:'r' + i, program:'p1', type:r[0], title:r[1], link:'https://example.com', max:r[2], due:NOW + r[3] * DAY, desc:r[4]})), subs:[]};
  s.mentees.forEach((m, i) => [0, 1, 3].forEach((ri, j) => { const r = s.res[ri];
    if (ri === 1 && i > 3 || ri === 3 && i > 1) return;
    const done = r.due < NOW;
    s.subs.push({id:`s${i}${ri}`, r:r.id, m:m.id, answer:r.type === 'video' ? 'Learned how HTML structure and CSS layout fit together.' : 'https://github.com/example/work',
      note:'', at:Math.min(NOW - DAY, r.due - (i + 1) * DAY), status:done ? 'graded' : 'turned_in', score:done ? Math.round(r.max * (0.55 + ((i * 7 + j * 3) % 5) / 11)) : null,
      feedback:done ? 'Good work. Keep it up.' : '', gradedAt:done ? r.due : 0}); }));
  return s;
}
let mem = null;
const load = () => { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {} return mem || (mem = seed()); };
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
/* Every change reloads the latest shared data first, so two people working at once do not overwrite each other. */
function mutate(fn) { S = load(); const out = fn(); save(); return out; }
/* Session lives in this tab only: logging in elsewhere never logs you out. */
let session = (() => { try { return JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) { return null; } })();
const setSession = v => { session = v; try { v ? sessionStorage.setItem(SKEY, JSON.stringify(v)) : sessionStorage.removeItem(SKEY); } catch (e) {} };
window.addEventListener('storage', e => { if (e.key !== KEY) return; S = load(); const a = document.activeElement;
  if (a && a.closest && a.closest('#app') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; render(); });
const toast = m => { const t = $('#toast'); t.textContent = m; t.className = 'on'; setTimeout(() => t.className = '', 2600); };

/* ---------- helpers ---------- */
const prog = id => (S.programs.find(p => p.id === id) || {}).name || '';
const me = () => !session ? null : session.role === 'admin' ? {name:'Admin', role:'admin'} : (session.role === 'mentor' ? S.mentors : S.mentees).find(x => x.id === session.id);
const sub = (r, m) => S.subs.find(s => s.r === r && s.m === m);
const total = id => S.subs.filter(s => s.m === id && s.status === 'graded').reduce((a, s) => a + s.score, 0);
const lastAt = id => Math.max(0, ...S.subs.filter(s => s.m === id && s.status === 'graded').map(s => s.gradedAt));
const board = () => S.mentees.map(m => ({m, pts:total(m.id)})).sort((a, b) => b.pts - a.pts || lastAt(a.m.id) - lastAt(b.m.id));
const rank = id => board().findIndex(r => r.m.id === id) + 1;
const rel = t => { const d = t - Date.now(); if (d < 0) return 'closed'; const h = Math.floor(d / 36e5); return h < 48 ? `in ${h}h` : `in ${Math.floor(h / 24)} days`; };
const slug = n => n.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
const opts = list => list.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
const stOf = (r, mid) => { const s = sub(r.id, mid); return s ? (s.status === 'graded' ? 'graded' : 'turned') : (r.due > Date.now() ? 'todo' : 'missing'); };
const cred = (label, id, pw) => `<div class="cred"><div class="small muted">${esc(label)} created. Share these once:</div>Login: <code>${esc(id)}</code> &nbsp; Password: <code>${esc(pw)}</code></div>`;
let lastCred = '', role = 'mentee', filt = 'all', openRes = null, editing = null, reviewing = null, netStop = null;

/* ---------- AI profile engine ---------- */
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function avatar(seed) {
  const h = hash(seed), a = h % 360, b = (a + 50 + h % 80) % 360, sk = ['#f1c9a5','#d9a273','#a8744f','#7a4e32'][h >> 7 & 3], hc = `hsl(${(h >> 9) % 360} 45% 28%)`;
  const hair = ['<path d="M32 58a28 28 0 0 1 56 0c-10-14-46-14-56 0z"/>','<path d="M32 58a28 28 0 0 1 56 0c-4-6-14-14-28-14s-24 8-28 14z"/><circle cx="60" cy="26" r="11"/>',
    '<path d="M31 70V56a29 29 0 0 1 58 0v14c-4-8-4-20-12-24-10 4-28 2-34 0-8 4-8 16-12 24z"/>','<path d="M32 56a28 28 0 0 1 56 0c-14-6-42-6-56 0z"/>'][h >> 5 & 3];
  const mouth = ['<path d="M50 70q10 9 20 0" stroke="#3a1d1d" stroke-width="3" fill="none" stroke-linecap="round"/>','<path d="M52 71h16" stroke="#3a1d1d" stroke-width="3" stroke-linecap="round"/>',
    '<ellipse cx="60" cy="71" rx="6" ry="4" fill="#3a1d1d"/>','<path d="M50 71q8 4 20-3" stroke="#3a1d1d" stroke-width="3" fill="none" stroke-linecap="round"/>'][h >> 3 & 3], e = 2.5 + (h & 1);
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Generated avatar"><defs><linearGradient id="g${h}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a} 75% 65%)"/><stop offset="1" stop-color="hsl(${b} 70% 42%)"/></linearGradient></defs><rect width="120" height="120" rx="30" fill="url(#g${h})"/><path d="M28 120c2-22 16-30 32-30s30 8 32 30z" fill="#fff" opacity=".85"/><circle cx="60" cy="58" r="26" fill="${sk}"/><g fill="${hc}">${hair}</g><circle cx="50" cy="57" r="${e}" fill="#222"/><circle cx="70" cy="57" r="${e}" fill="#222"/>${mouth}</svg>`;
}
const BADGES = [['First steps','Turned in your first work',s => s.done >= 1],['Video voyager','Turned in 2 or more videos',s => s.by.video >= 2],
  ['Quiz ace','Graded quiz average of 80% or more',s => s.quizAvg >= 80],['Project builder','Delivered a hands-on project',s => s.by.project >= 1],
  ['On-time streak','3 or more on-time turn-ins',s => s.onTime >= 3],['Podium','Top 3 on the leaderboard',s => s.rank > 0 && s.rank <= 3]];
function stats(m) {
  const rs = S.res.filter(r => r.program === m.program), subs = S.subs.filter(s => s.m === m.id && rs.some(r => r.id === s.r)), by = {video:0, quiz:0, project:0}, pts = {video:0, quiz:0, project:0};
  let qs = 0, qm = 0, onTime = 0;
  subs.forEach(s => { const r = S.res.find(x => x.id === s.r); by[r.type]++; if (s.at <= r.due) onTime++;
    if (s.status === 'graded') { pts[r.type] += s.score; if (r.type === 'quiz') { qs += s.score; qm += r.max; } } });
  return {rs, subs, by, pts, done:subs.length, waiting:subs.filter(s => s.status !== 'graded').length, total:rs.length, pct:rs.length ? Math.round(subs.length / rs.length * 100) : 0, onTime,
    quizAvg:qm ? Math.round(qs / qm * 100) : 0, pending:rs.filter(r => !sub(r.id, m.id) && r.due > Date.now()).sort((a, b) => a.due - b.due), rank:rank(m.id), score:total(m.id)};
}
/* Swap point: send `st` to an LLM endpoint instead of building the text here. */
function generateInsights(m) {
  const st = stats(m), first = m.name.split(' ')[0], top = Object.keys(st.pts).sort((a, b) => st.pts[b] - st.pts[a])[0], nx = st.pending[0];
  const summary = `${first} has turned in ${st.done} of ${st.total} assigned resources (${st.pct}%) and holds #${st.rank} on the leaderboard with ${st.score} graded points. ` +
    (st.score ? `${TYPES[top][1]}s are the strongest area${st.quizAvg ? `, with a ${st.quizAvg}% quiz average` : ''}. ` : 'No graded work yet, so the first grade will set the pace. ') +
    (st.waiting ? `${st.waiting} turned-in item${st.waiting > 1 ? 's are' : ' is'} waiting for the mentor's review. ` : '') +
    (nx ? `Next up: "${nx.title}", due ${rel(nx.due)}.` : 'Everything open is turned in, so this is a good moment to stretch into something new.');
  const recs = st.pending.slice(0, 2).map(r => `Turn in "${r.title}" (${TYPES[r.type][1].toLowerCase()}, due ${fmt(r.due)}).`)
    .concat((m.tags || []).slice(0, 2).map(t => TIPS[t.toLowerCase()] || `Build a small project that uses ${t} and show your mentor.`));
  return {st, summary, recs, badges:BADGES.map(b => ({name:b[0], desc:b[1], on:b[2](st)}))};
}

/* ---------- animated home background: a map of what the cohorts cover ---------- */
function startNet(cv) {
  const ctx = cv.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, raf = {id:0};
  const words = ['HTML','CSS','JavaScript','React','DSA','C++','Python','AI','Git','APIs','Mentors','Hackathons','Projects','Quizzes'];
  let W, H, nodes = [], col;
  function size() { const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const cs = getComputedStyle(document.body); col = {a:cs.getPropertyValue('--pri').trim(), b:cs.getPropertyValue('--sun').trim(), t:cs.getPropertyValue('--mut').trim()};
    const n = Math.max(words.length, Math.min(34, Math.round(W * H / 24000)));
    nodes = Array.from({length:n}, (_, i) => ({x:Math.random() * W, y:Math.random() * H, vx:(Math.random() - .5) * .28, vy:(Math.random() - .5) * .28, w:words[i] || null}));
    if (reduce) frame(); }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    if (!reduce) nodes.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
    ctx.lineWidth = 1; ctx.strokeStyle = col.a;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d < 150) { ctx.globalAlpha = (1 - d / 150) * .35; ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke(); } }
    nodes.forEach(p => { ctx.globalAlpha = .9; ctx.fillStyle = p.w ? col.b : col.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.w ? 4 : 2.2, 0, 7); ctx.fill();
      if (p.w) { ctx.globalAlpha = .8; ctx.fillStyle = col.t; ctx.font = '600 12px system-ui, sans-serif'; ctx.fillText(p.w, p.x + 8, p.y + 4); } });
    ctx.globalAlpha = 1; if (!reduce) raf.id = requestAnimationFrame(frame);
  }
  size(); if (!reduce) frame(); window.addEventListener('resize', size);
  return () => { cancelAnimationFrame(raf.id); window.removeEventListener('resize', size); };
}

/* ---------- team + help desk (content carried over from the original TechNeeds site) ---------- */
const MAIL = 'techneedsigdtuw@gmail.com', WA = '918958898580';
/* [name, role, photo path, LinkedIn id, Instagram handle, X handle] */
const TEAM = [
 ['Founders', [
  ['Vidushi Agarwal','Founder','dcec61lxq/v1724959866/WhatsApp_Image_2024-08-30_at_12.49.51_AM_cg7gmn.jpg','vidushi-agarwal-a95885256','agarwal.vidu','Vidushit143'],
  ['Sonam','Founder','dcec61lxq/v1724958308/IMG_20240430_003529_hk6mf6.jpg','sonam-yadav-a647ab258','sonam_ydv0303','137_sonam3429'],
  ['Sripriya Agarwal','Founder','dcec61lxq/v1724992510/b4eacac2-e23f-41b1-8ce1-69334b7dd27f_gztkzv.jpg','sripriya-agarwal-483475261','sripriyaagarwal16','Agarwa1Sripriya'],
  ['Saie Prakhar Pawar','Founder','dcec61lxq/v1724958407/SaiePic_SquareFit_wh1gyn.jpg','saie-pawar-96b27a262','_.saiee','Saie__Pawar'],
  ['Avni Singh','Founder','dzwfmydmx/v1724998586/photo_6235583440917479616_x_vnz0tk.jpg'],
  ['Chanda Jha','Founder','dcec61lxq/v1724992377/58cc173a-2806-4dd4-9426-f37bafd91105_lekkdl.jpg']]],
 ['Leads', [
  ['Joysa Jain','President','dcec61lxq/v1724959131/IMG_7050_duy2oc.png','joysa-jain-86b589283','joysajain.21'],
  ['Kashish Rastogi','Vice President','dcec61lxq/v1724959804/ef0car_tumptt.jpg','kashish-rastogi-7a189b27a','brighttt4','KashishRastog19'],
  ['Anushka Shanker','Vice President','dcec61lxq/v1724958476/Myphoto_hiq3gg.jpg','anushka-shanker-061b6a218','shankeranushka','ShankerAnu23798'],
  ['Pari Gupta','Treasurer','dcec61lxq/v1724959125/Pari_wiuvo0.jpg','pari-gupta-168564289','parigupta9667'],
  ['Nandini Jain','Mentorship Moderator','dcec61lxq/v1724959748/me_oqxnuy.jpg','nandini-jain-00967028b','nandinijain004','Nandini8409'],
  ['Srishti Sudhakar','Mentorship Moderator','dzwfmydmx/v1756640728/Srishti_Sudhakar_Mentorhsip_Moderator_kcgfry.jpg','srishti-sudhakar-828250276','srishtisudhakar','SrishtiSud41882'],
  ['Areeba Khanam','Team Manager','dzwfmydmx/v1756640873/Areeba_Khanam_-_Team_manager_khs2hq.jpg','areeba-khan-70013128a','al_.hayy'],
  ['Shreya','Outreach Secretary','dzwfmydmx/v1756640977/Shreya_nt0i1v.jpg','shreya-kumari-2ba266269']]],
 ['Event Management', [
  ['Preeti','Head','dcec61lxq/v1724958832/IMG_20240823_183007_yl75hp.jpg','preeti-127953294','p_r_e_e_t_i_5555'],
  ['Sonali Yadav','Head','dzwfmydmx/v1756650791/sonaliyadav_y80vsn.jpg','sonali-yadav17','','Sonali_yadav17']]],
 ['Media', [
  ['Vidhi Arora','Head','dzwfmydmx/v1756651106/Vidhi_mediateam_nu7tcf.jpg'],
  ['Riya','Head','dzwfmydmx/v1756651106/Riya_Media_Team_xyhytg.jpg','riya-yadav-b64a45289','rao_._riya','RiyaYadav199924_']]],
 ['Content', [
  ['Ekamjot Kaur','Head','dzwfmydmx/v1756653221/Ekamjot_Kaur_-_Content_Team_grk2sw.jpg','ekamjot-kaur-oberoi','_kaur.ek_'],
  ['Suparna Lahiri','Head','dzwfmydmx/v1756653221/Suparna_Lahiri_aefh5a.jpg','suparna-l-904636244','itsokay_suparna','itsokay_Suparna']]],
 ['PR', [
  ['Niyati Mishra','Head Coordinator','dcec61lxq/v1724959554/niyatiTechneeds_q6xnde.jpg'],
  ['Istuti Jain','Head','dzwfmydmx/v1756664257/Istuti_PR_Team_g64mfr.jpg','istuti-jain-744b18298','stuti_jn24','stutijn24']]],
 ['Sponsorship', [
  ['Shilpi Kumari','Head','dcec61lxq/v1724959317/DSC_0302_ozn1xo.jpg','shilpi-kumari-45696128a'],
  ['Prakshi','Head','dcec61lxq/v1724959316/1000046863_vhojlw.jpg','prakshisagar']]],
 ['Social Media', [
  ['Sakshi Sharma','Head','dzwfmydmx/v1756664258/Sakshi_sharma_media_team_xmltat.jpg','sakshi-sharma-188125277','sakshi.shhh','SakshiS57199303']]],
 ['Tech Team', [
  ['Anjali','Head','dzwfmydmx/v1756664636/Anjali_Dass_tech_team_mczybb.jpg','anjali-dass-002b5a31a','__anj__09']]]];
const photo = p => { const i = p.indexOf('/'); return `https://res.cloudinary.com/${p.slice(0, i)}/image/upload/w_300,c_fill,ar_1:1,g_auto/${p.slice(i + 1)}`; };
const person = p => { const [n, r, ph, li, ig, x] = p, links = [li && ['LinkedIn', 'https://www.linkedin.com/in/' + li], ig && ['Instagram', 'https://www.instagram.com/' + ig], x && ['X', 'https://x.com/' + x]].filter(Boolean);
  return `<article class="tm"><div class="tm-av">${ph ? `<img src="${photo(ph)}" data-n="${esc(n)}" alt="${esc(n)}" width="120" height="120" loading="lazy">` : avatar(n)}</div><h3>${esc(n)}</h3><p class="muted small">${esc(r)}</p>
  <div class="chips">${links.map(l => `<a class="lnk" href="${esc(l[1])}" target="_blank" rel="noopener" aria-label="${esc(n)} on ${l[0]}">${l[0]}</a>`).join('')}</div></article>`; };
const teamPage = () => `<div class="page-h"><div><h1>Meet our team</h1><span class="muted">The students behind TechNeeds IGDTUW.</span></div></div>` +
  TEAM.map(g => `<section class="sec" style="margin:2rem 0"><h2>${esc(g[0])}</h2><div class="tgrid">${g[1].map(person).join('')}</div></section>`).join('');
const FAQ = [['What is TechNeeds?', 'TechNeeds IGDTUW is a student community built around the idea "all_you_need_to_know_about_tech". It runs tech introductory sessions, mentorship programs and hackathons, and offers a competitive environment to learn and grow together.'],
  ['How can I contact support?', `Message us on WhatsApp at +91 8958898580 or email ${MAIL}. You can also use the message form on this page, which opens an email to us.`],
  ['What services do you offer?', 'Tech introductory sessions, cohort-based mentorship programs, hackathons, speaker sessions, educational content and community engagement.'],
  ['Where is TechNeeds located?', 'TechNeeds is a student community at Indira Gandhi Delhi Technical University for Women (IGDTUW), Delhi.'],
  ['Can I track my mentorship journey?', 'Yes. Your dashboard shows each assignment with its status and grade, the leaderboard shows your rank, and your profile summarises your progress with badges and recommendations.']];
const help = () => { const u = me() || {}; return `<div class="page-h"><div><h1>Help desk</h1><span class="muted">Questions about logins, assignments or cohorts? Start here.</span></div></div>
  <div class="cols"><a class="card contact" href="mailto:${MAIL}"><h3>Email</h3><p>${MAIL}</p><span class="small muted">We reply by email</span></a>
  <a class="card contact" href="https://wa.me/${WA}" target="_blank" rel="noopener"><h3>WhatsApp</h3><p>+91 8958898580</p><span class="small muted">DM your query</span></a>
  <div class="card"><h3>Location</h3><p>IGDTUW, Delhi</p><span class="small muted">Indira Gandhi Delhi Technical University for Women</span></div></div>
  <div class="sec two"><div class="card"><h2>Frequently asked questions</h2>${FAQ.map(q => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join('')}</div>
  <div class="card"><h2>Send us a message</h2><form class="f" data-act="ticket"><label>Your name<input name="name" required value="${esc(u.name || '')}"></label>
  <label>Enrollment number (if you have one)<input name="enroll" value="${esc(u.enroll || '')}"></label>
  <label>Topic<select name="topic"><option>Login problem</option><option>Assignment or deadline</option><option>Mentor or cohort</option><option>Joining TechNeeds</option><option>Something else</option></select></label>
  <label>Message<textarea name="msg" rows="5" required></textarea></label><button class="btn">Open email to send</button></form>
  <p class="small muted">This opens your email app with the message filled in, addressed to ${MAIL}.</p></div></div>`; };

/* ---------- views ---------- */
const nav = () => { const r = session && session.role, a = location.hash || '#/', l = (h, t) => `<a href="${h}" ${a === h ? 'aria-current="page"' : ''}>${t}</a>`;
  return l('#/', 'Home') + l('#/team', 'Team') + l('#/help', 'Help') + (r ? l({admin:'#/admin', mentor:'#/mentor', mentee:'#/learn'}[r], 'Dashboard') + (r !== 'admin' ? l('#/leaderboard', 'Leaderboard') + l('#/profile', 'Profile') : '') + '<button data-act="logout">Log out</button>' : l('#/login', 'Log in')); };

const home = () => `<div class="hero-wrap"><canvas id="net" aria-hidden="true"></canvas><section class="hero"><div><h1>Learn tech with seniors who were just where you are.</h1>
  <p class="lead">TechNeeds IGDTUW runs cohort-based mentorship: assignments with real deadlines, feedback from your mentor, and a leaderboard to keep it fun.</p>
  <p><a class="btn" href="#/login">Log in to your cohort</a> <a class="btn alt" href="#/login">See how it works</a></p>
  <p class="small muted">The moving map behind this page shows what our cohorts cover. Each labelled dot is a topic, and the lines are the mentor and mentee connections.</p></div>
  <div class="stats"><div class="stat"><b>1200+</b><span>Trained mentees</span></div><div class="stat"><b>50+</b><span>Professional mentors</span></div>
  <div class="stat"><b>10+</b><span>Mentorship cohorts</span></div><div class="stat"><b>100+</b><span>Events</span></div></div></section></div>
  <section class="sec"><h2>Current cohorts</h2><div class="cols">${S.programs.map(p => { const m = S.mentors.find(x => x.program === p.id);
    return `<div class="card"><h3>${esc(p.name)}</h3><p class="muted">${m ? `<span class="av s">${photoOf(m)}</span>Mentor: ${esc(m.name)}${m.headline ? `<br><span class="small">${esc(m.headline)}</span>` : ''}` : 'Mentor to be announced'}</p><span class="tag">${S.mentees.filter(x => x.program === p.id).length} mentees</span></div>`; }).join('')}</div></section>
  <section class="sec"><h2>Meet the founders</h2><div class="tgrid">${TEAM[0][1].map(person).join('')}</div><p><a href="#/team">See the full team</a></p></section>
  <section class="sec"><h2>One platform, three roles</h2><div class="cols">
  <div class="card"><h3>Admin</h3><p class="muted">Creates programs and onboards mentors with secure logins.</p></div>
  <div class="card"><h3>Mentor</h3><p class="muted">Posts assignments, edits deadlines, reviews turned-in work and returns grades with feedback.</p></div>
  <div class="card"><h3>Mentee</h3><p class="muted">Turns in work before the deadline, reads feedback and climbs the leaderboard.</p></div></div></section>`;

const DEMO = {mentee:['TN25001','learn123'], mentor:['vidusi','mentor123'], admin:['admin','admin123']};
const login = () => `<div style="max-width:440px;margin:3rem auto"><div class="card"><h1 style="font-size:1.8rem">Log in</h1>
  <div class="tabs" role="group" aria-label="Role">${['mentee','mentor','admin'].map(r => `<button type="button" data-act="role" data-v="${r}" aria-pressed="${r === role}">${r[0].toUpperCase() + r.slice(1)}</button>`).join('')}</div>
  <form class="f" data-act="login"><label>${role === 'mentee' ? 'Enrollment number' : 'Username'}<input name="id" required autocomplete="username"></label>
  <label>Password<input name="pw" type="password" required autocomplete="current-password"></label><button class="btn">Log in</button></form>
  <p class="small muted">Demo login for ${role}: <code>${DEMO[role][0]}</code> / <code>${DEMO[role][1]}</code></p>
  <p class="small muted">Each browser tab keeps its own login, so several people can work at the same time.</p></div></div>`;

const admin = () => `<div class="page-h"><h1>Admin panel</h1><span class="tag sun">${S.programs.length} programs · ${S.mentors.length} mentors</span></div><div class="two"><div>
  <div class="card"><h2>Create program</h2><form class="f" data-act="program"><label>Program name<input name="name" required placeholder="e.g. Machine Learning"></label><button class="btn">Create program</button></form></div>
  <div class="card" style="margin-top:1rem"><h2>Onboard mentor</h2><form class="f" data-act="mentor"><label>Mentor name<input name="name" required></label>
  <label>Program<select name="program">${opts(S.programs)}</select></label><button class="btn">Add mentor and generate login</button></form>${lastCred}</div></div>
  <div class="card pad0 scroll"><table class="tbl"><tr><th>Program</th><th>Mentor</th><th>Mentees</th></tr>${S.programs.map(p => `<tr><td>${esc(p.name)}</td><td>${S.mentors.filter(m => m.program === p.id).map(m => esc(m.name)).join(', ') || '<span class="muted">none yet</span>'}</td><td>${S.mentees.filter(m => m.program === p.id).length}</td></tr>`).join('')}</table></div></div>`;

const resForm = r => { const dt = new Date(r ? r.due : new Date(Date.now() + 7 * DAY).setHours(23, 59, 0, 0)), hh = dt.getHours() % 12 || 12, ap = dt.getHours() >= 12 ? 'PM' : 'AM', its = r && r.items || [];
  return `<div class="card"><h2>${r ? 'Edit resource' : 'Post a resource'}</h2><form class="f" data-act="resource" ${r ? `data-id="${r.id}"` : ''}>
  <label>Type<select name="type">${Object.keys(TYPES).map(k => `<option value="${k}" ${r && r.type === k ? 'selected' : ''}>${TYPES[k][1]}</option>`).join('')}</select></label>
  <label>Title<input name="title" required value="${r ? esc(r.title) : ''}"></label>
  <label>Instructions<textarea name="desc" rows="3">${r ? esc(r.desc) : ''}</textarea></label>
  <label>Resource link (optional)<input name="link" type="url" placeholder="https://" value="${r ? esc(r.link) : ''}"></label>
  ${its.length ? `<div class="stack"><b class="small">Current attachments (untick to remove)</b>${its.map((i, n) => `<label class="chk"><input type="checkbox" name="keep" value="${n}" checked> ${esc(i.k === 'link' ? i.url : i.name)}</label>`).join('')}</div>` : ''}
  ${attachFields}
  <label>Due date<input name="date" type="date" required value="${dStr(dt.getTime())}"></label>
  <div class="chips"><button type="button" class="btn alt sm" data-act="shift" data-d="0">Today</button><button type="button" class="btn alt sm" data-act="shift" data-d="1">+1 day</button><button type="button" class="btn alt sm" data-act="shift" data-d="3">+3 days</button><button type="button" class="btn alt sm" data-act="shift" data-d="7">+1 week</button></div>
  <div class="row3"><label>Hour<select name="hh">${Array.from({length:12}, (_, i) => `<option ${i + 1 === hh ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
  <label>Minute<input name="mm" type="number" min="0" max="59" required value="${dt.getMinutes()}"></label><label>AM or PM<select name="ap"><option ${ap === 'AM' ? 'selected' : ''}>AM</option><option ${ap === 'PM' ? 'selected' : ''}>PM</option></select></label></div>
  <div class="chips"><button type="button" class="btn alt sm" data-act="settime" data-t="9:00">9:00 AM</button><button type="button" class="btn alt sm" data-act="settime" data-t="12:00">12:00 PM</button><button type="button" class="btn alt sm" data-act="settime" data-t="18:00">6:00 PM</button><button type="button" class="btn alt sm" data-act="settime" data-t="23:59">11:59 PM</button><button type="button" class="btn alt sm" data-act="addh" data-h="1">+1 hour</button><button type="button" class="btn alt sm" data-act="addh" data-h="6">+6 hours</button></div>
  <div class="small prev" data-prev aria-live="polite"></div>
  <label>Max score<input name="max" type="number" min="1" value="${r ? r.max : 10}" required></label>
  <div><button class="btn">${r ? 'Save changes' : 'Publish'}</button> ${r ? '<button type="button" class="btn alt" data-act="cancel">Cancel</button>' : ''}</div></form></div>`; };

const review = (r, ms) => !r ? '' : `<div class="card pad0" style="margin-bottom:1rem"><div class="res" style="justify-content:space-between"><div><h2 style="margin:0">Student work: ${esc(r.title)}</h2><div class="small muted">Due ${fmtT(r.due)} · max ${r.max}</div></div><button class="btn alt sm" data-act="closerev">Close</button></div>
  ${ms.map(m => { const s = sub(r.id, m.id), k = stOf(r, m.id);
    return `<div class="rev"><div><b>${esc(m.name)}</b> <span class="tag ${STAT[k][1]}">${STAT[k][0]}</span></div>${s ? `<div class="ans">${s.answer ? ansHtml(s.answer) : ''}${itemsHtml(s.items)}${s.note ? `<div class="small muted">Private comment: ${esc(s.note)}</div>` : ''}<div class="small muted">Turned in ${fmtT(s.at)}</div></div>
    <form class="f" data-act="grade" data-sid="${s.id}"><div class="row2"><label>Score / ${r.max}<input name="score" type="number" min="0" max="${r.max}" required value="${s.score == null ? '' : s.score}"></label><label>Feedback<input name="feedback" value="${esc(s.feedback)}"></label></div>
    <div><button class="btn sm">${s.status === 'graded' ? 'Update grade' : 'Return grade'}</button></div></form>` : '<div class="small muted">Nothing turned in yet.</div>'}</div>`; }).join('')}</div>`;

const mentor = () => { const u = me(), rs = S.res.filter(r => r.program === u.program).sort((a, b) => a.due - b.due), ms = S.mentees.filter(m => m.program === u.program), ed = editing && rs.find(r => r.id === editing);
  return `<div class="page-h"><h1>${esc(prog(u.program))}</h1><span><a class="btn alt sm" href="#/profile">Edit my profile</a> <span class="tag sun">${ms.length} mentees · ${rs.length} resources</span></span></div><div class="two"><div>${resForm(ed)}
  <div class="card" style="margin-top:1rem"><h2>Add mentee</h2><form class="f" data-act="mentee"><label>Name<input name="name" required></label><label>Interests (comma separated)<input name="tags" placeholder="react, dsa"></label>
  <button class="btn">Add and generate enrollment number</button></form>${lastCred}</div></div>
  <div>${review(rs.find(r => r.id === reviewing), ms)}<div class="card pad0" style="margin-bottom:1rem">${rs.map(r => { const ss = S.subs.filter(s => s.r === r.id);
    return `<div class="res"><span class="type ${r.type}">${TYPES[r.type][0]}</span><div><b>${esc(r.title)}</b><div class="small muted">${TYPES[r.type][1]} · due ${fmtT(r.due)} · max ${r.max}</div>
    <div class="small">${ss.length}/${ms.length} turned in · ${ss.filter(s => s.status === 'graded').length} graded</div></div><div class="stack"><button class="btn sm" data-act="review" data-id="${r.id}">Review</button><button class="btn alt sm" data-act="edit" data-id="${r.id}">Edit</button></div></div>`; }).join('') || '<p class="muted" style="padding:1rem">No resources yet.</p>'}</div>
  <div class="card pad0 scroll"><table class="tbl"><tr><th>Mentee</th><th>Enrollment</th><th>Points</th></tr>${ms.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.enroll)}</td><td>${total(m.id)}</td></tr>`).join('')}</table></div></div></div>`; };

const detail = (r, u) => { const s = sub(r.id, u.id), k = stOf(r, u.id);
  const form = (r.type === 'video' ? `<label>What did you learn? (at least 20 characters)<textarea name="answer" rows="4" required minlength="20"></textarea></label>` : '<p class="small muted">Add your work as files, links or both.</p>') + attachFields;
  return `<div class="card sticky"><div style="display:flex;gap:.8rem;align-items:center"><span class="type ${r.type}">${TYPES[r.type][0]}</span><div><h2 style="margin:0">${esc(r.title)}</h2><span class="small muted">${TYPES[r.type][1]} · ${r.max} points</span></div></div>
  <p class="small"><b>Due ${fmtT(r.due)}</b> (${rel(r.due)})</p>${r.desc ? `<p>${esc(r.desc)}</p>` : ''}${itemsHtml(r.items)}${r.link ? `<p><a class="btn alt sm" href="${esc(r.link)}" target="_blank" rel="noopener">Open resource</a></p>` : ''}<hr class="hr">
  <h3>Your work <span class="tag ${STAT[k][1]}">${STAT[k][0]}</span></h3>
  ${s ? `<div class="ans">${s.answer ? ansHtml(s.answer) : ''}${itemsHtml(s.items)}<div class="small muted">Turned in ${fmtT(s.at)}</div></div>` : ''}
  ${k === 'graded' ? `<p class="grade-box"><b>${s.score} / ${r.max}</b>${s.feedback ? `<br><span class="muted">Mentor feedback:</span> ${esc(s.feedback)}` : ''}</p>` : ''}
  ${k === 'turned' ? `<p class="muted small">Waiting for your mentor to review it.</p>${r.due > Date.now() ? '<button class="btn alt sm" data-act="unsubmit" data-id="' + r.id + '">Unsubmit to edit</button>' : ''}` : ''}
  ${k === 'todo' ? `<form class="f" data-act="turnin" data-id="${r.id}">${form}<label>Private comment to mentor (optional)<input name="note"></label><div><button class="btn">Turn in</button></div></form>` : ''}
  ${k === 'missing' ? '<p class="muted">This is closed. Ask your mentor to extend the deadline if you need more time.</p>' : ''}</div>`; };

const learn = () => { const u = me(), st = stats(u), all = st.rs.slice().sort((a, b) => a.due - b.due), list = all.filter(r => filt === 'all' || stOf(r, u.id) === filt);
  if (!all.some(r => r.id === openRes)) openRes = (list[0] || all[0] || {}).id;
  const cur = all.find(r => r.id === openRes);
  return `<div class="page-h"><div><h1>Hi, ${esc(u.name.split(' ')[0])}</h1><span class="muted">${esc(prog(u.program))}</span></div>
  <div><span class="tag sun">${st.score} points</span> <span class="tag">Rank #${st.rank}</span> <span class="tag">${st.done}/${st.total} turned in</span></div></div>
  ${mentorCard(S.mentors.find(x => x.program === u.program))}<div class="tabs wrapt" role="group" aria-label="Filter">${[['all','All'],['todo','Assigned'],['turned','Turned in'],['graded','Graded'],['missing','Missing']].map(f => `<button type="button" data-act="filt" data-v="${f[0]}" aria-pressed="${filt === f[0]}">${f[1]}</button>`).join('')}</div>
  <div class="two"><div class="card pad0">${list.map(r => { const k = stOf(r, u.id), s = sub(r.id, u.id);
    return `<div class="res pick ${r.id === openRes ? 'sel' : ''}" role="button" tabindex="0" data-act="open" data-id="${r.id}"><span class="type ${r.type}">${TYPES[r.type][0]}</span><div><b>${esc(r.title)}</b><div class="small muted">Due ${fmtT(r.due)}</div></div>
    <span class="tag ${STAT[k][1]}">${k === 'graded' ? s.score + '/' + r.max : STAT[k][0]}</span></div>`; }).join('') || '<p class="muted" style="padding:1rem">Nothing here.</p>'}</div>
  <div>${cur ? detail(cur, u) : ''}</div></div>`; };

const lb = () => { const u = me(); return `<div class="page-h"><h1>Leaderboard</h1><span class="muted">Graded points only. Updates live across tabs.</span></div><div class="card pad0 scroll"><table class="tbl"><tr><th>#</th><th>Mentee</th><th>Program</th><th>Points</th></tr>
  ${board().map((r, i) => `<tr class="${u && r.m.id === u.id ? 'me' : ''}"><td>${i + 1}</td><td><span class="av s">${avatar(r.m.name + r.m.av)}</span>${esc(r.m.name)}</td><td>${esc(prog(r.m.program))}</td><td>${r.pts}</td></tr>`).join('')}</table></div>`; };

const profile = () => { const u = me(), isM = session.role === 'mentee';
  if (!isM) return mprofile(u);
  const ai = generateInsights(u), st = ai.st, mx = Math.max(1, ...Object.values(st.pts));
  return `<div class="pro"><div class="av">${avatar(u.name + u.av)}</div><div><h1>${esc(u.name)}</h1><p>${esc(prog(u.program))} · ${esc(u.enroll)}</p>
    <p><span class="tag">Rank #${st.rank}</span> <span class="tag">${st.score} points</span> <span class="tag">${ai.badges.filter(b => b.on).length} badges</span></p>
    <button class="btn sm" style="background:var(--sun);color:#1d1b3a;border-color:var(--sun)" data-act="avatar">New avatar</button></div></div>
  <div class="sec two"><div class="card"><h2>AI summary</h2><p>${esc(ai.summary)}</p><div class="chips">${(u.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
  <form class="f" data-act="tag" style="margin-top:.8rem"><label>Add an interest<input name="tag" placeholder="e.g. react" maxlength="20"></label></form></div>
  <div class="card"><h2>Recommended next</h2><ul class="recs">${ai.recs.map(r => `<li>${esc(r)}</li>`).join('')}</ul><button class="btn alt sm" data-act="refresh">Refresh insights</button></div></div>
  <div class="sec"><h2>Skill badges</h2><div class="badges">${ai.badges.map(b => `<div class="badge ${b.on ? 'on' : 'off'}"><b>${b.on ? '★ ' : ''}${b.name}</b><div class="small muted">${b.desc}</div></div>`).join('')}</div></div>
  <div class="sec card"><h2>Graded points by format</h2><div class="bars">${Object.keys(st.pts).map(t => `<div class="bar-row"><span>${TYPES[t][1]}</span><div class="track"><div class="fill" style="width:${st.pts[t] / mx * 100}%"></div></div><b>${st.pts[t]}</b></div>`).join('')}</div></div>`; };

/* ---------- router + events ---------- */
const routes = {'/':home, '/login':login, '/admin':admin, '/mentor':mentor, '/learn':learn, '/leaderboard':lb, '/profile':profile, '/team':teamPage, '/help':help};
function render() {
  const r = (location.hash || '#/').slice(1), need = {'/admin':'admin', '/mentor':'mentor', '/learn':'mentee'}[r], s = session;
  if ((need && (!s || s.role !== need)) || ((r === '/leaderboard' || r === '/profile') && !s)) { location.hash = '#/login'; return; }
  if (r === '/leaderboard' && s.role === 'admin') { location.hash = '#/admin'; return; }
  if (s && !me()) { setSession(null); location.hash = '#/login'; return; }
  if (netStop) { netStop(); netStop = null; }
  $('#nav').innerHTML = nav(); $('#app').innerHTML = (routes[r] || home)(); lastCred = '';
  if ((routes[r] || home) === home) netStop = startNet($('#net'));
  const rf = $('form[data-act=resource]'); if (rf) prevDue(rf);
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.addEventListener('keydown', e => { const b = e.target.closest && e.target.closest('.pick'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); b.click(); } });
document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.dataset && t.dataset.n) t.outerHTML = avatar(t.dataset.n); }, true); // photo fails to load: show generated avatar
document.addEventListener('input', e => { const f = e.target.closest && e.target.closest('form[data-act=resource]'); if (f) prevDue(f); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'FORM') return; const a = b.dataset.act, id = b.dataset.id;
  if (a === 'role') { role = b.dataset.v; render(); }
  else if (a === 'logout') { setSession(null); openRes = editing = reviewing = null; location.hash = '#/'; render(); }
  else if (a === 'filt') { filt = b.dataset.v; render(); }
  else if (a === 'open') { openRes = id; render(); }
  else if (a === 'edit') { editing = id; render(); window.scrollTo(0, 0); }
  else if (a === 'cancel') { editing = null; render(); }
  else if (a === 'review') { reviewing = id; render(); }
  else if (a === 'closerev') { reviewing = null; render(); }
  else if (a === 'shift') { const f = b.closest('form').elements.date, d = +b.dataset.d, base = d && f.value ? new Date(f.value + 'T00:00') : new Date(); base.setDate(base.getDate() + d); f.value = dStr(base); prevDue(b.closest('form')); }
  else if (a === 'settime') { const f = b.closest('form'), [h, m] = b.dataset.t.split(':').map(Number), t = new Date(readDue(f) || Date.now()); t.setHours(h, m, 0, 0); setDue(f, t.getTime()); }
  else if (a === 'addh') { const f = b.closest('form'), base = readDue(f); setDue(f, (isNaN(base) ? Date.now() : base) + b.dataset.h * 36e5); }
  else if (a === 'avatar') { mutate(() => { me().av = (me().av || 0) + 1; }); render(); }
  else if (a === 'refresh') { toast('Analysing your activity…'); setTimeout(() => { S = load(); render(); toast('Insights refreshed'); }, 600); }
  else if (a === 'unsubmit') { const u = me(); mutate(() => { const r = S.res.find(x => x.id === id), s = sub(id, u.id); if (s && s.status === 'turned_in' && r.due > Date.now()) S.subs = S.subs.filter(x => x !== s && x.id !== s.id); }); render(); toast('Unsubmitted. You can edit and turn in again.'); }
});
document.addEventListener('submit', async e => {
  const f = e.target, a = f.dataset.act; if (!a) return; e.preventDefault(); const d = Object.fromEntries(new FormData(f)); let u = null;
  if (a === 'login') { S = load(); const rows = role === 'admin' ? [{id:'admin', user:'admin', pass:'admin123'}] : role === 'mentor' ? S.mentors : S.mentees, row = rows.find(x => (x.user || x.enroll) === d.id.trim() && x.pass === d.pw);
    if (!row) return toast('Wrong ID or password'); setSession({role, id:row.id}); location.hash = {admin:'#/admin', mentor:'#/mentor', mentee:'#/learn'}[role]; return render(); }
  if (a === 'ticket') { const body = `Name: ${d.name}\nEnrollment: ${d.enroll || 'n/a'}\nTopic: ${d.topic}\n\n${d.msg}`;
    location.href = `mailto:${MAIL}?subject=${encodeURIComponent('[Help desk] ' + d.topic)}&body=${encodeURIComponent(body)}`; return toast('Opening your email app…'); }
  S = load(); u = me(); if (!u) return toast('Please log in again');
  let G = null; if (a === 'resource' || a === 'turnin') { G = await gather(f); if (G.err) return toast(G.err); if (!fits(G.items)) return toast('Storage is nearly full. Remove some files or share them as links instead.'); }
  if (a === 'program') { mutate(() => S.programs.push({id:'p' + rnd(5), name:d.name.trim()})); toast('Program created'); }
  else if (a === 'mentor') mutate(() => { const c = {id:'m' + rnd(5), name:d.name.trim(), user:slug(d.name) || 'mentor' + rnd(3), pass:rnd(8), program:d.program}; S.mentors.push(c); lastCred = cred('Mentor', c.user, c.pass); });
  else if (a === 'resource') { const due = readDue(f), id = f.dataset.id, link = d.link.trim();
    if (isNaN(due)) return toast('Enter a valid date and time'); if (!id && due < Date.now()) return toast('Pick a future date and time');
    if (link && !isUrl(link)) return toast('The resource link must start with http:// or https://');
    mutate(() => { const old = id && S.res.find(x => x.id === id), kept = old ? (old.items || []).filter((_, i) => { const c = f.querySelector(`[name=keep][value="${i}"]`); return c && c.checked; }) : [],
      rec = {type:d.type, title:d.title.trim(), desc:d.desc.trim(), link, max:+d.max, due, items:kept.concat(G.items)}; if (old) Object.assign(old, rec); else S.res.push(Object.assign({id:'r' + rnd(5), program:u.program}, rec)); });
    editing = null; toast(id ? 'Resource updated' : 'Resource published'); }
  else if (a === 'mentee') mutate(() => { let n = S.mentees.length + 1, en; do { en = 'TN25' + String(n++).padStart(3, '0'); } while (S.mentees.some(m => m.enroll === en));
    const c = {id:'e' + rnd(5), name:d.name.trim(), enroll:en, pass:rnd(8), program:u.program, tags:d.tags.split(',').map(t => t.trim()).filter(Boolean), av:0}; S.mentees.push(c); lastCred = cred('Mentee', c.enroll, c.pass); });
  else if (a === 'turnin') { const r = S.res.find(x => x.id === f.dataset.id), ans = (d.answer || '').trim();
    if (!r || r.due < Date.now()) return toast('The deadline has passed'); if (r.type === 'video' && ans.length < 20) return toast('Write at least 20 characters');
    if (r.type !== 'video' && !G.items.length) return toast('Add at least one file or link');
    mutate(() => { if (!sub(r.id, u.id)) S.subs.push({id:'s' + rnd(6), r:r.id, m:u.id, answer:ans, items:G.items, note:(d.note || '').trim(), at:Date.now(), status:'turned_in', score:null, feedback:'', gradedAt:0}); }); toast('Turned in'); }
  else if (a === 'grade') { const s0 = S.subs.find(x => x.id === f.dataset.sid), r = s0 && S.res.find(x => x.id === s0.r), sc = Math.max(0, Math.min(+d.score, r ? r.max : 0));
    mutate(() => { const s = S.subs.find(x => x.id === f.dataset.sid); if (s) Object.assign(s, {score:sc, feedback:(d.feedback || '').trim(), status:'graded', gradedAt:Date.now()}); }); toast('Grade returned'); }
  else if (a === 'mprofile') { const pf = f.elements.photo.files[0], web = (d.web || '').trim(); let photo = null;
    if (web && !isUrl(web)) return toast('Website must start with http:// or https://');
    if (pf) { if (!/^image\//.test(pf.type)) return toast('Choose an image file for your photo'); photo = await shrink(pf).catch(() => null); if (!photo) return toast('That image could not be read'); }
    mutate(() => { const m = me(); Object.assign(m, {name:d.name.trim() || m.name, headline:(d.headline || '').trim(), bio:(d.bio || '').trim(), avail:(d.avail || '').trim(), web,
      skills:(d.skills || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 10), li:handle(d.li), gh:handle(d.gh), ig:handle(d.ig)});
      if (photo) m.photo = photo; else if (d.rmphoto) delete m.photo; if (d.npw) m.pass = d.npw; }); toast('Profile saved'); }
  else if (a === 'tag') { const t = (d.tag || '').trim(); if (!t) return; mutate(() => { const m = me(); m.tags = (m.tags || []).concat(t).slice(-6); }); toast('Interest added'); }
  render();
});
render();
})();
