/* برنامج الموديول الأول – شاشات منفصلة بأزرار السابق/التالي (البيانات في localStorage) */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const words = t => (String(t || '').trim().match(/\S+/g) || []).length;
const fmtD = t => t ? new Date(t).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- التخزين ---------- */
const KEY = 'module1_db_v1';
let DB;
function loadDB() {
  try { DB = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { DB = {}; }
  DB.students = DB.students || {}; DB.forum = DB.forum || [];
  Object.keys(DB.students).forEach(k => { const s = DB.students[k]; if (!s.user) s.user = k; });
  DB.settings = Object.assign({ teacherPin: '1234', podcast: '', mastery: 80 }, DB.settings || {});
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('تعذر الحفظ: مساحة التخزين ممتلئة أو معطلة'); } }
loadDB();
let CUR = null;
try { CUR = localStorage.getItem('module1_cur') || null; } catch (e) {}
let TEACHER = false;
const me = () => (CUR && DB.students[CUR]) || null;
const newStudent = o => Object.assign({ created: Date.now(), viewed: {}, acts: {}, texts: {}, pre: [], post: [], time: 0, log: [] }, o);
function log(st, e) { st.log.push({ t: Date.now(), e }); if (st.log.length > 400) st.log.shift(); }
function toast(m) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), 2400); }
function saveCur() { try { localStorage.setItem('module1_cur', CUR || ''); } catch (e) {} }

/* ---------- الأقسام ---------- */
const SECS = [
  { id: 'card', t: 'بطاقة التعريف بالموديول', ic: '🪪', g: 'التمهيد' },
  { id: 'intro', t: 'مقدمة الموديول', ic: '💡' },
  { id: 'guide', t: 'تعليمات الدراسة وخريطة السير', ic: '🧭' },
  { id: 'obj', t: 'الأهداف التعليمية', ic: '🎯' },
  { id: 'prereq', t: 'المتطلبات القبلية', ic: '📚' },
  { id: 'pre', t: 'الاختبار القبلي', ic: '📝', g: 'التقويم' },
  { id: 'media', t: 'الوسائط ومصادر التعلم', ic: '🎧', g: 'الدراسة', lock: 1 },
  { id: 's1', t: '1- اسأل (Ask)', ic: '❓', lock: 1 },
  { id: 's2', t: '2- استقصِ (Investigate)', ic: '🔍', lock: 1 },
  { id: 's3', t: '3- ابتكر (Create)', ic: '✍️', lock: 1 },
  { id: 's4', t: '4- ناقش (Discuss)', ic: '💬', lock: 1 },
  { id: 's5', t: '5- تأمل (Reflect)', ic: '📓', lock: 1 },
  { id: 'post', t: 'الاختبار البعدي', ic: '📝', g: 'التقويم', lock: 1 },
  { id: 'fb', t: 'التغذية الراجعة والمسار العلاجي', ic: '🩺' },
  { id: 'keys', t: 'مفاتيح التصحيح', ic: '✅', g: 'المراجع' },
  { id: 'gloss', t: 'المسرد والمصادر', ic: '📖' },
  { id: 'log', t: 'سجل المتابعة', ic: '📊', g: 'سجلي' }
];
const VIEW_ITEMS = ['card', 'intro', 'guide', 'obj', 'prereq', 'media', 'fb', 'keys', 'gloss'];
const TRACK = ['card', 'intro', 'guide', 'obj', 'prereq', 'pre', 'media', 's1', 's2', 's3', 's4', 's5', 'post', 'fb', 'keys', 'gloss'];

/* ---------- حسابات ---------- */
const bestPre = st => st.pre.length ? Math.max(...st.pre.map(a => a.score)) : null;
const lastPre = st => st.pre[st.pre.length - 1];
const postTotal = a => a.grades ? a.mcq + ESSAYS.reduce((s, e) => s + (a.grades[e.id] || 0), 0) : null;
function postBest(st) { const v = st.post.map(postTotal).filter(x => x != null); return v.length ? Math.max(...v) : null; }
function forumCount(st) { const p = DB.forum.filter(x => x.sid === st.user); return { main: p.filter(x => !x.parent).length, rep: p.filter(x => x.parent).length }; }
function stageDone(st, id) {
  const T = st.texts, A = st.acts;
  if (id === 's1') return !!A.a1;
  if (id === 's2') return ['a2', 'a3', 'a4', 'a5', 'a6'].every(k => A[k]);
  if (id === 's3') return words(T.argument) >= 20;
  if (id === 's4') return forumCount(st).main >= 1 && forumCount(st).rep >= 2;
  if (id === 's5') return !!(T.ref1 && T.ref2 && T.ref3);
  return false;
}
function isDone(st, id) {
  if (VIEW_ITEMS.includes(id)) return !!st.viewed[id];
  if (id === 'pre') return st.pre.length > 0;
  if (id === 'post') return st.post.length > 0;
  return stageDone(st, id);
}
const progress = st => Math.round(TRACK.filter(i => isDone(st, i)).length / TRACK.length * 100);
function status(st) {
  const m = DB.settings.mastery, best = postBest(st);
  if (best != null && best * 10 >= m) return { t: 'أتقن الموديول', c: 'g' };
  if (st.post.length && st.post.every(a => !a.grades)) return { t: 'بانتظار تصحيح المقالي', c: 'y' };
  if (st.post.length) return { t: 'يحتاج مسارًا علاجيًا', c: 'r' };
  if (st.pre.length && bestPre(st) * 10 >= m) return { t: 'جاهز للانتقال (بموافقة الأستاذ)', c: 'b' };
  if (st.pre.length) return { t: 'قيد الدراسة', c: 'y' };
  return { t: 'لم يبدأ', c: '' };
}
const locked = (st, sec) => sec.lock && !st.pre.length;

/* ---------- التوجيه ---------- */
function goto(id, n) { const h = `#/s/${id}/${n || 0}`; if (location.hash === h) render(); else location.hash = h; }
function go(r) { if (location.hash === '#/' + r) render(); else location.hash = '#/' + r; }
window.addEventListener('hashchange', render);
const route = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/');
let LASTSEC = null;
let SIDE = (() => { try { const v = localStorage.getItem('module1_side'); if (v != null) return v === '1'; } catch (e) {} return window.innerWidth > 860; })();
const SHUT = {};

/* ---------- العرض ---------- */
function render() {
  const [r, a, b] = route(), root = $('#root');
  if (r === 'teacher') { root.innerHTML = teacherPage(a); wireTeacher(a); window.scrollTo(0, 0); return; }
  const st = me();
  if (r === 'home' || !st) {
    if (r !== 'home' && r !== 'login' && r !== 'register') { location.hash = '#/home'; return; }
    root.innerHTML = coverPage(r); wireCover(r); return;
  }
  const id = r === 's' ? a : 'card';
  const cur = SECS.find(s => s.id === id) || SECS[0];
  const lk = locked(st, cur);
  const scr = (lk ? [lockedPage()] : SCR[cur.id](st)).map(x => typeof x === 'string' ? { h: x } : x);
  let idx = parseInt(b, 10); if (isNaN(idx) || idx < 0) idx = 0; if (idx > scr.length - 1) idx = scr.length - 1;
  if (!lk && VIEW_ITEMS.includes(cur.id) && idx === scr.length - 1 && !st.viewed[cur.id]) st.viewed[cur.id] = Date.now();
  if (LASTSEC !== cur.id) { log(st, 'زيارة: ' + cur.t); LASTSEC = cur.id; }
  save();
  root.innerHTML = shell(st, cur, scr, idx);
  $('#in').innerHTML = scr[idx].h;
  wireShell(); wireScreen(st);
  fit();
}
function fit() {
  const inn = $('#in'), sr = $('#screen'); if (!inn || !sr) return;
  inn.style.zoom = 1; let z = 1;
  while (inn.getBoundingClientRect().height > sr.clientHeight - 34 && z > 0.5) { z = Math.round((z - 0.05) * 100) / 100; inn.style.zoom = z; }
}
window.addEventListener('resize', fit);

function pagerTargets(st, cur, scr, idx) {
  const i = SECS.findIndex(s => s.id === cur.id), p = SECS[i - 1], n = SECS[i + 1];
  let prev = null, next = null, nlabel = 'التالي ←', plabel = '→ السابق';
  if (idx > 0) prev = `s/${cur.id}/${idx - 1}`; else if (p) { prev = `s/${p.id}/9999`; plabel = '→ ' + p.t; }
  if (!scr[idx].nonext) {
    if (idx < scr.length - 1) next = `s/${cur.id}/${idx + 1}`;
    else if (n) { nlabel = n.t + ' ←'; next = locked(st, n) ? null : `s/${n.id}/0`; if (!next) nlabel = n.t + ' 🔒'; }
  } else nlabel = 'أكمل هذه الشاشة';
  return { prev, next, nlabel, plabel };
}
function shell(st, cur, scr, idx) {
  const p = progress(st), t = pagerTargets(st, cur, scr, idx);
  const grpHTML = []; let curGrp = null, items = '';
  const flush = () => { if (curGrp) grpHTML.push(`<div class="grp ${SHUT[curGrp] ? 'shut' : ''}" data-grp="${curGrp}">${SHUT[curGrp] ? '▸' : '▾'} ${curGrp}</div><div class="items">${items}</div>`); items = ''; };
  SECS.forEach(s => {
    if (s.g) { flush(); curGrp = s.g; }
    const lk = locked(st, s), dn = TRACK.includes(s.id) && isDone(st, s.id);
    items += `<a href="#/s/${s.id}/0" class="${s.id === cur.id ? 'on' : ''} ${lk ? 'lock' : ''}"><span>${s.ic}</span><span>${s.t}</span><span class="st">${lk ? '🔒' : dn ? '✔' : ''}</span></a>`;
  });
  flush();
  return `<div class="app">
  <div class="topbar"><button class="tg" id="tg" title="إظهار/إخفاء القائمة">☰</button><b>الموديول الأول</b>
   <span class="where">${cur.ic} ${cur.t} · شاشة ${idx + 1} من ${scr.length}</span>
   <span class="pg"><span class="pgbar"><i style="width:${p}%"></i></span>${p}%</span></div>
  <div class="row"><aside class="side ${SIDE ? '' : 'off'}" id="side">
   <div class="me">👤 ${esc(st.name)}<br><small>المجموعة: ${esc(st.group)} · رقم الجلوس: ${esc(st.seat)}<br>اسم المستخدم: ${esc(st.user)}</small></div>
   <nav class="nav">${grpHTML.join('')}</nav>
   <div class="foot"><button class="btn gold sm" onclick="go('home')">الغلاف</button><button class="btn maroon sm" id="logout">تسجيل الخروج</button></div>
  </aside>
  <div class="content"><div class="screen" id="screen"><div class="sc"><div id="in"></div></div></div>
   <div class="pager"><a class="btn ghost ${t.prev ? '' : 'dis'}" id="pv" ${t.prev ? `href="#/${t.prev}"` : ''}>${t.plabel}</a>
    <div class="mid">${idx + 1} / ${scr.length}<div class="dots"><i style="width:${Math.round((idx + 1) / scr.length * 100)}%"></i></div></div>
    <a class="btn gold ${t.next ? '' : 'dis'}" id="nx" ${t.next ? `href="#/${t.next}"` : ''}>${t.nlabel}</a></div></div></div></div>`;
}
function setSide(v) { SIDE = v; try { localStorage.setItem('module1_side', v ? '1' : '0'); } catch (e) {} const s = $('#side'); if (s) s.classList.toggle('off', !v); setTimeout(fit, 300); }
function wireShell() {
  $('#tg').onclick = () => setSide(!SIDE);
  $('#logout').onclick = () => { CUR = null; saveCur(); go('home'); };
  $$('.nav a').forEach(a => a.addEventListener('click', () => { if (window.innerWidth <= 860) setSide(false); }));
  $$('[data-grp]').forEach(g => g.onclick = () => { SHUT[g.dataset.grp] = !SHUT[g.dataset.grp]; g.classList.toggle('shut'); g.firstChild.textContent = (SHUT[g.dataset.grp] ? '▸' : '▾') + ' ' + g.dataset.grp; });
}
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '') || e.ctrlKey || e.altKey || route()[0] !== 's') return;
  if (e.key === 'ArrowLeft' && $('#nx[href]')) $('#nx').click();
  if (e.key === 'ArrowRight' && $('#pv[href]')) $('#pv').click();
});
const lockedPage = () => `<div class="card warn center"><h2>🔒 هذا القسم مغلق</h2><p>ابدأ بالاختبار القبلي أولًا؛ فهو تشخيصي ويحدد مسارك في الموديول. ثم ستفتح لك المراحل والوسائط والاختبار البعدي.</p><a class="btn" href="#/s/pre/0">اذهب إلى الاختبار القبلي</a></div>`;

/* ---------- الغلاف وتسجيل الدخول ---------- */
const STAR = `<svg class="star" viewBox="0 0 100 100"><path d="M50 4l8 16 17-7-2 18 18 2-7 17 16 8-16 8 7 17-18 2 2 18-17-7-8 16-8-16-17 7 2-18-18-2 7-17-16-8 16-8-7-17 18-2-2-18 17 7z" fill="#f3e2a9" stroke="#b8860b" stroke-width="3"/><path d="M50 26l5 11 12-3-4 12 11 6-11 6 4 12-12-3-5 11-5-11-12 3 4-12-11-6 11-6-4-12 12 3z" fill="#f6efdf" stroke="#7a2b26" stroke-width="2.5"/></svg>`;
function coverPage(mode) {
  const forms = {
    login: `<div class="formcard"><h3>🔑 تسجيل دخول الطالب</h3>
      <label>اسم المستخدم</label><input type="text" id="l_user" autocomplete="username" autocapitalize="off" dir="ltr" style="text-align:right">
      <label>كلمة المرور</label><input type="password" id="l_pin" autocomplete="current-password" dir="ltr" style="text-align:right">
      <label class="opt" style="padding:.2em 0"><input type="checkbox" id="showpw"><span>إظهار كلمة المرور</span></label>
      <div class="err" id="err"></div><div class="cta"><button class="btn green" id="doLogin">دخول</button><a class="btn ghost" href="#/home">رجوع</a></div></div>`,
    register: `<div class="formcard"><h3>📝 تسجيل طالب جديد</h3>
      <label>اسم الطالب (ثلاثي على الأقل)</label><input type="text" id="r_name" autocomplete="off">
      <label>المجموعة</label><input type="text" id="r_group" autocomplete="off">
      <label>رقم الجلوس</label><input type="text" id="r_seat" inputmode="numeric" autocomplete="off">
      <label>تاريخ البدء</label><input type="date" id="r_date" value="${today()}">
      <label>اسم المستخدم (حروف إنجليزية وأرقام فقط، 4 خانات على الأقل)</label><input type="text" id="r_user" autocomplete="username" autocapitalize="off" dir="ltr" style="text-align:right" placeholder="مثال: ahmed101">
      <label>كلمة المرور (6 خانات على الأقل)</label><input type="password" id="r_pin" autocomplete="new-password" dir="ltr" style="text-align:right">
      <label>تأكيد كلمة المرور</label><input type="password" id="r_pin2" autocomplete="new-password" dir="ltr" style="text-align:right">
      <label class="opt" style="padding:.2em 0"><input type="checkbox" id="showpw"><span>إظهار كلمة المرور</span></label>
      <div class="err" id="err"></div><div class="cta"><button class="btn green" id="doReg">إنشاء الحساب والدخول</button><a class="btn ghost" href="#/home">رجوع</a></div></div>`,
    home: `<div class="cta"><a class="btn green" href="#/login">🔑 دخول الطالب</a><a class="btn gold" href="#/register">📝 تسجيل طالب جديد</a><a class="btn ghost" href="#/teacher">👨‍🏫 لوحة الأستاذ</a></div>
      ${me() ? `<p style="margin-top:14px">أنت مسجل الدخول باسم <b>${esc(me().name)}</b> — <a href="#/s/card/0">تابع من حيث توقفت</a></p>` : ''}`
  };
  return `<div class="cover"><div class="arch">${STAR}
    <div class="uni">جامعة الأزهر – كلية التربية بنين بالقاهرة · مقرر: تاريخ الأيوبيين والمماليك – الفرقة الرابعة</div>
    <h1>الموديول الأول</h1><h2>تأسيس البيت الأيوبي<br>وصعود صلاح الدين</h2><div class="rule"></div>
    <div class="period">من سنة 564هـ إلى سنة 567هـ (1169 – 1171م)</div>
    <div class="tag">دليل الطالب للتعلم الذاتي · موديول رقمي قائم على الاستقصاء</div>
    <div class="credits"><div><b>د/ أحمد السيد محمد عبد المحسن</b><br>مدرس المناهج وطرق التدريس</div><div><b>د/ أحمد محمد أحمد محمد فراج</b><br>مدرس تكنولوجيا التعليم والمعلومات</div></div>
    ${forms[mode] || forms.home}</div></div>`;
}
function wireCover(mode) {
  const sp = $('#showpw'); if (sp) sp.onchange = () => $$('input[id^="l_pin"],input[id^="r_pin"]').forEach(x => x.type = sp.checked ? 'text' : 'password');
  if (mode === 'login') {
    const go1 = () => {
      const s = DB.students[$('#l_user').value.trim().toLowerCase()];
      if (!s || s.pin !== $('#l_pin').value) { $('#err').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة'; return; }
      CUR = s.user; saveCur(); log(s, 'تسجيل دخول'); save(); LASTSEC = null; goto('card', 0);
    };
    $('#doLogin').onclick = go1; $('#l_pin').onkeydown = e => { if (e.key === 'Enter') go1(); };
  }
  if (mode === 'register') {
    $('#doReg').onclick = () => {
      const v = id => $(id).value.trim(), e = m => $('#err').textContent = m;
      const name = v('#r_name'), group = v('#r_group'), seat = v('#r_seat'), user = v('#r_user').toLowerCase(), pin = $('#r_pin').value;
      if (name.split(/\s+/).length < 3) return e('اكتب الاسم ثلاثيًا على الأقل');
      if (!group) return e('اكتب المجموعة');
      if (!/^\d+$/.test(seat)) return e('رقم الجلوس يتكون من أرقام فقط');
      if (Object.values(DB.students).some(x => x.seat === seat)) return e('رقم الجلوس هذا مسجل من قبل، سجّل الدخول بدلًا من ذلك');
      if (!/^[a-z0-9._]{4,}$/.test(user)) return e('اسم المستخدم: 4 خانات على الأقل من الحروف الإنجليزية والأرقام (. _ مسموحة)');
      if (DB.students[user]) return e('اسم المستخدم هذا مستخدم من قبل، اختر اسمًا آخر');
      if (pin.length < 6) return e('كلمة المرور 6 خانات على الأقل');
      if (pin !== $('#r_pin2').value) return e('تأكيد كلمة المرور غير مطابق');
      const s = newStudent({ name, group, seat, user, pin, start: v('#r_date') || today() });
      log(s, 'إنشاء الحساب'); DB.students[user] = s; CUR = user; saveCur(); save(); LASTSEC = null; goto('card', 0);
    };
  }
}

/* ---------- أدوات المحتوى ---------- */
const SCR = {};
const img = (n, cap) => `<img class="fig" src="fig${n}.png" alt="${esc(cap)}"><div class="cap">${cap}</div>`;
const T = (h, rows) => `<div class="tblwrap"><table><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
const stageStrip = cur => `<div class="stage">${[['s1', 'اسأل', '--teal'], ['s2', 'استقصِ', '--teal2'], ['s3', 'ابتكر', '--green'], ['s4', 'ناقش', '--gold'], ['s5', 'تأمل', '--maroon']].map(s => `<span class="${s[0] === cur ? 'cur' : ''}" style="background:var(${s[2]})">${s[1]}</span>`).join('')}</div>`;
const doneP = (st, id) => stageDone(st, id) ? '<span class="pill g">✔ أنجزت هذه المرحلة</span>' : '<span class="pill y">قيد الإنجاز</span>';
const textField = (key, ph, rows) => `<textarea data-t="${key}" placeholder="${esc(ph || '')}" style="min-height:${rows || 70}px"></textarea>`;
const inputField = (key, ph) => `<input type="text" data-t="${key}" placeholder="${esc(ph || '')}">`;
const saveBtn = label => `<button class="btn sm gold savetxt">💾 ${label || 'حفظ'}</button>`;

/* ---------- 1) بطاقة التعريف (3 شاشات) ---------- */
SCR.card = st => [
  `<div class="card ok center"><h2 style="border:0">🪪 بطاقة التعريف بالموديول</h2><div class="big">مرحبًا <b>${esc(st.name)}</b> 👋<br>ادرس الموديول شاشة بعد شاشة باستخدام زري «التالي» و«السابق»، ويحفظ البرنامج تقدمك ودرجاتك تلقائيًا.</div></div>
   ${T(['البند', 'البيان'], [['عنوان الموديول', 'تأسيس البيت الأيوبي وصعود صلاح الدين'], ['المقرر', 'تاريخ الأيوبيين والمماليك'], ['الفئة المستهدفة', 'طلاب الفرقة الرابعة – شعبة التاريخ بكلية التربية'], ['الفترة التاريخية', 'من تولي صلاح الدين الوزارة (564هـ / 1169م) إلى إلغاء الخلافة الفاطمية (567هـ / 1171م)'], ['نمط التعلم', 'تعلم ذاتي رقمي قائم على الاستقصاء بخمس مراحل: اسأل – استقصِ – ابتكر – ناقش – تأمل']])}`,
  `<h2>بطاقة التعريف (2/3)</h2>${T(['البند', 'البيان'], [['بيئة التعلم', 'هذا البرنامج التفاعلي (النصوص، البودكاست، الأنشطة التفاعلية، منتدى النقاش، الاختبارات الإلكترونية)'], ['الزمن المقترح', 'أسبوع دراسي واحد تقريبًا (من 4 إلى 5 ساعات تعلم ذاتي)، وتتقدم وفق سرعتك الخاصة'], ['المهارات المستهدفة', 'طرح الأسئلة الاستقصائية – نقد المصادر وتقييمها – بناء الحجة التاريخية وتفنيد الآراء – الربط السببي والزمني'], ['مستوى الإتقان', '80% فأكثر في الاختبار البعدي (8 درجات من 10)'], ['أدوات التقويم', 'اختبار قبلي – أنشطة ذاتية بمفاتيح تصحيح – مهمة أداء (حجة تاريخية) بقائمة تقدير – مشاركة في منتدى النقاش – اختبار بعدي']])}`,
  `<h2>مكونات الموديول (3/3)</h2>${T(['م', 'المكون', 'ماذا ستفعل فيه؟'], [['بطاقة التعريف', 'تتعرف على بيانات الموديول وزمنه ومستوى الإتقان'], ['مقدمة الموديول', 'تكتشف القضية التي ستستقصيها'], ['تعليمات الدراسة وخريطة السير', 'تعرف كيف تتنقل بين المكونات'], ['الأهداف التعليمية', 'تعرف ما ستكون قادرًا على أدائه'], ['المتطلبات القبلية', 'تراجع المعلومات السابقة'], ['الاختبار القبلي', 'تشخص مستواك قبل الدراسة'], ['الوسائط ومصادر التعلم', 'تختار ما يناسب أسلوب تعلمك'], ['مراحل الاستقصاء الخمس', 'تدرس المحتوى وتنجز 6 أنشطة ذاتية'], ['الاختبار البعدي', 'تقيس مدى إتقانك'], ['التغذية الراجعة والمسار العلاجي', 'تعالج نقاط الضعف'], ['المفاتيح والمسرد والمصادر', 'تصحح أنشطتك وتراجع المصطلحات']].map((r, i) => [i + 1, ...r]))}
   <div class="card" style="font-size:.92em">🔍 نشاط ذاتي · ✅ تقويم ذاتي بمفتاح التصحيح · 💡 تلميح المؤرخ · 📜 نص تاريخي · 🎧 بودكاست · 💬 منتدى · 📝 اختبار يُرصد في سجلك · ⏱️ الزمن المقترح</div>`
];

/* ---------- 2) المقدمة (3 شاشات) ---------- */
SCR.intro = st => [
  `<div class="card tip big"><h2 style="border:0">💡 قضية للتأمل قبل أن تبدأ</h2><p>ظلت مصر مقرًا للخلافة الفاطمية نحو قرنين من الزمان (منذ 358هـ / 969م)، ثم تغير وجهها السياسي والمذهبي في نحو ثلاث سنوات فقط (564 – 567هـ)، فإذا بمنابرها تدعو للخليفة العباسي في بغداد، دون ثورة شعبية كبرى تُذكر عند إعلان ذلك.</p><p><b>فكيف حدث هذا التحول الكبير؟ ومن صنعه؟ وهل كان مفاجئًا أم مخططًا؟</b></p></div>`,
  `<h2>ثانيًا: مقدمة الموديول</h2><div class="big"><p>عزيزي الطالب المعلم، مرحبًا بك في الموديول الأول من موديولات مقرر «تاريخ الأيوبيين والمماليك». لن تكون في هذا الموديول متلقيًا يحفظ الأحداث ويرددها، بل ستجلس في مقعد المؤرخ الباحث: تطرح الأسئلة، وتفحص النصوص التاريخية وتنقدها، وتستخلص منها الأدلة، ثم تبني حجتك الخاصة وتدافع عنها أمام زملائك، وأخيرًا تتأمل كيف فكرت وكيف تعلمت.</p>
   <p>ويدور الموديول حول لحظة فارقة في تاريخ مصر الإسلامية: تعيين الخليفة الفاطمي العاضد لدين الله القائدَ الشاب صلاح الدين يوسف بن أيوب وزيرًا له سنة 564هـ، وكيف انتهت هذه الوزارة بعد ثلاث سنوات بزوال الخلافة الفاطمية وقيام البيت الأيوبي.</p></div>`,
  `<div class="card big"><h2>لماذا تدرس هذا الموديول؟</h2><ul><li>لأنه البوابة لفهم نشأة الدولة الأيوبية، وما تلاها من توحيد مصر والشام في مواجهة الصليبيين.</li><li>لأنه يدربك على مهارات الاستدلال التاريخي التي ستحتاجها معلمًا للتاريخ، وستعلمها لتلاميذك مستقبلًا.</li><li>لأنه ينمي قدرتك على التعلم الذاتي: أن تدير وقتك، وتختار مصادرك، وتقيّم تقدمك بنفسك.</li></ul></div>`
];

/* ---------- 3) التعليمات: كل تعليمة في شاشة ---------- */
const GUIDE = [
  'اقرأ مقدمة الموديول وأهدافه جيدًا؛ فهي تحدد لك ما ينبغي أن تتقنه في النهاية.',
  'أجب عن الاختبار القبلي بأمانة ودون الرجوع إلى أي مصدر؛ فهو تشخيصي ولا يُحتسب ضمن درجاتك.',
  'إذا حصلت في الاختبار القبلي على 80% فأكثر، يمكنك – بعد موافقة أستاذ المقرر – الانتقال مباشرة إلى الموديول الثاني.',
  'إذا حصلت على أقل من 80%، فادرس مراحل الاستقصاء الخمس بالترتيب، مستعينًا بالوسائط المتاحة واختر منها ما يناسبك.',
  'أنجز كل نشاط ذاتي (🔍) بنفسك أولًا، ثم قارن إجابتك بمفتاح التصحيح (✅)، ولا تطّلع على المفتاح قبل المحاولة.',
  'شارك في منتدى النقاش (💬) بمداخلة رئيسة واحدة على الأقل، وتعقيبين على مداخلات زملائك.',
  'اكتب مذكرة التأمل الخاصة بك، ثم أجب عن الاختبار البعدي (📝).',
  'إذا لم تبلغ مستوى الإتقان (80%)، اتبع المسار العلاجي المقترح لكل مهارة، ثم أعد الاختبار.',
  'تواصل مع أستاذ المقرر إذا واجهتك صعوبة لم تستطع تجاوزها.'
];
SCR.guide = st => [
  `<div class="card center big"><h2 style="border:0">ثالثًا: تعليمات دراسة الموديول</h2><p>اتبع الخطوات التالية بالترتيب، ولا تنتقل إلى خطوة قبل إتمام سابقتها. تُعرض كل خطوة في شاشة مستقلة.</p></div>`,
  ...GUIDE.map((g, i) => `<div class="card center" style="padding:26px"><div class="stepno">${i + 1}</div><div class="big" style="font-size:1.4em;line-height:2">${g}</div><div class="cap">الخطوة ${i + 1} من ${GUIDE.length}</div></div>`),
  `<h2>خريطة السير في الموديول</h2>${img(2, 'شكل (1): خريطة السير في دراسة الموديول')}`,
  `<div class="card tip"><h3>💡 نصائح للتعلم الرقمي</h3><ul class="big"><li>التزم بالمواعيد التي يحددها أستاذ المقرر، ونظّم وقتك على مدار الأسبوع بدل إنجاز كل شيء دفعة واحدة.</li><li>لا تضغط «إرسال» في الاختبار إلا بعد مراجعة إجابتك؛ فالاختبار يُرصد في سجل المتابعة عند الإرسال.</li><li>يمكنك فتح القائمة الجانبية (☰) أو إخفاؤها في أي وقت، وتتابع حالتك من قسم «سجل المتابعة».</li><li>استخدم الأسهم ← و→ في لوحة المفاتيح للتنقل بين الشاشات.</li></ul></div>`
];

/* ---------- 4) الأهداف: شاشة لكل مهارة ---------- */
SCR.obj = st => { let n = 0; return OBJECTIVES.map((g, i) => `<h2>رابعًا: الأهداف التعليمية (${i + 1}/${OBJECTIVES.length})</h2><div class="card big"><h3>◆ ${g[1]}</h3><p>بعد دراسة الموديول ينبغي أن تكون قادرًا على أن:</p>${g[2].map(o => `<p>${++n}- ${o}</p>`).join('')}</div>`); };

/* ---------- 5) المتطلبات ---------- */
SCR.prereq = st => [
  `<h2>خامسًا: المتطلبات القبلية</h2><p class="big">قبل البدء في دراسة الموديول، تأكد من أنك تتذكر ما يلي، فإن شعرت بضعف في أي منها فراجعه في كتاب المقرر:</p><div class="card big"><ul>
   <li>قيام الدولة الفاطمية في مصر (358هـ / 969م)، وأنها اتخذت المذهب الإسماعيلي الشيعي مذهبًا رسميًا لها.</li>
   <li>مكانة الخلافة العباسية في بغداد بوصفها الرمز السياسي والديني لأغلب العالم الإسلامي السني.</li>
   <li>دور نور الدين محمود بن زنكي صاحب دمشق في مواجهة الصليبيين، وسعيه إلى توحيد الجبهة الإسلامية.</li>
   <li>المفهوم العام للمصدر الأولي والمرجع الثانوي كما درسته في مقررات مناهج البحث التاريخي.</li></ul></div>`,
  `<div class="card tip center big"><h2 style="border:0">هل أنت مستعد؟</h2>أجب ذهنيًا: من الخليفة الفاطمي الأخير؟ ومن صاحب دمشق الذي أرسل جيشه إلى مصر؟ إن عرفت الإجابة فأنت جاهز للاختبار القبلي.<div class="tools" style="justify-content:center"><a class="btn gold" href="#/s/pre/0">ابدأ الاختبار القبلي ←</a></div></div>`
];

/* ---------- محرك الاختبارات: سؤال في كل شاشة ---------- */
const QZ = { pre: null, post: null };
function scoreList(list, ans) {
  const skills = {}; let score = 0;
  list.forEach((q, i) => { skills[q.s] = skills[q.s] || [0, 0]; skills[q.s][1]++; if (ans[i] === q.a) { score++; skills[q.s][0]++; } });
  return { skills, score };
}
const skillBars = sk => Object.keys(SKILLS).filter(k => sk[k]).map(k => { const p = Math.round(sk[k][0] / sk[k][1] * 100); return `<div class="skillrow"><span class="n">${SKILLS[k]}</span><div class="tr"><i class="${p >= 80 ? 'hi' : p < 50 ? 'lo' : ''}" style="width:${p}%"></i></div><b>${sk[k][0]}/${sk[k][1]}</b></div>`; }).join('');
const qScreen = (kind, q, i, n, S) => `<div class="qn">الاختبار ${kind === 'pre' ? 'القبلي' : 'البعدي'} — السؤال ${i + 1} من ${n}</div><div class="q"><div class="qt">${esc(q.q)}</div>${q.o.map((o, j) => `<label class="opt big"><input type="radio" name="q_${kind}_${i}" data-qk="${kind}:${i}" value="${j}" ${S.ans[i] === j ? 'checked' : ''}><span>${'أبجد'[j]}) ${esc(o)}</span></label>`).join('')}</div>`;
const essayScreen = (e, S) => `<div class="qn">الجزء (ب): الأسئلة المقالية</div><div class="q"><div class="qt">س${e.n}: ${esc(e.t)}</div><textarea data-ess="${e.id}" placeholder="اكتب إجابتك هنا…" style="min-height:150px">${esc(S.ess[e.id] || '')}</textarea><div class="words">استعن بالمصادر المذكورة في النص واكتب بأسلوبك</div></div>`;
function reviewOne(q, a, i) { return `<div class="qn">مراجعة السؤال ${i + 1}</div><div class="q ${a.ans[i] === q.a ? 'right' : 'wrong'}"><div class="qt">${esc(q.q)} ${a.ans[i] === q.a ? '<span class="ok">✔</span>' : '<span class="bad">✘</span>'}</div>${q.o.map((o, j) => `<div class="opt ${j === q.a ? 'isans' : ''} ${j === a.ans[i] && j !== q.a ? 'mine no' : ''}">${'أبجد'[j]}) ${esc(o)}${j === q.a ? ' ✔ الإجابة الصحيحة' : ''}${j === a.ans[i] && j !== q.a ? ' ← إجابتك' : ''}</div>`).join('')}${a.ans[i] === -1 ? '<div class="bad">لم تجب عن هذا السؤال</div>' : ''}</div>`; }
function quizScreens(kind, st) {
  const isPre = kind === 'pre', L = isPre ? PRE : POST, S = QZ[kind] || { mode: 'intro' }, att = isPre ? st.pre : st.post;
  if (S.mode === 'intro') {
    const best = isPre ? bestPre(st) : postBest(st);
    return [`<div class="card info"><h2 style="border:0">${isPre ? 'سادسًا: الاختبار القبلي' : 'تاسعًا: الاختبار البعدي'} 📝</h2><ul class="big">
      ${isPre ? '<li>10 أسئلة اختيار من متعدد، لكل سؤال درجة واحدة (المجموع 10). الزمن المقترح 20 دقيقة.</li><li>الاختبار تشخيصي؛ أجب بأمانة ودون الرجوع إلى أي مصدر.</li><li>إذا حصلت على 8 درجات فأكثر (80%) يمكنك بعد موافقة أستاذ المقرر الانتقال إلى الموديول الثاني، وإلا فابدأ دراسة الموديول.</li>' : `<li>جزءان: (أ) 6 أسئلة اختيار من متعدد لكل منها درجة، و(ب) 3 أسئلة مقالية (4 درجات). المجموع 10 درجات. الزمن المقترح 30 دقيقة.</li><li>مستوى الإتقان للانتقال إلى الموديول الثاني: ${DB.settings.mastery}%.</li><li>يصحح أستاذ المقرر الأسئلة المقالية وفق قائمة تقدير: وضوح الفكرة، والاستشهاد بالمصدر، وسلامة التفسير.</li>`}
      <li>يُعرض <b>سؤال واحد في كل شاشة</b>، وتستطيع الرجوع لتعديل إجابتك قبل الإرسال.</li></ul>
      ${!isPre && !stageDone(st, 's5') ? '<div class="card warn">تنبيه: لم تُكمل مراحل ابتكر وناقش وتأمل بعد؛ يُفضّل إتمامها قبل الاختبار البعدي.</div>' : ''}
      ${att.length ? `<div class="card ok">محاولاتك السابقة: ${att.length}${best != null ? ` · أفضل ${isPre ? 'درجة' : 'درجة نهائية'}: <b>${best}/10</b>` : ' · المقالي بانتظار تصحيح الأستاذ'}</div>` : ''}
      <div class="tools" style="justify-content:center"><button class="btn green" data-do="qstart" data-k="${kind}">▶ ${att.length ? 'ابدأ محاولة جديدة' : 'ابدأ الاختبار'}</button>${att.length ? `<button class="btn ghost" data-do="qlast" data-k="${kind}">عرض آخر نتيجة</button>` : ''}</div></div>`];
  }
  if (S.mode === 'take') {
    const scr = L.map((q, i) => qScreen(kind, q, i, L.length, S));
    if (!isPre) ESSAYS.forEach(e => scr.push(essayScreen(e, S)));
    const un = L.filter((q, i) => S.ans[i] == null || S.ans[i] < 0).length + (isPre ? 0 : ESSAYS.filter(e => !(S.ess[e.id] || '').trim()).length);
    scr.push({ nonext: true, h: `<div class="card center big"><h2 style="border:0">إرسال الاختبار</h2>${un ? `<div class="card warn">لديك <b>${un}</b> ${un > 1 ? 'أسئلة' : 'سؤال'} بلا إجابة. ارجع بزر «السابق» لإكمالها، أو أرسل كما هو.</div>` : '<div class="card ok">أجبت عن جميع الأسئلة ✔</div>'}<p>بعد الإرسال لن تستطيع تعديل هذه المحاولة، وستُرصد في سجل المتابعة.</p><button class="btn green" data-do="qsubmit" data-k="${kind}">✅ إرسال الاختبار</button></div>` });
    return scr;
  }
  const a = S.a;
  return [isPre ? resultPre(a) : resultPost(st, a), ...L.map((q, i) => reviewOne(q, a, i))];
}
function resultPre(a) {
  const pct = a.score * 10, ok = pct >= DB.settings.mastery;
  return `<div class="card ${ok ? 'ok' : 'tip'}"><h2 style="border:0">نتيجتك في الاختبار القبلي: ${a.score} / 10 (${pct}%)</h2>
   <p class="big">${ok ? '🎉 حققت مستوى الإتقان. يمكنك – بعد موافقة أستاذ المقرر – الانتقال مباشرة إلى الموديول الثاني، أو دراسة هذا الموديول للتعمق.' : 'لم تبلغ مستوى الإتقان بعد، وهذا طبيعي في الاختبار التشخيصي. ابدأ الآن دراسة مراحل الاستقصاء الخمس بالترتيب.'}</p>${skillBars(a.skills)}
   <div class="tools"><a class="btn gold" href="#/s/media/0">ابدأ الدراسة ←</a><button class="btn ghost" data-do="qagain" data-k="pre">إعادة الاختبار</button></div><div class="cap">تابع بزر «التالي» لمراجعة إجاباتك سؤالًا سؤالًا.</div></div>`;
}
function resultPost(st, a) {
  return `<div class="card tip"><h2 style="border:0">تم إرسال اختبارك البعدي ✔</h2><p class="big">درجة الجزء الاختياري: <b>${a.mcq} / 6</b>. أما الأسئلة المقالية (4 درجات) فسيصححها أستاذ المقرر، وتظهر درجتك النهائية في «سجل المتابعة».</p>${skillBars(a.skills)}
   <div class="tools"><a class="btn gold" href="#/s/fb/0">التغذية الراجعة والمسار العلاجي ←</a><a class="btn ghost" href="#/s/log/0">سجل المتابعة</a></div><div class="cap">تابع بزر «التالي» لمراجعة الجزء (أ) سؤالًا سؤالًا.</div></div>`;
}
SCR.pre = st => quizScreens('pre', st);
SCR.post = st => quizScreens('post', st);

/* ---------- 7) الوسائط (3 شاشات) ---------- */
const MEDIA = [['📜 النصوص التاريخية (أ، ب، ج)', 'نصوص مبسطة مقتبسة بتصرف من المصادر التاريخية مع توثيقها', 'اقرأها بتمعن، وركز على العبارات المظللة فهي مفاتيح الأدلة', 's2/2'],
  ['🗺️ المثير البصري والخريطة', 'خريطة توضح مواقع القوى المتنافسة على مصر سنة 564هـ', 'حدد العلاقات بين القوى قبل أن تطرح أسئلتك', 's1/3'],
  ['🎧 البودكاست التعليمي', 'حلقة صوتية عن سقوط الخلافة الفاطمية وتولي صلاح الدين الحكم', 'استمع وسجل الأدلة التي تدعم حجتك أو تنقضها', 's2/13'],
  ['⏳ الخط الزمني وخريطة الأسباب', 'رسوم تخطيطية للأحداث وعلاقاتها السببية', 'استخدمها في نشاطي الترتيب الزمني والربط السببي', 's2/9'],
  ['🎮 نشاط الربط التفاعلي', 'نشاط تفاعلي لربط الأحداث بأسبابها ونتائجها', 'كرر المحاولة حتى تصل إلى الإجابة الصحيحة', 's2/12'],
  ['🃏 بطاقات المصادر', 'تصنيف المصادر التاريخية حسب قربها من الحدث (الشكل 4)', 'راجعها قبل نشاط تصنيف المصادر وقبل الاختبار البعدي', 's2/0'],
  ['💬 منتدى النقاش', 'حائط نقاش لقضية «التاريخ المغاير»', 'شارك برأيك مدعمًا بالأدلة وعقّب على زملائك', 's4/5'],
  ['📓 مفكرة التأمل الإلكترونية', 'مساحة خاصة لتسجيل تأملاتك', 'دوّن ما تعلمته وكيف فكرت وما ستحسّنه', 's5/1'],
  ['📘 كتاب المقرر', 'تاريخ الأيوبيين والمماليك', 'ارجع إليه للتوسع ولتوثيق المعلومات', 'gloss/4']];
SCR.media = st => [0, 3, 6].map((s, k) => `<h2>سابعًا: الوسائط ومصادر التعلم (${k + 1}/3)</h2>${k === 0 ? '<p>يقدم لك الموديول المحتوى نفسه عبر وسائط متعددة؛ فاختر ما يناسب أسلوب تعلمك:</p>' : ''}${T(['الوسيط', 'وصفه', 'كيف تستفيد منه؟', ''], MEDIA.slice(s, s + 3).map(r => [`<b>${r[0]}</b>`, r[1], r[2], `<a class="btn sm" href="#/s/${r[3]}">افتح</a>`]))}`);

/* ---------- محرك الأنشطة ---------- */
function actHTML(id) {
  const A = ACTS[id];
  const fieldHTML = (f, i) => {
    const nm = `${id}_${i}_${f.k}`;
    if (f.type === 'radio') return f.opts.map(o => `<label class="opt" style="display:inline-flex;padding:.1em .4em"><input type="radio" name="${nm}" value="${o[0]}"><span>${o[1]}</span></label>`).join('');
    if (f.type === 'select') return `<select name="${nm}">${f.opts.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>`;
    return `<input type="text" name="${nm}" autocomplete="off">`;
  };
  const rows = A.rows.map((r, i) => `<tr data-i="${i}"><td>${i + 1}</td><td>${esc(r[0])}</td>${A.build(r).map(f => `<td data-f="${f.k}">${fieldHTML(f, i)}</td>`).join('')}</tr>`).join('');
  const opts = A.options ? `<div class="card info" style="padding:6px 12px;font-size:.92em"><b>الخيارات:</b> ${A.options.map(esc).join(' &nbsp;·&nbsp; ')}</div>` : '';
  return `<div data-act="${id}"><h2>🔍 ${A.title} <small style="font-size:.6em">⏱️ ${A.time} دقائق</small></h2><div>${A.desc}</div>${opts}
   <div class="tblwrap"><table><tr>${A.head.map(h => `<th>${h}</th>`).join('')}</tr>${rows}</table></div>
   <div class="tools"><button class="btn green actcheck">✅ تحقق من إجابتي</button><button class="btn ghost actreset">إعادة المحاولة</button></div><div class="actres"></div></div>`;
}
function readAct(id) {
  const A = ACTS[id], o = {};
  A.rows.forEach((r, i) => A.build(r).forEach(f => {
    const nm = `${id}_${i}_${f.k}`;
    if (f.type === 'radio') { const c = $(`input[name="${nm}"]:checked`); o[i + '_' + f.k] = c ? c.value : ''; } else { const e = $(`[name="${nm}"]`); o[i + '_' + f.k] = e ? e.value.trim() : ''; }
  }));
  return o;
}
function gradeAct(id, ans) {
  const A = ACTS[id]; let score = 0, max = 0; const det = {};
  A.rows.forEach((r, i) => {
    const gf = A.build(r).filter(f => f.ans != null && f.ans !== '');
    if (A.mode === 'field') gf.forEach(f => { max++; const ok = ans[i + '_' + f.k] === String(f.ans); det[i + '_' + f.k] = ok; if (ok) score++; });
    else if (gf.length) { max++; const oks = gf.map(f => ans[i + '_' + f.k] === String(f.ans)); gf.forEach((f, k) => det[i + '_' + f.k] = oks[k]); if (oks.every(Boolean)) score++; }
  });
  return { score, max, det };
}
function showAct(id, ans, g) {
  const A = ACTS[id], card = $(`[data-act="${id}"]`);
  A.rows.forEach((r, i) => A.build(r).forEach(f => {
    const nm = `${id}_${i}_${f.k}`, v = ans[i + '_' + f.k], td = card.querySelector(`tr[data-i="${i}"] td[data-f="${f.k}"]`);
    if (v != null) { if (f.type === 'radio') { const c = card.querySelector(`input[name="${nm}"][value="${v}"]`); if (c) c.checked = true; } else { const e = card.querySelector(`[name="${nm}"]`); if (e) e.value = v; } }
    if (!td) return;
    td.classList.remove('good', 'badc'); $$('small.key', td).forEach(x => x.remove());
    if (f.ans != null && f.ans !== '') {
      const ok = g.det[i + '_' + f.k]; td.classList.add(ok ? 'good' : 'badc');
      if (!ok) { const lab = f.opts.find(o => String(o[0]) === String(f.ans)); td.insertAdjacentHTML('beforeend', `<small class="key">الصحيح: ${esc(lab ? lab[1] : f.ans)}</small>`); }
    } else if (f.type === 'text' && f.hint) td.insertAdjacentHTML('beforeend', `<small class="key">المفتاح: ${esc(f.hint)}</small>`);
  }));
  const pct = g.max ? Math.round(g.score / g.max * 100) : 0;
  $('.actres', card).innerHTML = `<div class="card ${pct >= 80 ? 'ok' : 'tip'}" style="padding:6px 14px"><b>نتيجتك: ${g.score} / ${g.max}</b> ${pct >= 80 ? '🎉 ممتاز!' : '— راجع الإجابات الملونة وأعد المحاولة.'}${A.note ? `<br><small>${A.note}</small>` : ''}</div>`;
  fit();
}
function wireActs(st) {
  $$('[data-act]').forEach(card => {
    const id = card.dataset.act, rec = st.acts[id];
    if (rec) showAct(id, rec.ans, gradeAct(id, rec.ans));
    $('.actcheck', card).onclick = () => {
      const ans = readAct(id), g = gradeAct(id, ans), A = ACTS[id];
      if (A.rows.some((r, i) => A.build(r).some(f => f.ans != null && f.ans !== '' && !ans[i + '_' + f.k]))) return toast('أجب عن جميع البنود أولًا ثم اضغط «تحقق»');
      const old = st.acts[id];
      st.acts[id] = { ans, score: g.score, max: g.max, at: Date.now(), tries: (old ? old.tries : 0) + 1, best: Math.max(g.score, old ? old.best : 0) };
      log(st, `نشاط ${A.n}: ${g.score}/${g.max} (المحاولة ${st.acts[id].tries})`); save(); showAct(id, ans, g);
    };
    $('.actreset', card).onclick = () => {
      $$('input[type=radio]', card).forEach(x => x.checked = false); $$('select', card).forEach(x => x.value = ''); $$('input[type=text]', card).forEach(x => x.value = '');
      $$('td', card).forEach(td => td.classList.remove('good', 'badc')); $$('small.key', card).forEach(x => x.remove()); $('.actres', card).innerHTML = ''; fit();
    };
  });
}

/* ---------- ربط عناصر الشاشة ---------- */
function wireScreen(st) {
  $$('[data-t]').forEach(el => {
    el.value = st.texts[el.dataset.t] || '';
    el.addEventListener('change', () => { st.texts[el.dataset.t] = el.value; save(); });
    el.addEventListener('input', () => { const w = $('#wc_' + el.dataset.t); if (w) w.textContent = words(el.value) + ' كلمة'; });
    el.dispatchEvent(new Event('input'));
  });
  $$('.savetxt').forEach(b => b.onclick = () => { $$('[data-t]').forEach(el => st.texts[el.dataset.t] = el.value); log(st, 'حفظ إجابات'); save(); toast('تم الحفظ في سجلك ✔'); });
  $$('[data-r]').forEach(r => { const v = st.texts[r.dataset.r]; if (v != null && r.value === v) r.checked = true; r.onchange = () => { st.texts[r.dataset.r] = r.value; save(); }; });
  wireActs(st);
}
document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.qk) { const [k, i] = t.dataset.qk.split(':'); QZ[k].ans[+i] = +t.value; } });
document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.ess && QZ.post) QZ.post.ess[t.dataset.ess] = t.value; if (t.id === 'newpost') { const w = $('#npw'); if (w) w.textContent = words(t.value) + ' كلمة'; } });
const FI = { i: 0 };
const DO = {
  qstart(b) { QZ[b.dataset.k] = { mode: 'take', ans: [], ess: {}, t0: Date.now() }; goto(b.dataset.k, 0); },
  qlast(b) { const st = me(), k = b.dataset.k, a = (k === 'pre' ? st.pre : st.post).slice(-1)[0]; QZ[k] = { mode: 'result', a }; goto(k, 0); },
  qagain(b) { QZ[b.dataset.k] = null; goto(b.dataset.k, 0); },
  qsubmit(b) {
    const st = me(), k = b.dataset.k, S = QZ[k], L = k === 'pre' ? PRE : POST;
    const ans = L.map((q, i) => S.ans[i] == null ? -1 : S.ans[i]);
    if (!confirm('هل أنت متأكد من إرسال الاختبار؟ سيُرصد في سجلك.')) return;
    const r = scoreList(L, ans), secs = Math.round((Date.now() - S.t0) / 1000);
    let a;
    if (k === 'pre') { a = { at: Date.now(), score: r.score, ans, skills: r.skills, secs }; st.pre.push(a); log(st, `اختبار قبلي: ${a.score}/10`); }
    else { const es = {}; ESSAYS.forEach(e => es[e.id] = (S.ess[e.id] || '').trim()); a = { at: Date.now(), mcq: r.score, ans, skills: r.skills, essays: es, grades: null, secs }; st.post.push(a); log(st, `اختبار بعدي: الاختياري ${a.mcq}/6 (المقالي بانتظار التصحيح)`); }
    save(); QZ[k] = { mode: 'result', a }; goto(k, 0);
  },
  fprev() { FI.i--; render(); }, fnext() { FI.i++; render(); },
  sendpost() {
    const st = me(), t = $('#newpost').value.trim(); if (words(t) < 10) return toast('اكتب مداخلة لا تقل عن 10 كلمات');
    DB.forum.push({ id: 'p' + Date.now(), sid: st.user, name: st.name, text: t, at: Date.now() }); log(st, 'مداخلة رئيسة في المنتدى'); save(); toast('تم النشر ✔'); FI.i = 0; goto('s4', 5);
  },
  reply(b) {
    const par = b.closest('.tools'); if (par.nextElementSibling && par.nextElementSibling.classList.contains('rbox')) return;
    par.insertAdjacentHTML('afterend', `<div class="rbox"><textarea placeholder="اكتب تعقيبك (تأييدًا أو تفنيدًا بالدليل)…" style="min-height:60px"></textarea><button class="btn sm green" data-do="sendreply" data-p="${b.dataset.p}">إرسال التعقيب</button></div>`); fit();
  },
  sendreply(b) {
    const st = me(), t = $('textarea', b.parentElement).value.trim(); if (words(t) < 5) return toast('اكتب تعقيبًا لا يقل عن 5 كلمات');
    DB.forum.push({ id: 'r' + Date.now(), parent: b.dataset.p, sid: st.user, name: st.name, text: t, at: Date.now() }); log(st, 'تعقيب في المنتدى'); save(); toast('تم التعقيب ✔'); render();
  },
  fbagain() { QZ.post = null; goto('post', 0); }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-do]'); if (b && DO[b.dataset.do]) { e.preventDefault(); DO[b.dataset.do](b); } });

/* ---------- المراحل ---------- */
const SRCDOC = {
  A: { t: '📜 المصدر (أ): ظروف تولية صلاح الدين الوزارة الفاطمية سنة 564هـ', b: '«عندما توفي الوزير أسد الدين شيركوه بمصر سنة 564هـ، اختلف أمراء الجند الشامي فيمن يتولى مكانه، فاستغل الخليفة الفاطمي العاضد هذا الانقسام، وقرر اختيار صلاح الدين يوسف بن أيوب وزيرًا له، ولقبه بـ(الملك الناصر). وكان سبب اختيار العاضد له <mark>ظنَّه أن صلاح الدين – لحداثة سنه وقلة تجربته السياسية وخبرته بالبلاد – سيكون طوع بنانه سهلًا في قيادته وتوجيهه</mark>، مما يتيح للخليفة الفاطمي استعادة السيطرة الفعلية على أمور الدولة التي سلبها منه الوزراء السابقون».', s: 'مصادر أصيلة متأخرة (غير معاصرة للحدث): المقريزي (ت 845هـ)، السلوك لمعرفة دول الملوك، ج1، ص459؛ ابن تغري بردي (ت 874هـ)، النجوم الزاهرة في ملوك مصر والقاهرة، ج7، ص22. المرجع الثانوي المقرر: تاريخ الأيوبيين والمماليك، ص72. (النص مبسط ومصاغ بتصرف لأغراض تعليمية).' },
  B: { t: '📜 المصدر (ب): سياسة صلاح الدين الفكرية وإلغاء الخلافة الفاطمية سنة 567هـ', b: '«لما تمكن صلاح الدين في منصب الوزارة شرع بهدوء وتدرج بحكمة في تغيير هوية مصر المذهبية وتفكيك جبهة الفاطميين؛ <mark>فبدأ بإنشاء المدارس الفقهية السنية لتدريس الفقه الشافعي والمالكي (مثل المدرسة الناصرية والمدرسة القمحية بمصر)</mark> لتربية جيل جديد يدين بالولاء للسنة. وعندما وثق بقوته، وضعف الخليفة العاضد بمرضه الأخير، <mark>أمر الخطباء في خطبة الجمعة بقطع ذكر الخليفة الفاطمي، والدعاء للخليفة العباسي المستضيء بأمر الله في بغداد</mark>، معلنًا نهاية الدولة الفاطمية رسميًا دون مقاومة شعبية تُذكر».', s: 'مصادر أصيلة متأخرة: المقريزي، المواعظ والاعتبار بذكر الخطط والآثار (الخطط)، ج2، ص218؛ السيوطي (ت 911هـ)، حسن المحاضرة في أخبار مصر والقاهرة، ج1، ص78. (النص مبسط ومصاغ بتصرف).' },
  C: { t: '📜 المصدر (ج): رواية مؤرخ عاش في تلك الحقبة', b: 'يروي ابن الأثير أن بعض خاصة العاضد أشاروا عليه باختيار صلاح الدين؛ <mark>لأنه أصغر الأمراء سنًا وأضعفهم في نظرهم، فلا يُخشى جانبه</mark>، وأن أمراء الجند النوري لم يُجمعوا عليه في البداية، حتى سعى الفقيه عيسى الهكاري في استمالتهم إلى طاعته، وامتنع بعضهم فعاد إلى الشام.', s: 'مصدر أولي قريب من الحدث: ابن الأثير (ت 630هـ)، الكامل في التاريخ، حوادث سنة 564هـ. (النص ملخص بتصرف لأغراض تعليمية).' }
};
const srcScreen = k => `<h2 style="font-size:1.4rem">${SRCDOC[k].t}</h2><blockquote class="big">${SRCDOC[k].b}</blockquote><div class="src"><b>توثيق المصدر:</b> ${SRCDOC[k].s}</div>`;

SCR.s1 = st => [
  `<h2>ثامنًا: مسار الاستقصاء</h2>${img(3, 'شكل (2): دورة الاستقصاء التاريخي في الموديول')}`,
  `<h2>مراحل الاستقصاء ودورك في كل مرحلة</h2>${T(['المرحلة', 'دورك فيها', 'ناتج تعلمك', 'الزمن'], [['1- اسأل', 'تتأمل المثير البصري وتطرح أسئلة استقصائية', 'قائمة أسئلتك + النشاط الذاتي (1)', '45 دقيقة'], ['2- استقصِ', 'تحلل المصادر وتنقدها وتستخلص الأدلة وترتب الأحداث', 'الأنشطة الذاتية (2) إلى (6)', '120 دقيقة'], ['3- ابتكر', 'تبني حجة تاريخية مكتوبة مدعمة بالأدلة', 'فقرة الحجة + قائمة التقدير الذاتي', '45 دقيقة'], ['4- ناقش', 'تحاور زملاءك وتفند الآراء المخالفة', 'مداخلة رئيسة وتعقيبان في المنتدى', '45 دقيقة'], ['5- تأمل', 'تراجع طريقة تفكيرك وتقيّم تعلمك', 'مذكرة التأمل + مقياس التقدير الذاتي', '20 دقيقة']])}`,
  `${stageStrip('s1')}<h2>المرحلة الأولى: اسأل (Ask) – لغز الوزارة الغامض</h2> ${doneP(st, 's1')}<div class="card"><h3>📖 خلفية تاريخية موجزة</h3><p>بحلول منتصف القرن السادس الهجري كانت الخلافة الفاطمية في مصر قد فقدت كثيرًا من قوتها؛ فقد تولى الخلافةَ خلفاءُ صغار السن أو ضعاف، وانتقلت السلطة الفعلية إلى الوزراء الذين تصارعوا على المنصب بالسلاح. وفي خضم هذا الصراع لجأ الوزير المعزول شاور إلى نور الدين محمود زنكي صاحب دمشق مستنجدًا به، ثم انقلب عليه وتحالف مع الصليبيين في بيت المقدس، فغدت مصر ساحة تنافس مفتوحة بين الطرفين.</p><p>أرسل نور الدين قائده أسد الدين شيركوه ومعه ابن أخيه صلاح الدين يوسف بن أيوب في ثلاث حملات إلى مصر (559هـ، 562هـ، 564هـ). وانتهت الحملة الثالثة بمقتل شاور وتولي شيركوه الوزارة للخليفة العاضد لدين الله، غير أن شيركوه توفي بعد نحو شهرين فقط، فخلا منصب الوزارة من جديد… وهنا يبدأ لغزنا.</p></div>`,
  `<h3>🗺️ تأمل المثير البصري</h3><div>على اليمين خريطة توضح مواقع القوى المتنافسة على مصر سنة 564هـ، وعلى اليسار رسم توضيحي لمرسوم تقليد الوزارة. لاحظ موقع كل قوة، ومن يحيط بمصر، ومن له مصلحة في السيطرة عليها.</div>${img(4, 'شكل (3): المثير البصري – القوى المتنافسة على مصر ومرسوم تقليد الوزارة (رسم تعليمي)')}`,
  `<div class="card tip big"><h2 style="border:0">❓ السؤال الاستكشافي للتقصي</h2><b>كيف استطاع خليفة شيعي إسماعيلي (العاضد الفاطمي) أن يأتمن قائدًا سنيًا شابًا (صلاح الدين الأيوبي) على منصب الوزارة وقيادة الجيش في مصر؟ وكيف تحول هذا الشاب من وزير في خدمة الخلافة الفاطمية إلى من أنهى وجودها بهدوء، ودون ثورة شعبية تُذكر عند إعلان ذلك؟</b></div>`,
  `<div class="card"><h2>✍️ سجل تساؤلاتك الذاتية</h2><p>اكتب ثلاثة أسئلة استكشافية خطرت لك حول هذا الحدث قبل الانتقال لتحليل المصادر:</p>${[1, 2, 3].map(i => `<label>${i}-</label>${inputField('q' + i, 'سؤالك الاستقصائي ' + i)}`).join('')}<div class="tools">${saveBtn('حفظ أسئلتي')}</div></div>`,
  `<h2>💡 كيف تفكر كالمؤرخ؟ (مهارة طرح الأسئلة)</h2><p>ابحث عن التناقض الكامن في المشهد، وصغ أسئلتك لتستكشف الدوافع العميقة غير المصرح بها. والسؤال الاستقصائي سؤال مفتوح لا يُجاب عنه بكلمة أو تاريخ، بل يحتاج إلى أدلة وتفسير.</p>${T(['نوع السؤال', 'أداته', 'مثال من الموديول'], [['سببي (الدوافع)', 'لماذا؟ / ما الدافع؟', 'ما الدافع الخفي وراء اختيار صلاح الدين وزيرًا دون غيره من أمراء الشام الأقدم سنًا؟'], ['مقارن', 'ما أوجه الشبه والاختلاف؟', 'ما أوجه الشبه والاختلاف بين أهداف مدارس نور الدين في الشام ومدارس صلاح الدين في مصر؟'], ['افتراضي (تاريخ مغاير)', 'ماذا لو…؟', 'ماذا لو نجح العاضد في إبقاء صلاح الدين أداة طيعة في يد القصر الفاطمي؟'], ['تقييمي', 'إلى أي مدى…؟', 'إلى أي مدى كان سقوط الفاطميين نتيجة لقوة صلاح الدين أم لضعف الدولة من الداخل؟']])}`,
  `<div class="card"><h2>أكمل الأسئلة التالية بصياغتك</h2><p>لتنمي هذه المهارة لديك:</p><div class="big">1- لماذا غامر الخليفة العاضد بـ ${inputField('c1', '…')}</div><div class="big">2- كيف اختلف موقف صلاح الدين المعلن عن ${inputField('c2', '…')}</div><div class="big">3- ماذا لو ${inputField('c3', '…')}</div><div class="tools">${saveBtn()}</div></div>`,
  actHTML('a1'),
  `<div class="card"><h2>حوّل السؤالين الوصفيين (1 و4) إلى سؤالين استقصائيين</h2>${textField('a1x', 'اكتب السؤالين الاستقصائيين الجديدين', 120)}<div class="tools">${saveBtn()}</div><small>مثال: «لماذا شكلت وفاة شيركوه سنة 564هـ فرصة للخليفة العاضد لاستعادة نفوذه؟» و«لماذا اختار صلاح الدين الخطبة للخليفة العباسي بدلًا من إعلان استقلاله بمصر؟»</small></div>`
];

SCR.s2 = st => [
  `${stageStrip('s2')}<h2>المرحلة الثانية: استقصِ (Investigate)</h2> ${doneP(st, 's2')}<div>تفاعل مع النصوص التاريخية، وركز على العبارات المظللة؛ فهي مفاتيح الإجابة. لكن قبل أن تقرأ، تعرّف كيف يزن المؤرخ مصادره: ⚖️ ميزان المؤرخ</div>${img(5, 'شكل (4): تصنيف المصادر التاريخية لموضوع الموديول حسب قربها من زمن الحدث')}`,
  `<div class="card tip big"><h2 style="border:0">💡 تلميح المؤرخ: انتبه للفارق الزمني!</h2>عاش المقريزي (ت 845هـ) وابن تغري بردي (ت 874هـ) والسيوطي (ت 911هـ) بعد سقوط الفاطميين بنحو ثلاثة قرون أو أكثر؛ فهم مؤرخون أصلاء لكنهم ليسوا شهود عيان، وقد نقلوا عمن سبقهم. أما القاضي الفاضل (كاتب صلاح الدين) وابن شداد (قاضي عسكره) والعماد الأصفهاني (كاتبه) فقد عاصروا الأحداث وشاركوا في صنعها، ولذلك تكون شهادتهم أقرب، لكنها قد تكون أكثر انحيازًا لصلاح الدين. فلا قرب الزمن وحده يضمن الموضوعية، ولا بُعده يلغي القيمة.</div>`,
  srcScreen('A'), srcScreen('B'), srcScreen('C'),
  `<h2>🔬 دليلك لنقد المصادر: النقد الخارجي والداخلي</h2><p>قبل أن تعتمد على أي نص دليلًا، اطرح عليه الأسئلة التالية، ثم طبقها على المصدر (أ):</p>
   ${T(['نوع النقد', 'السؤال الذي يطرحه المؤرخ', 'تطبيقك على المصدر (أ)'], [['النقد الخارجي (نقد السند)', 'من المؤلف؟ ومتى عاش؟ وهل عاصر الحدث أم نقل عن غيره؟ وهل يصح نسبة النص إليه؟', textField('crit1', 'اكتب تطبيقك…', 48)], ['النقد الداخلي (نقد المتن)', 'هل تتسق معلومات النص مع المصادر الأخرى (مثل المصدر ج)؟ وهل في لغته مبالغة أو أحكام مذهبية وسياسية؟ وما مصلحة الكاتب؟', textField('crit2', 'اكتب تطبيقك…', 48)], ['الحكم النهائي', 'إلى أي حد يمكن الوثوق بهذا النص؟ ولماذا؟', textField('crit3', 'اكتب حكمك…', 48)]])}<div class="tools">${saveBtn()}</div>`,
  `<div class="card tip big"><h2 style="border:0">💡 تلميح المؤرخ: احذر التحيز المذهبي</h2>كتب معظم من أرّخوا لسقوط الفاطميين في ظل دول سنية، فقد تحمل رواياتهم أحكامًا قاسية على الفاطميين أو مديحًا مبالغًا فيه لصلاح الدين. وفي المقابل يُذكر أن المقريزي كان ينتسب إلى الفاطميين وألّف عنهم كتابًا مستقلًا (اتعاظ الحنفا)، فهل يمكن أن يؤثر ذلك في روايته؟ افصل دائمًا بين الواقعة (ماذا حدث؟) والحكم عليها (هل كان خيرًا أم شرًا؟).</div>`,
  actHTML('a2'), actHTML('a3'),
  `<h2>⏳ الخط الزمني للأحداث</h2>${img(6, 'شكل (5): الخط الزمني لصعود صلاح الدين وسقوط الخلافة الفاطمية (يُقرأ من اليمين إلى اليسار)')}`,
  actHTML('a4'),
  `<h2>🔗 خريطة الأسباب والنتائج</h2>${img(7, 'شكل (6): خريطة الأسباب العميقة والمباشرة ونتائجها التاريخية')}`,
  actHTML('a5'),
  `<div class="card"><h2>🎧 البودكاست التعليمي</h2><p>استمع إلى حلقة البودكاست عن سقوط الخلافة الفاطمية وتولي صلاح الدين الحكم، وسجّل أثناء الاستماع دليلين يدعمان فكرة «التحول التدريجي المخطط»:</p>
   <p>${DB.settings.podcast ? `<a class="btn gold" target="_blank" rel="noopener" href="${esc(DB.settings.podcast)}">🎧 افتح حلقة البودكاست</a>` : '<span class="pill y">لم يضع الأستاذ رابط البودكاست بعد (من لوحة الأستاذ ← الإعدادات)</span>'}</p>
   <label>الدليل الأول:</label>${inputField('pod1', '')}<label>الدليل الثاني:</label>${inputField('pod2', '')}<div class="tools">${saveBtn()}</div></div>`,
  `<h2>🔄 ما الذي تغير؟ وما الذي استمر؟</h2><div>لا يعني سقوط الدولة أن كل شيء فيها قد زال؛ فالمؤرخ الحصيف يرصد التغير والاستمرارية معًا. فقد تغيرت الخطبة والمذهب الرسمي للقضاء والتعليم، لكن جهاز الإدارة الفاطمي – بدواوينه وأعرافه وكثير من موظفيه – استمر في العمل. ومن أبرز الأمثلة القاضي الفاضل عبد الرحيم البيساني، الذي عمل في ديوان الإنشاء الفاطمي، ثم صار كاتب صلاح الدين وموضع ثقته.</div>${img(8, 'شكل (7): التغير والاستمرارية في مصر بين 564هـ و567هـ')}`,
  actHTML('a6')
];

SCR.s3 = st => [
  `${stageStrip('s3')}<h2>المرحلة الثالثة: ابتكر (Create)</h2> ${doneP(st, 's3')}<div class="card tip big"><h3>🎯 المهمة الاستقصائية المطلوبة ⏱️ 45 دقيقة</h3>اكتب فقرة متماسكة علميًا (من 100 إلى 120 كلمة) تشرح فيها: <b>كيف تسبب تقدير الخليفة العاضد الخاطئ في سقوط خلافته بالكامل؟ وكيف نجح صلاح الدين في توظيف المدارس الفقهية لإحداث هذا التغيير المصيري دون صدام واسع مع المجتمع؟</b></div>`,
  `<h2>🧱 كيف تبني حجة تاريخية؟</h2>${T(['مكون الحجة', 'معناه', 'مثال من الموديول'], [['الادعاء', 'الفكرة الرئيسة التي تدافع عنها', 'سقوط الفاطميين كان تحولًا مخططًا لا ضربة مفاجئة'], ['الدليل', 'شاهد من مصدر موثق', 'إنشاء المدرستين الناصرية والقمحية – المصدر (ب)'], ['التفسير', 'كيف يدعم الدليلُ الادعاءَ؟', 'المدارس هيأت جيلًا جديدًا يقبل التحول المذهبي'], ['التفنيد', 'الرد على رأي مخالف بالأدلة', 'الرد على من يرى أن السيف وحده أسقط الدولة'], ['الخاتمة', 'إعادة تأكيد الادعاء بعد إثباته', 'إذن كان صعود الأيوبيين ثمرة تخطيط تراكمي']])}`,
  `<h2>✍️ المحفز الكتابي لحجتك (للتدريب)</h2><p>لا تقلق إذا شعرت بصعوبة في صياغة الحجة؛ املأ الفراغات مستعينًا بشواهد المصادر (أ) و(ب) و(ج) والبودكاست:</p><blockquote class="big">«يتضح لي من خلال التقصي أن الخليفة العاضد ارتكب خطأً فادحًا في تعيين ………………… وزيرًا؛ لأنه ظن أنه سيكون ……………………………… استنادًا إلى المصدر (أ). ولكن هذا الوزير أظهر ذكاءً سياسيًا واستراتيجيًا لافتًا؛ إذ فكك الدولة الفاطمية بهدوء عبر سلاح التعليم وبناء مدارس فقهية مثل ……………………… و……………………… استنادًا إلى المصدر (ب). وقد مهّد هذا التحول التدريجي لإلغاء الخلافة رسميًا باستغلال ……………………………… والدعاء للخليفة ……………………………، مما يثبت أن صعود الأيوبيين كان تحولًا مخططًا ومنظمًا وليس وليد الصدفة».</blockquote>`,
  `<div class="card"><h2>اكتب حجتك بأسلوبك الخاص</h2>${textField('argument', 'اكتب فقرة الحجة (100 – 120 كلمة)…', 220)}<div class="words" id="wc_argument">0 كلمة</div><div class="tools">${saveBtn('حفظ الحجة')}</div></div>`,
  `<h2>✅ قائمة التقدير الذاتي لحجتك</h2><p>قيّم حجتك بنفسك قبل تسليمها:</p><div class="tblwrap"><table><tr><th>م</th><th>معيار التقدير</th><th>متحقق</th><th>جزئيًا</th><th>غير متحقق</th></tr>${CRIT.map((c, i) => `<tr><td>${i + 1}</td><td>${c}</td>${['2', '1', '0'].map(v => `<td style="text-align:center"><input type="radio" name="cr${i}" value="${v}" data-r="cr${i}"></td>`).join('')}</tr>`).join('')}</table></div>`
];

/* المنتدى */
function wallHTML(st) {
  const top = DB.forum.filter(p => !p.parent).sort((a, b) => b.at - a.at);
  if (!top.length) return '<div class="card">لا توجد مداخلات بعد. كن أول من يشارك من الشاشة السابقة!</div>';
  FI.i = Math.max(0, Math.min(FI.i, top.length - 1));
  const p = top[FI.i], reps = DB.forum.filter(r => r.parent === p.id).sort((a, b) => a.at - b.at);
  return `<div class="post"><div class="meta">👤 ${esc(p.name)} · ${fmtD(p.at)}</div><div class="big">${nl(p.text)}</div>
   ${reps.slice(-3).map(r => `<div class="post reply"><div class="meta">↩ ${esc(r.name)} · ${fmtD(r.at)}</div>${nl(r.text)}</div>`).join('')}${reps.length > 3 ? `<div class="cap">(${reps.length - 3} تعقيبات أقدم مخفية)</div>` : ''}
   ${p.sid !== st.user ? `<div class="tools"><button class="btn sm ghost" data-do="reply" data-p="${p.id}">↩ عقّب على هذه المداخلة</button></div>` : ''}</div>
   <div class="tools" style="justify-content:center"><button class="btn sm ghost ${FI.i >= top.length - 1 ? 'dis' : ''}" data-do="fnext">→ مداخلة أقدم</button><span>${FI.i + 1} / ${top.length}</span><button class="btn sm ghost ${FI.i <= 0 ? 'dis' : ''}" data-do="fprev">مداخلة أحدث ←</button></div>`;
}
SCR.s4 = st => { const c = forumCount(st); const stat = `<div class="card ${c.main >= 1 && c.rep >= 2 ? 'ok' : ''}"><b>مشاركاتك:</b> مداخلات رئيسة: ${c.main}/1 · تعقيبات: ${c.rep}/2</div>`; return [
  `${stageStrip('s4')}<h2>المرحلة الرابعة: ناقش (Discuss)</h2> ${doneP(st, 's4')}<div class="card tip big"><h3>💬 قضية الحوار التفاعلي</h3>دعنا نتخيل مسارًا مغايرًا للتاريخ:<br><b>ماذا لو نجح الخليفة العاضد الفاطمي بالفعل في السيطرة على صلاح الدين وجعله مجرد أداة طيعة ينفذ بها رغبات القصر الفاطمي؟ كيف كان سيتغير تاريخ مصر، والمواجهة العسكرية والسياسية الوشيكة مع الصليبيين في الشام؟</b></div>`,
  `<div class="card info big"><h2 style="border:0">🔎 وقفة نقدية: هل كان التحول بلا دماء تمامًا؟</h2><p>تصف المصادر إلغاء الخطبة الفاطمية سنة 567هـ بأنه مرّ دون مقاومة تُذكر، لكن المؤرخ الناقد لا يكتفي بلحظة الإعلان. فقد شهدت سنة 564هـ نفسها كشف مؤامرة دبرها مؤتمن الخلافة جوهر – أحد كبار رجال القصر – للاتصال بالصليبيين ضد صلاح الدين، فقُتل، ثم ثار الجند السودان في الجيش الفاطمي واقتتلوا مع جند صلاح الدين في شوارع القاهرة فيما عُرف بـ«وقعة السودان» حتى هُزموا.</p><p>فكّر: هل يضعف ذلك فكرة «التحول السلمي»؟ أم أنه يميز بين مرحلة تثبيت السلطة (التي استُخدمت فيها القوة) ومرحلة التحول المذهبي وإلغاء الخلافة (التي تمت بالتدريج)؟ استخدم هذا التمييز في مداخلتك.</p></div>`,
  `<h2>📋 بروتوكول النقاش وتفنيد الآراء</h2>${T(['لتأييد رأي زميل وبنائه', 'لتفنيد حجة زميل ونقدها', 'لطلب الدليل أو التوضيح'], [['«أتفق مع حجة زميلي (……) في أن بقاء الضعف الفاطمي كان سيقود عسكريًا إلى ……………؛ لأن شواهد المصدر تشير إلى ……………»', '«أرى أن وجهة نظر زميلي (……) حول قدرة الفاطميين على الاستمرار غير دقيقة؛ لأن المصادر مثل المقريزي تثبت أن الدولة كانت تعاني ضعفًا بنيويًا تصفه عبارة ……………»', '«أود أن أسأل زميلي (……): ما الدليل من المصادر الذي استندت إليه في قولك ……………؟ وهل توجد رواية تخالفه؟»']])}`,
  `<div class="card big"><h2 style="border:0">قواعد المشاركة في المنتدى</h2><ul><li>اكتب مداخلة رئيسة واحدة (نحو 80 كلمة) تعرض فيها تصورك للمسار المغاير مدعمًا بدليل واحد على الأقل.</li><li>عقّب على مداخلتين لزميلين: تأييدًا مع إضافة، أو تفنيدًا بالدليل.</li><li>انقد الفكرة لا الشخص، والتزم بلغة أكاديمية مهذبة.</li></ul></div>${stat}`,
  `<div class="card"><h2>✍️ مداخلتك الرئيسة</h2><textarea id="newpost" placeholder="اكتب تصورك للمسار المغاير مدعمًا بدليل…" style="min-height:170px"></textarea><div class="words" id="npw">0 كلمة</div><div class="tools"><button class="btn green" data-do="sendpost">نشر المداخلة</button></div></div>${stat}`,
  `<h2>حائط النقاش</h2>${wallHTML(st)}${stat}`
]; };

SCR.s5 = st => [
  `${stageStrip('s5')}<h2>المرحلة الخامسة: تأمل (Reflect) – كيف فكرت اليوم؟</h2> ${doneP(st, 's5')}<div class="card tip big">افتح «مفكرة التأمل» الخاصة بك في الشاشات التالية، وأكمل العبارات بصدق. لا يطّلع عليها إلا أنت وأستاذ المقرر.</div>`,
  `<div class="card"><h2>📓 مذكرة التأمل (1/3)</h2><p class="big">قبل دراسة هذا الموديول كنت أظن أن إلغاء الخلافة الفاطمية تم بقوة عسكرية غاشمة وصدام مسلح، ولكنني أدركت الآن أن …</p>${textField('ref1', 'أكمل العبارة…', 140)}<div class="tools">${saveBtn()}</div></div>`,
  `<div class="card"><h2>📓 مذكرة التأمل (2/3)</h2><p class="big">أهم مهارة استدلالية شعرت أنني مارستها بقوة اليوم هي مهارة (طرح الأسئلة / نقد وتقييم المصادر / بناء وتقييم الحجة / الربط السببي)، وقد ساعدتني في …</p>${textField('ref2', 'أكمل العبارة…', 140)}<div class="tools">${saveBtn()}</div></div>`,
  `<div class="card"><h2>📓 مذكرة التأمل (3/3)</h2><p class="big">ما زلت أواجه بعض الصعوبات في … وسأحاول التغلب عليها في الموديول القادم عن طريق …</p>${textField('ref3', 'أكمل العبارة…', 140)}<div class="tools">${saveBtn()}</div></div>`,
  ...[0, 4].map(s => `<h2>📊 مقياس التقدير الذاتي لمهاراتي وتعلمي (${s / 4 + 1}/2)</h2><div class="tblwrap"><table><tr><th>العبارة</th><th>بدرجة كبيرة</th><th>متوسطة</th><th>ضعيفة</th></tr>${SCALE.slice(s, s + 4).map((c, j) => `<tr><td>${c}</td>${['3', '2', '1'].map(v => `<td style="text-align:center"><input type="radio" name="sc${s + j}" value="${v}" data-r="sc${s + j}"></td>`).join('')}</tr>`).join('')}</table></div>`)
];

/* ---------- التغذية الراجعة ---------- */
SCR.fb = st => {
  const a = st.post[st.post.length - 1];
  const head = `<h2>عاشرًا: التغذية الراجعة والمسار العلاجي</h2><p>إذا حصلت على أقل من ${DB.settings.mastery}% في الاختبار البعدي، تظهر لك رسائل مخصصة حسب الأسئلة التي أخطأت فيها، مع المسار العلاجي؛ أنجزه ثم أعد المحاولة.</p>`;
  if (!a) return [head + `<div class="card tip">لم تُرسل الاختبار البعدي بعد. ستظهر هنا رسائلك المخصصة بعد الإرسال.</div>`];
  const wrong = new Set();
  POST.forEach((q, i) => { if (a.ans[i] !== q.a) wrong.add(q.fb); });
  ESSAYS.forEach(e => { if (a.grades && (a.grades[e.id] || 0) < e.max) wrong.add(e.fb); });
  const tot = postTotal(a);
  const out = [head + `<div class="card ${tot != null && tot * 10 >= DB.settings.mastery ? 'ok' : 'tip'}"><b>آخر محاولة (${fmtD(a.at)})</b>: الاختياري ${a.mcq}/6 · ${tot != null ? `الدرجة النهائية <b>${tot}/10</b>` : 'المقالي بانتظار تصحيح الأستاذ'}.</div>
    ${!wrong.size ? `<div class="card ok">لا توجد أخطاء تستدعي علاجًا${a.grades ? '. أحسنت!' : ' في الجزء الاختياري. انتظر تصحيح الأسئلة المقالية.'}</div>` : `<div class="card warn">ستعرض الشاشات التالية رسائل التغذية الراجعة لـ ${wrong.size} ${wrong.size > 1 ? 'مهارات' : 'مهارة'}.</div>`}
    <div class="tools"><button class="btn green" data-do="fbagain">إعادة الاختبار البعدي</button></div>`];
  [...wrong].sort().forEach(i => { const f = FEEDBACK[i]; out.push(`<div class="card warn big"><h3>أخطأت في: ${f.g}</h3><p><b>التغذية الراجعة:</b> «${f.m}»</p><p><b>المسار العلاجي:</b> ${f.r}</p><a class="btn gold" href="#/s/${f.go}/0">اذهب للمراجعة</a></div>`); });
  if (a.grades) ESSAYS.forEach(e => out.push(`<div class="card"><h3>س${e.n} — درجتك: ${a.grades[e.id] ?? '—'}/${e.max}</h3><p><b>إجابتك:</b> ${nl(a.essays[e.id] || '—')}</p><p><b>نموذج استرشادي:</b> ${esc(e.model)}</p>${a.comments && a.comments[e.id] ? `<p><b>تعليق الأستاذ:</b> ${esc(a.comments[e.id])}</p>` : ''}</div>`));
  else out.push(`<div class="card info">النموذج الاسترشادي للأسئلة المقالية سيظهر بعد أن يصحح الأستاذ إجاباتك.</div>`);
  return out;
};

/* ---------- مفاتيح التصحيح: شاشة لكل مفتاح ---------- */
SCR.keys = st => {
  const lockBox = (cond, why, html) => cond ? html : `<div class="card warn center big">🔒 ${why}</div>`;
  const aKey = (id, title, tbl) => `<h2 style="font-size:1.4rem">${title}</h2>` + lockBox(!!st.acts[id], `يُفتح هذا المفتاح بعد أن تحاول إنجاز النشاط وتضغط «تحقق».`, tbl);
  return [
    `<div class="card warn center big"><h2 style="border:0">حادي عشر: مفاتيح التصحيح ✅</h2><b>تنبيه:</b> لا تطّلع على مفتاح التصحيح قبل محاولة الإجابة بنفسك؛ فالهدف أن تكتشف أخطاءك وتصححها. لذلك تُفتح المفاتيح تلقائيًا بعد محاولتك، وكل مفتاح في شاشة.</div>`,
    `<h2 style="font-size:1.4rem">مفتاح الاختبار القبلي</h2>` + lockBox(st.pre.length > 0, 'يُفتح بعد إرسال الاختبار القبلي.', T(['السؤال', ...PRE.map((q, i) => i + 1)], [['الإجابة', ...PRE.map(q => 'أبجد'[q.a])]])),
    `<h2 style="font-size:1.4rem">مفتاح الاختبار البعدي (الجزء أ)</h2>` + lockBox(st.post.length > 0, 'يُفتح بعد إرسال الاختبار البعدي.', T(['السؤال', ...POST.map((q, i) => i + 1)], [['الإجابة', ...POST.map(q => 'أبجد'[q.a])]]) + '<p>أما الأسئلة المقالية فتُقدَّر وفق قائمة التقدير، وتجد نماذج استرشادية في «التغذية الراجعة» بعد التصحيح.</p>'),
    aKey('a1', 'مفتاح النشاط الذاتي (1): تصنيف الأسئلة', T(['السؤال', 'التصنيف', 'النوع'], ACTS.a1.rows.map((r, i) => [i + 1, r[1] === 'i' ? 'استقصائي' : 'وصفي مغلق', r[2] || '—']))),
    aKey('a2', 'مفتاح النشاط الذاتي (2): تصنيف المصادر', T(['أولي معاصر', 'أصيل متأخر', 'مرجع ثانوي'], [['(1) رسائل القاضي الفاضل – (2) النوادر السلطانية لابن شداد – (6) وثيقة الوقف المعاصرة', '(3) خطط المقريزي – (4) النجوم الزاهرة', '(5) كتاب المقرر – (7) البحث العلمي الحديث']])),
    aKey('a3', 'مفتاح النشاط الذاتي (3): حقيقة أم رأي', T(['العبارة', '1', '2', '3', '4', '5', '6'], [['التصنيف', ...ACTS.a3.rows.map(r => r[1] === 'f' ? 'حقيقة' : 'رأي')]]) + `<p>${ACTS.a3.note}</p>`),
    aKey('a4', 'مفتاح النشاط الذاتي (4): الترتيب الزمني', T(['الترتيب', 'الحدث', 'السنة'], [[1, 'أولى حملات نور الدين على مصر بقيادة شيركوه', '559هـ'], [2, 'تولي شيركوه الوزارة بعد مقتل شاور', '564هـ'], [3, 'تولية صلاح الدين الوزارة', '564هـ'], [4, 'إنشاء المدرستين الناصرية والقمحية', '566هـ'], [5, 'قطع الخطبة للفاطميين والدعاء للمستضيء', '567هـ'], [6, 'وفاة الخليفة العاضد', '567هـ']])),
    aKey('a5', 'مفتاح النشاط الذاتي (5): الربط السببي والزمني', T(['الحدث', 'السبب', 'النتيجة بعيدة المدى'], [['تولية صلاح الدين الوزارة (564هـ)', '(2)', '(6)'], ['تأسيس المدارس السنية', '(1)', '(5)'], ['إلغاء الخلافة الفاطمية (567هـ)', '(3)', '(4)']])),
    aKey('a6', 'مفتاح النشاط الذاتي (6): التغير والاستمرارية', T(['الجانب', 'قبل 564هـ', 'بعد 567هـ', 'الحكم'], ACTS.a6.rows.map(r => [r[0], r[2], r[3], r[1]])))
  ];
};

/* ---------- المسرد والمصادر ---------- */
SCR.gloss = st => {
  const out = [0, 4, 8, 12].map((s, k) => `<h2>مسرد مصطلحات الموديول (${k + 1}/4)</h2>${T(['المصطلح', 'معناه في سياق الموديول'], GLOSSARY.slice(s, s + 4).map(g => [`<b>${g[0]}</b>`, g[1]]))}`);
  out.push(`<h2>المصادر والمراجع</h2><div class="card"><b>أولًا: المصادر</b><ul>${REFS.slice(0, 8).map(r => `<li>${r}</li>`).join('')}</ul></div>`);
  out.push(`<div class="card"><b>ثانيًا: المراجع</b><ul><li>${REFS[8]}</li></ul></div><div class="card ok center big"><b>تهانينا! لقد أنهيت الموديول الأول.</b><br>استعد الآن للموديول الثاني، واحمل معك أسئلتك الجديدة… فالمؤرخ الحقيقي لا يتوقف عن السؤال.</div>`);
  return out;
};

/* ---------- سجل المتابعة ---------- */
function reportParts(st, teacher, nlog) {
  const stt = status(st), p = progress(st), bp = bestPre(st), bq = postBest(st), mins = Math.round(st.time / 60), fc = forumCount(st);
  const gain = (bp != null && bq != null) ? (bq - bp) : null, lastP = lastPre(st), lastQ = st.post[st.post.length - 1];
  const actRows = Object.keys(ACTS).map(id => { const r = st.acts[id]; return `<tr><td>${ACTS[id].title.replace('نشاط ذاتي', 'نشاط')}</td><td>${r ? `${r.score}/${r.max}` : '—'}</td><td>${r ? r.best + '/' + r.max : '—'}</td><td>${r ? r.tries : 0}</td><td>${r ? fmtD(r.at) : '—'}</td></tr>`; }).join('');
  const preRows = st.pre.map((a, i) => `<tr><td>${i + 1}</td><td>${fmtD(a.at)}</td><td>${a.score}/10</td><td>${a.score * 10}%</td><td>${Math.round((a.secs || 0) / 60)} د</td></tr>`).join('') || '<tr><td colspan="5">لم يُجرَ بعد</td></tr>';
  const postRows = st.post.map((a, i) => { const t = postTotal(a); return `<tr><td>${i + 1}</td><td>${fmtD(a.at)}</td><td>${a.mcq}/6</td><td>${a.grades ? ESSAYS.map(e => a.grades[e.id]).join(' + ') + ' = ' + (t - a.mcq) + '/4' : '<span class="pill y">بانتظار التصحيح</span>'}</td><td>${t != null ? `<b>${t}/10</b> (${t * 10}%)` : '—'}</td></tr>`; }).join('') || '<tr><td colspan="5">لم يُجرَ بعد</td></tr>';
  return [
    `<h2>📊 سجل المتابعة</h2><div class="card"><div class="grid"><div><b>الطالب:</b> ${esc(st.name)}</div><div><b>المجموعة:</b> ${esc(st.group)}</div><div><b>اسم المستخدم:</b> ${esc(st.user)}</div><div><b>رقم الجلوس:</b> ${esc(st.seat)}</div><div><b>تاريخ البدء:</b> ${esc(st.start)}</div><div><b>الحالة:</b> <span class="pill ${stt.c}">${stt.t}</span></div></div></div>
     <div class="grid"><div class="stat"><b>${p}%</b>التقدم العام</div><div class="stat"><b>${bp != null ? bp * 10 + '%' : '—'}</b>أفضل قبلي</div><div class="stat"><b>${bq != null ? bq * 10 + '%' : '—'}</b>أفضل بعدي</div><div class="stat"><b>${gain != null ? (gain > 0 ? '+' : '') + gain * 10 + '%' : '—'}</b>الكسب</div><div class="stat"><b>${mins}</b>دقيقة تعلم</div></div>
     <div class="tools"><button class="btn sm" id="printBtn">🖨️ طباعة / حفظ PDF</button></div>`,
    `<h2>مكونات الموديول</h2><div class="card"><div class="grid">${TRACK.map(i => { const s = SECS.find(x => x.id === i); return `<div>${isDone(st, i) ? '✅' : '⬜'} ${s.t}</div>`; }).join('')}</div></div>`,
    `<h3>الاختبار القبلي</h3><div class="tblwrap"><table><tr><th>المحاولة</th><th>التاريخ</th><th>الدرجة</th><th>النسبة</th><th>الزمن</th></tr>${preRows}</table></div><h3>الاختبار البعدي</h3><div class="tblwrap"><table><tr><th>المحاولة</th><th>التاريخ</th><th>الاختياري</th><th>المقالي (س7 + س8 + س9)</th><th>الدرجة النهائية</th></tr>${postRows}</table></div>`,
    `<h2>المهارات (آخر محاولة)</h2>${lastP || lastQ ? `<div class="grid">${lastP ? `<div class="card"><b>القبلي</b>${skillBars(lastP.skills)}</div>` : ''}${lastQ ? `<div class="card"><b>البعدي (الاختياري)</b>${skillBars(lastQ.skills)}</div>` : ''}</div>` : '<div class="card">لا توجد نتائج بعد.</div>'}`,
    `<h2>الأنشطة الذاتية</h2><div class="tblwrap"><table><tr><th>النشاط</th><th>آخر نتيجة</th><th>أفضل نتيجة</th><th>المحاولات</th><th>آخر محاولة</th></tr>${actRows}</table></div>`,
    `<h2>المشاركة والتأمل</h2><div class="card big"><ul><li>أسئلة مرحلة «اسأل» المكتوبة: ${[1, 2, 3].filter(i => st.texts['q' + i]).length}/3</li><li>كلمات فقرة الحجة التاريخية: ${words(st.texts.argument)}</li><li>المنتدى: ${fc.main} مداخلة رئيسة، ${fc.rep} تعقيب</li><li>مذكرة التأمل: ${[1, 2, 3].filter(i => st.texts['ref' + i]).length}/3 عبارات مكتملة</li></ul></div>`,
    `<h2>سجل النشاط الزمني</h2><div class="card"><ul class="timeline">${st.log.slice(-(nlog || 10)).reverse().map(l => `<li><time>${fmtD(l.t)}</time>${esc(l.e)}</li>`).join('')}</ul></div>`
  ];
}
SCR.log = st => reportParts(st, false, 10);
const reportHTML = st => reportParts(st, true, 40).join('');
function teacherTexts(st) {
  const Tx = st.texts, pr = (l, v) => v ? `<p><b>${l}:</b> ${nl(v)}</p>` : '', posts = DB.forum.filter(x => x.sid === st.user);
  return `<h3>إجابات الطالب المكتوبة</h3><div class="card">${[1, 2, 3].map(i => pr('سؤال استقصائي ' + i, Tx['q' + i])).join('')}${[1, 2, 3].map(i => pr('إكمال السؤال ' + i, Tx['c' + i])).join('')}${pr('تحويل السؤالين الوصفيين', Tx.a1x)}${pr('نقد خارجي (المصدر أ)', Tx.crit1)}${pr('نقد داخلي (المصدر أ)', Tx.crit2)}${pr('الحكم النهائي', Tx.crit3)}${pr('دليل البودكاست 1', Tx.pod1)}${pr('دليل البودكاست 2', Tx.pod2)}${pr('الحجة التاريخية', Tx.argument)}${pr('التأمل 1', Tx.ref1)}${pr('التأمل 2', Tx.ref2)}${pr('التأمل 3', Tx.ref3)}
   ${posts.length ? '<b>مشاركات المنتدى:</b>' + posts.map(p => `<div class="post ${p.parent ? 'reply' : ''}">${p.parent ? '↩ تعقيب: ' : ''}${nl(p.text)}</div>`).join('') : ''}</div>`;
}

/* ---------- لوحة الأستاذ (تتمرر عاديًا) ---------- */
function teacherPage(a) {
  if (!TEACHER) return `<div class="cover"><div class="arch"><div class="uni">لوحة الأستاذ</div><h2>👨‍🏫 تسجيل دخول الأستاذ</h2><div class="formcard"><label>الرقم السري للأستاذ</label><input type="password" id="t_pin"><div class="err" id="err"></div><div class="cta"><button class="btn green" id="tLogin">دخول</button><a class="btn ghost" href="#/home">رجوع</a></div><small>الرقم الافتراضي: 1234 — غيّره من الإعدادات بعد أول دخول.</small></div></div></div>`;
  const list = Object.values(DB.students).sort((x, y) => x.group.localeCompare(y.group, 'ar') || x.seat.localeCompare(y.seat, undefined, { numeric: true }));
  const top = `<div class="tpage"><div class="tools"><a class="btn ghost sm" href="#/home">← الغلاف</a><button class="btn maroon sm" id="tOut">خروج</button></div>`;
  if (a && a !== 'settings' && DB.students[a]) {
    const st = DB.students[a];
    return top + `<div class="tools"><a class="btn sm" href="#/teacher">← كل الطلاب</a></div>` + reportHTML(st) + teacherTexts(st) + gradeHTML(st) +
      `<div class="card warn"><h3>إجراءات</h3><div class="tools"><button class="btn sm gold" id="resetPin">إعادة كلمة المرور إلى اسم المستخدم</button><button class="btn sm maroon" id="delStu">حذف الطالب وسجله</button></div></div></div>`;
  }
  if (a === 'settings') return top + `<div class="tools"><a class="btn sm" href="#/teacher">← كل الطلاب</a></div><h2>⚙️ الإعدادات</h2><div class="card"><label>الرقم السري للأستاذ</label><input type="text" id="s_pin" value="${esc(DB.settings.teacherPin)}">
    <label>رابط حلقة البودكاست (يظهر للطلاب في مرحلة استقصِ)</label><input type="url" id="s_pod" value="${esc(DB.settings.podcast)}" placeholder="https://…">
    <label>مستوى الإتقان (%)</label><input type="number" id="s_m" min="50" max="100" value="${DB.settings.mastery}"><div class="tools"><button class="btn green" id="sSave">حفظ الإعدادات</button></div></div>
    <div class="card warn"><h3>منطقة الخطر</h3><button class="btn maroon" id="wipe">مسح جميع بيانات البرنامج</button></div></div>`;
  const rows = list.map(s => { const stt = status(s), bp = bestPre(s), bq = postBest(s), pend = s.post.some(x => !x.grades); return `<tr><td>${esc(s.name)}</td><td>${esc(s.user)}</td><td>${esc(s.group)}</td><td>${esc(s.seat)}</td><td>${progress(s)}%</td><td>${bp != null ? bp * 10 + '%' : '—'} <small>(${s.pre.length})</small></td><td>${bq != null ? bq * 10 + '%' : '—'} <small>(${s.post.length})</small>${pend ? ' <span class="pill y">تصحيح</span>' : ''}</td><td><span class="pill ${stt.c}">${stt.t}</span></td><td><a class="btn sm" href="#/teacher/${esc(s.user)}">فتح السجل</a></td></tr>`; }).join('');
  const n = list.length, avg = f => { const v = list.map(f).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '—'; };
  const mast = list.filter(s => status(s).c === 'g').length;
  return top + `<h2>👨‍🏫 لوحة الأستاذ – سجل متابعة الطلاب</h2>
  <div class="grid"><div class="stat"><b>${n}</b>عدد الطلاب</div><div class="stat"><b>${avg(progress)}${n ? '%' : ''}</b>متوسط التقدم</div><div class="stat"><b>${avg(s => bestPre(s) != null ? bestPre(s) * 10 : null)}%</b>متوسط القبلي</div><div class="stat"><b>${avg(s => postBest(s) != null ? postBest(s) * 10 : null)}%</b>متوسط البعدي</div><div class="stat"><b>${mast}</b>أتقنوا الموديول</div></div>
  <div class="tools"><button class="btn sm green" id="csv">⬇ تصدير Excel (CSV)</button><button class="btn sm" id="bak">💾 نسخة احتياطية (JSON)</button><label class="btn sm ghost" style="margin:0">⬆ استيراد نسخة<input type="file" id="imp" accept=".json" class="hidden"></label><a class="btn sm gold" href="#/teacher/settings">⚙️ الإعدادات</a></div>
  <div class="tblwrap"><table><tr><th>الطالب</th><th>اسم المستخدم</th><th>المجموعة</th><th>رقم الجلوس</th><th>التقدم</th><th>القبلي (محاولات)</th><th>البعدي (محاولات)</th><th>الحالة</th><th></th></tr>${rows || '<tr><td colspan="9">لا يوجد طلاب مسجلون بعد على هذا الجهاز</td></tr>'}</table></div>
  <div class="card info"><small>ملاحظة: بيانات البرنامج تُحفظ في متصفح هذا الجهاز. لجمع بيانات طلاب من أجهزة مختلفة اطلب من كل طالب «نسخة احتياطية» ثم استوردها هنا (يُدمج الطلاب بحسب اسم المستخدم).</small></div></div>`;
}
function gradeHTML(st) {
  if (!st.post.length) return '';
  return `<h3>✍️ تصحيح الأسئلة المقالية</h3>` + st.post.map((a, ai) => `<div class="card" data-ai="${ai}"><b>المحاولة ${ai + 1} – ${fmtD(a.at)}</b> · الاختياري: ${a.mcq}/6
   ${ESSAYS.map(e => `<div class="q"><div class="qt">س${e.n} (${e.max} ${e.max > 1 ? 'درجتان' : 'درجة'}): ${esc(e.t.split(':')[0])}</div><p>${nl(a.essays[e.id] || '— لا إجابة —')}</p><details><summary>النموذج الاسترشادي</summary><p>${esc(e.model)}</p></details>
     <label>الدرجة (0 – ${e.max})</label><input type="number" min="0" max="${e.max}" step="0.5" data-g="${e.id}" value="${a.grades ? a.grades[e.id] : ''}" style="width:110px"> <input type="text" data-c="${e.id}" placeholder="تعليق للطالب (اختياري)" value="${esc(a.comments ? a.comments[e.id] || '' : '')}"></div>`).join('')}
   <div class="tools"><button class="btn green gsave">حفظ الدرجات</button></div></div>`).join('');
}
function wireTeacher(a) {
  if (!TEACHER) { const f = () => { if ($('#t_pin').value === DB.settings.teacherPin) { TEACHER = true; try { sessionStorage.setItem('module1_t', '1'); } catch (e) {} render(); } else $('#err').textContent = 'الرقم السري غير صحيح'; }; $('#tLogin').onclick = f; $('#t_pin').onkeydown = e => { if (e.key === 'Enter') f(); }; return; }
  const out = $('#tOut'); if (out) out.onclick = () => { TEACHER = false; try { sessionStorage.removeItem('module1_t'); } catch (e) {} go('home'); };
  if (a && a !== 'settings' && DB.students[a]) {
    const st = DB.students[a];
    $$('.gsave').forEach(b => b.onclick = () => {
      const card = b.closest('[data-ai]'), at = st.post[+card.dataset.ai], g = {}, c = {}; let bad = false;
      ESSAYS.forEach(e => { const v = card.querySelector(`[data-g="${e.id}"]`).value; if (v === '' || +v < 0 || +v > e.max) bad = true; g[e.id] = +v; c[e.id] = card.querySelector(`[data-c="${e.id}"]`).value.trim(); });
      if (bad) return toast('أدخل درجة صحيحة لكل سؤال');
      at.grades = g; at.comments = c; log(st, `تصحيح المقالي: ${postTotal(at)}/10`); save(); toast('تم حفظ الدرجات ✔'); render();
    });
    $('#resetPin').onclick = () => { if (confirm('إعادة كلمة المرور لتصبح مطابقة لاسم المستخدم؟ (ينبغي أن يغيّرها الطالب بعد دخوله)')) { st.pin = st.user; save(); toast('تمت إعادة كلمة المرور'); } };
    $('#delStu').onclick = () => { if (confirm('حذف الطالب وسجله نهائيًا؟')) { delete DB.students[a]; DB.forum = DB.forum.filter(p => p.sid !== a); save(); go('teacher'); } };
    return;
  }
  if (a === 'settings') {
    $('#sSave').onclick = () => { DB.settings.teacherPin = $('#s_pin').value || '1234'; DB.settings.podcast = $('#s_pod').value.trim(); DB.settings.mastery = Math.min(100, Math.max(50, +$('#s_m').value || 80)); save(); toast('تم الحفظ ✔'); };
    $('#wipe').onclick = () => { if (confirm('سيتم مسح كل الطلاب والنتائج! هل أنت متأكد؟') && prompt('اكتب «مسح» للتأكيد') === 'مسح') { localStorage.removeItem(KEY); loadDB(); CUR = null; saveCur(); go('teacher'); } };
    return;
  }
  $('#csv').onclick = exportCSV;
  $('#bak').onclick = () => download('module1_backup_' + today() + '.json', JSON.stringify(DB), 'application/json');
  $('#imp').onchange = e => {
    const f = e.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const o = JSON.parse(r.result); let n = 0; Object.values(o.students || {}).forEach(s => { s.user = s.user || s.seat; const old = DB.students[s.user]; if (!old || (s.log || []).length >= old.log.length) { DB.students[s.user] = s; n++; } }); (o.forum || []).forEach(p => { if (!DB.forum.some(x => x.id === p.id)) DB.forum.push(p); }); save(); toast('تم استيراد ' + n + ' طالب'); render(); } catch (err) { toast('ملف غير صالح'); } };
    r.readAsText(f);
  };
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function exportCSV() {
  const H = ['الاسم', 'اسم المستخدم', 'المجموعة', 'رقم الجلوس', 'تاريخ البدء', 'التقدم %', 'القبلي (أفضل /10)', 'محاولات القبلي', 'البعدي (أفضل /10)', 'محاولات البعدي', 'الحالة', 'نشاط1', 'نشاط2', 'نشاط3', 'نشاط4', 'نشاط5', 'نشاط6', 'كلمات الحجة', 'مداخلات المنتدى', 'تعقيبات', 'الزمن (دقيقة)'];
  const rows = Object.values(DB.students).map(s => { const fc = forumCount(s); return [s.name, s.user, s.group, s.seat, s.start, progress(s), bestPre(s) ?? '', s.pre.length, postBest(s) ?? '', s.post.length, status(s).t, ...Object.keys(ACTS).map(k => s.acts[k] ? s.acts[k].best + '/' + s.acts[k].max : ''), words(s.texts.argument), fc.main, fc.rep, Math.round(s.time / 60)]; });
  const csv = [H, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  download('module1_students_' + today() + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
}
document.addEventListener('click', e => { if (e.target.id === 'printBtn') window.print(); });

/* ---------- زمن التعلم ---------- */
setInterval(() => { const st = me(); if (st && !document.hidden && route()[0] === 's') { st.time += 15; save(); } }, 15000);
try { TEACHER = sessionStorage.getItem('module1_t') === '1'; } catch (e) {}
if (!location.hash) location.hash = '#/home'; else render();

