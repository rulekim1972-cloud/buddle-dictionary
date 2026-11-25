'use strict';
/* 버들 국어사전 — 3학년 2반 임혜란샘 */

const $ = (s, el = document) => el.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('bd-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bd-' + k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const BASIC = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
const TABS = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split('');
const TAB_COLORS = ['#d9534f', '#e07b39', '#d4a017', '#7cae3a', '#3e9e5a', '#25a18e', '#2b8cbe', '#3b6fd1', '#5a55c9', '#8150c4', '#b04aa8', '#c94a7d', '#a8653a', '#6b7a3a'];
const TEAM_COLORS = ['#d9534f', '#e0961f', '#3e9e5a', '#2b8cbe', '#8150c4', '#b04aa8'];
const CIRCLE = '①②③④⑤⑥⑦⑧⑨⑩';
const POSNAME = { '명': '명사', '동': '동사', '형': '형용사', '부': '부사', '대': '대명사', '수': '수사', '관': '관형사', '감': '감탄사', '조': '조사', '의': '의존 명사', '보동': '보조 동사', '보형': '보조 형용사' };
const GRADE = { 1: '학교 가기 전 낱말', 2: '1~2학년 낱말', 3: '3~4학년 낱말' };
const DEFAULT_NAMES = ['노엘라', '해준', '민준', '연우', '은서', '지완', '려원', '서호', '예도', '지우', '유찬', '나영', '한울', '민경', '서아', '서오', '수인', '승훈', '지수', '하빈', '보겸', '은솔'];

function cho(w) { const c = w.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ''; }
function cho1(w) { const c = cho(w); return BASIC[c] || c; }
function choStr(w) { return [...w].map(ch => { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join(''); }
function josa(name, a, b) { const c = name.charCodeAt(name.length - 1) - 0xAC00; return (c >= 0 && c < 11172 && c % 28) ? a : b; }
function callName(n) { return n + josa(n, '이', ''); }

const S = {
  D: null, G: null, idx: new Map(),
  pages: [], pageOf: null, secStart: [], mode: 'two', p: 0, N: 0,
  fs: store.get('fs', 17), sound: store.get('sound', true), rate: store.get('rate', 0.9),
  names: store.get('names', DEFAULT_NAMES),
  stars: new Set(store.get('stars', [])), dogam: new Set(store.get('dogam', [])),
  rec: store.get('rec', {}),
  busy: false, game: null, geom: null, cache: new Map(),
};

/* ---------- 소리 ---------- */
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function sFlip(vol = 1) {
  if (!S.sound) return; const a = ac(); if (!a) return;
  const len = 0.22, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) { const t = i / d.length; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * (0.6 + 0.4 * Math.sin(t * 40)); }
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(2400, a.currentTime); f.frequency.exponentialRampToValueAtTime(900, a.currentTime + len); f.Q.value = 0.7;
  const g = a.createGain(); g.gain.value = 0.35 * vol;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
function tone(freqs, dur = 0.14, type = 'sine', vol = 0.18) {
  if (!S.sound) return; const a = ac(); if (!a) return;
  freqs.forEach((fr, k) => {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + k * dur * 0.9;
    o.type = type; o.frequency.value = fr; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.6);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur * 1.7);
  });
}
const sGood = () => tone([784, 988, 1319], 0.12);
const sBad = () => tone([220, 196], 0.12, 'triangle', 0.15);
const sTick = () => tone([660], 0.05, 'sine', 0.08);
const sFanfare = () => tone([523, 659, 784, 1047, 784, 1047], 0.13, 'triangle', 0.16);

/* 읽어 주기 */
let koVoice = null;
function pickVoice() { try { const v = speechSynthesis.getVoices(); koVoice = v.find(x => /ko[-_]KR/i.test(x.lang) && /google|yuna|sun|female|여/i.test(x.name)) || v.find(x => /^ko/i.test(x.lang)) || null; } catch (e) {} }
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) {
  if (!('speechSynthesis' in window)) { toast('이 기기는 읽어 주기를 지원하지 않아요'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = S.rate; if (koVoice) u.voice = koVoice;
  speechSynthesis.speak(u);
}

/* ---------- 알림 ---------- */
let toastT = 0;
function toast(msg, kind = '', ms = 1800) {
  const t = $('#toast'); t.innerHTML = msg; t.className = 'show ' + kind; clearTimeout(toastT);
  toastT = setTimeout(() => t.className = '', ms);
}
function confetti() {
  const c = document.createElement('div'); c.className = 'cele';
  for (let i = 0; i < 70; i++) { const e = document.createElement('i'); e.style.left = Math.random() * 100 + 'vw'; e.style.background = TAB_COLORS[i % 14]; e.style.animationDelay = Math.random() * 0.6 + 's'; e.style.animationDuration = 1.2 + Math.random() * 1.2 + 's'; c.appendChild(e); }
  document.body.appendChild(c); setTimeout(() => c.remove(), 3200);
}

/* ---------- 데이터 ---------- */
async function load() {
  const [D, G] = await Promise.all([fetch('words.json').then(r => r.json()), fetch('games.json').then(r => r.json())]);
  S.D = D; S.G = G;
  D.forEach((r, i) => { if (!S.idx.has(r[0])) S.idx.set(r[0], []); S.idx.get(r[0]).push(i); });
  $('#loadMsg').textContent = `낱말 ${D.length.toLocaleString()}개가 들어 있어요`;
  $('#openBtn').disabled = false;
}

/* ---------- 쪽 나누기 ---------- */
const MAXS = 3;
function entryHTML(i) {
  const r = S.D[i], [w, hn, pos, g, senses] = r, pic = r[5];
  let h = `<div class="ent${S.stars.has(i) ? ' star' : ''}" data-i="${i}"><span class="hw">${esc(w)}${hn ? `<sup>${hn}</sup>` : ''}</span>`;
  if (pos) h += `<span class="pos">${pos}</span>`;
  if (g === 3) h += `<span class="g3">3·4학년</span>`;
  if (pic) h += `<span class="pic">${pic}</span>`;
  const many = senses.length > 1;
  senses.slice(0, MAXS).forEach((s, k) => {
    h += ` ${many ? `<span class="n">${CIRCLE[k]}</span>` : ''}${esc(s[0])}`;
    if (s[1]) h += `<span class="ex">${esc(s[1])}</span>`;
  });
  if (senses.length > MAXS) h += ` <span class="more">…뜻 ${senses.length - MAXS}개 더</span>`;
  return h + '</div>';
}
function entryLen(i) {
  const r = S.D[i]; let n = r[0].length * 1.15 + 3 + (r[3] === 3 ? 3.5 : 0) + (r[5] ? 1.6 : 0);
  const ss = r[4], many = ss.length > 1;
  ss.slice(0, MAXS).forEach(s => { n += s[0].length + (many ? 1.6 : 0) + 0.6 + (s[1] ? s[1].length + 2.2 : 0); });
  if (ss.length > MAXS) n += 8;
  return n;
}
function paginate() {
  const g = S.geom, probe = document.createElement('div');
  probe.className = 'page R'; probe.style.cssText = `position:absolute;visibility:hidden;width:${g.pw}px;height:${g.ph}px;left:-9999px;top:0`;
  probe.innerHTML = `<div class="pin"><div class="pbody"><span id="pr1">가나다라마바사아자차카타파하 거너더러머버서어저처커터퍼허</span></div></div>`;
  document.body.appendChild(probe);
  const body = $('.pbody', probe), sp = $('#pr1', probe);
  // 실제 뜻풀이 문장으로 한 글자 평균 너비를 잰다
  let txt = ''; for (let i = 7; i < S.D.length && txt.length < 3000; i += 97) { const r = S.D[i]; txt += r[4][0][0] + ' ' + r[4][0][1] + ' '; }
  sp.style.whiteSpace = 'nowrap'; sp.textContent = txt;
  const cw = sp.getBoundingClientRect().width / txt.length;
  const W = body.clientWidth - S.fs * 0.9 - 6, H = body.clientHeight;
  const lh = S.fs * 1.55;
  // 실제 측정으로 보정: 표본 낱말을 그려 보고 추정과 비교
  let ratio = 1;
  {
    const sample = [], step = Math.max(1, Math.floor(S.D.length / 60));
    for (let i = 0; i < S.D.length; i += step) sample.push(i);
    body.innerHTML = sample.map(entryHTML).join('');
    let est = 0, real = 0;
    [...body.children].forEach((el, k) => {
      const i = sample[k], lines = Math.ceil(entryLen(i) * cw / W);
      est += lines * lh + 6 + 5; real += el.getBoundingClientRect().height + 5;
    });
    ratio = Math.max(0.8, Math.min(1.3, real / est)) * 1.02;
  }
  probe.remove();
  const cap = H * 0.985;
  const pages = []; const pageOf = new Int32Array(S.D.length);
  let start = 0, used = 0;
  for (let i = 0; i < S.D.length; i++) {
    const h = (Math.ceil(entryLen(i) * cw / W) * lh + 6) * ratio + 5;
    if (used + h > cap && i > start) { pages.push([start, i]); start = i; used = 0; }
    used += h; pageOf[i] = pages.length;
  }
  pages.push([start, S.D.length]);
  S.pages = pages; S.pageOf = pageOf; S.N = pages.length; S.cache.clear();
  S.secStart = TABS.map(t => { const i = S.D.findIndex(r => cho1(r[0]) === t); return i < 0 ? -1 : pageOf[i]; });
}
function pageHTML(p, side) {
  if (p < 0 || p >= S.N) return `<div class="page ${side}" style="height:100%"></div>`;
  const key = p + side; if (S.cache.has(key)) return S.cache.get(key);
  const [a, b] = S.pages[p], first = S.D[a][0], last = S.D[b - 1][0], c = cho1(first);
  let h = `<div class="page ${side}" style="height:100%"><div class="phead"><span>${esc(first)}</span><span class="g">${c}</span><span>${esc(last)}</span></div><div class="pin"><div class="pbody">`;
  for (let i = a; i < b; i++) h += entryHTML(i);
  h += `</div></div><div class="pfoot">${p + 1}</div></div>`;
  S.cache.set(key, h); return h;
}

/* ---------- 책 그리기 ---------- */
function layout() {
  const W = innerWidth, H = innerHeight - 52;
  S.mode = W > H * 1.05 ? 'two' : 'one';
  const T = 40, pad = 16;
  let E = Math.round(Math.max(36, Math.min(70, W * 0.055)));
  let ph = H - pad * 2 - 14, pw = ph * (S.mode === 'two' ? 0.74 : 0.76);
  const np = S.mode === 'two' ? 2 : 1;
  const maxW = W - pad * 2 - 2 * T - 2 * E - 12;
  if (pw * np > maxW) { pw = maxW / np; ph = Math.min(H - pad * 2 - 14, pw / (S.mode === 'two' ? 0.62 : 0.6)); }
  pw = Math.floor(pw); ph = Math.floor(ph);
  S.geom = { pw, ph, E, T, np, bw: T * 2 + E * 2 + pw * np, x0: T + E };
  const book = $('#book');
  book.style.width = S.geom.bw + 'px'; book.style.height = ph + 'px';
  book.innerHTML = `<div class="cover-back" style="left:${T - 8}px;right:${T - 8}px"></div>
    <div class="edge L" style="left:${T}px;width:${E}px"><div class="lines"></div><div class="grip">옆면</div></div>
    <div class="edge R" style="left:${T + E + pw * np}px;width:${E}px"><div class="lines"></div><div class="grip">옆면</div></div>
    <div class="pages" style="left:${T + E}px;width:${pw * np}px">${S.mode === 'two' ? '<div class="page L" id="pgL" style="width:' + pw + 'px"></div><div class="page R" id="pgR" style="width:' + pw + 'px"></div>' : '<div class="page one" id="pgR" style="width:' + pw + 'px"></div>'}</div>
    <div class="corner L" data-dir="-1" style="left:${T + E}px;top:${ph - 64}px">‹</div>
    <div class="corner R" data-dir="1" style="left:${T + E + pw * np - 64}px;top:${ph - 64}px">›</div>
    ${TABS.map((t, k) => `<div class="tab" data-tab="${k}" style="background:${TAB_COLORS[k]};height:${Math.floor(ph / 14) - 3}px;top:${k * ph / 14 + 1}px">${t}</div>`).join('')}`;
  document.documentElement.style.setProperty('--fs', S.fs + 'px');
}
function setView(p, hl) {
  p = Math.max(0, Math.min(p, S.N - 1));
  if (S.mode === 'two') p -= p % 2;
  S.p = p; drawView(); if (hl != null) highlight(hl);
  store.set('pos', S.pages[p][0]);
}
function fillPage(el, p, side) {
  if (!el) return;
  el.innerHTML = p >= 0 && p < S.N ? inner(pageHTML(p, side)) : '';
  const b = $('.pbody', el); fitBody(b);
}
function fitBody(b) { if (!b) return; if (b.scrollHeight > b.clientHeight + 1) b.classList.add('tight'); if (b.scrollHeight > b.clientHeight + 1) b.classList.add('tighter'); }
function wrap(h) { const d = document.createElement('div'); d.innerHTML = h; return d; }
function inner(h) { return wrap(h).firstElementChild.innerHTML; }
function drawView() {
  if (S.mode === 'two') { fillPage($('#pgL'), S.p, 'L'); fillPage($('#pgR'), S.p + 1, 'R'); }
  else fillPage($('#pgR'), S.p, 'one');
  placeTabs();
}
function span() { return S.mode === 'two' ? 2 : 1; }
function placeTabs() {
  const g = S.geom, rightEdgeX = g.x0 + g.pw * g.np + g.E;
  document.querySelectorAll('.tab').forEach(el => {
    const k = +el.dataset.tab, sp = S.secStart[k];
    const left = sp >= 0 && sp <= S.p + span() - 1 && !(sp > S.p);
    const onLeft = sp >= 0 && sp <= S.p;
    el.classList.toggle('L', onLeft); el.classList.toggle('R', !onLeft);
    el.style.left = (onLeft ? g.T - 38 + 0 : rightEdgeX) + 'px';
    el.style.opacity = sp < 0 ? 0.3 : 1;
    void left;
  });
}
function highlight(i) {
  setTimeout(() => {
    const el = document.querySelector(`.pages .ent[data-i="${i}"]`);
    if (el) { el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); setTimeout(() => el.classList.remove('hl'), 3800); }
  }, 30);
}

/* ---------- 넘기기 ---------- */
function makeLeaf(left, origin, frontHTML, backHTML, blank) {
  const g = S.geom, leaf = document.createElement('div');
  leaf.className = 'leaf' + (blank ? ' blank' : '');
  leaf.style.cssText = `left:${left}px;width:${g.pw}px;transform-origin:${origin} center`;
  leaf.innerHTML = `<div class="face front">${frontHTML}<div class="shade"></div></div><div class="face back">${backHTML}<div class="shade"></div></div>`;
  $('.pages').appendChild(leaf);
  leaf.querySelectorAll('.pbody').forEach(fitBody);
  return leaf;
}
function setAngle(leaf, a, sign) {
  leaf.style.transform = `rotateY(${sign * a}deg)`;
  const s = Math.sin(a * Math.PI / 180) * 0.9;
  leaf.querySelectorAll('.shade').forEach(x => x.style.opacity = s);
}
function canFlip(dir) { return dir > 0 ? S.p + span() < S.N : S.p > 0; }
function beginFlip(dir) {
  const g = S.geom, two = S.mode === 'two', p = S.p;
  let leaf, sign, from, to;
  if (two && dir > 0) {
    leaf = makeLeaf(g.pw, 'left', pageHTML(p + 1, 'R'), pageHTML(p + 2, 'L'));
    fillPage($('#pgR'), p + 3, 'R'); sign = -1; from = 0; to = 180;
  } else if (two && dir < 0) {
    leaf = makeLeaf(0, 'right', pageHTML(p, 'L'), pageHTML(p - 1, 'R'));
    fillPage($('#pgL'), p - 2, 'L'); sign = 1; from = 0; to = 180;
  } else if (dir > 0) {
    leaf = makeLeaf(0, 'left', pageHTML(p, 'one'), '', true);
    leaf.querySelector('.front').style.background = 'var(--paper)';
    fillPage($('#pgR'), p + 1, 'one'); sign = -1; from = 0; to = 180;
  } else {
    leaf = makeLeaf(0, 'left', pageHTML(p - 1, 'one'), '', true);
    leaf.querySelector('.front').style.background = 'var(--paper)';
    sign = -1; from = 180; to = 0;
  }
  setAngle(leaf, from, sign);
  return { leaf, sign, from, to, dir };
}
function finishFlip(f, commit, cb) {
  const target = commit ? f.to : f.from, cur = parseFloat((f.leaf.style.transform.match(/-?[\d.]+/) || [0])[0]) * f.sign;
  const dur = Math.max(140, Math.abs(target - cur) / 180 * 420);
  f.leaf.style.transition = `transform ${dur}ms cubic-bezier(.3,.6,.4,1)`;
  f.leaf.querySelectorAll('.shade').forEach(x => x.style.transition = `opacity ${dur}ms`);
  requestAnimationFrame(() => setAngle(f.leaf, target, f.sign));
  if (commit) sFlip();
  setTimeout(() => {
    f.leaf.remove();
    if (commit) S.p += f.dir * span();
    drawView(); S.busy = false; cb && cb();
    store.set('pos', S.pages[S.p][0]);
  }, dur + 20);
}
function hideHint() { const h = $('#hint1'); if (h) { h.remove(); store.set('hinted', 1); } }
function flipOnce(dir, cb) {
  hideHint();
  if (S.busy || !canFlip(dir)) { cb && cb(); return; }
  S.busy = true; const f = beginFlip(dir); requestAnimationFrame(() => finishFlip(f, true, cb));
}
function gotoPage(target, hl) {
  target = Math.max(0, Math.min(target, S.N - 1));
  const v = S.mode === 'two' ? target - target % 2 : target;
  const diff = (v - S.p) / span();
  if (diff === 0) { if (hl != null) highlight(hl); return; }
  if (Math.abs(diff) === 1) { flipOnce(Math.sign(diff), () => hl != null && highlight(hl)); return; }
  flurry(Math.sign(diff), Math.min(7, Math.ceil(Math.log2(Math.abs(diff) + 1)) + 2), () => setView(v, hl));
}
function flurry(dir, n, cb) {
  if (S.busy) return; S.busy = true;
  const g = S.geom, two = S.mode === 'two';
  const left = two ? (dir > 0 ? g.pw : 0) : 0, origin = two && dir < 0 ? 'right' : 'left';
  const sign = two && dir < 0 ? 1 : -1;
  for (let k = 0; k < n; k++) {
    setTimeout(() => {
      const leaf = makeLeaf(left, origin, '<div class="page" style="height:100%"></div>', '<div class="page" style="height:100%"></div>', true);
      const from = !two && dir < 0 ? 180 : 0, to = !two && dir < 0 ? 0 : 180;
      setAngle(leaf, from, sign); leaf.style.transition = 'transform 360ms cubic-bezier(.4,.2,.4,1)';
      requestAnimationFrame(() => requestAnimationFrame(() => setAngle(leaf, to, sign)));
      sFlip(0.6);
      setTimeout(() => leaf.remove(), 400);
    }, k * 65);
  }
  setTimeout(() => { S.busy = false; cb(); }, n * 65 + 330);
}
function gotoEntry(i, hl = true) { gotoPage(S.pageOf[i], hl ? i : null); }

/* ---------- 손가락 다루기 ---------- */
let P = null;
function edgeTarget(side, x) {
  const g = S.geom, f = Math.max(0, Math.min(1, x / g.E));
  if (side === 'L') return Math.round(f * Math.max(0, S.p - 1));
  const a = S.p + span(), b = S.N - 1; return Math.round(a + f * (b - a));
}
function showPeek(p, cx, cy) {
  const pk = $('#peek'); if (p < 0 || p >= S.N) { pk.style.display = 'none'; return; }
  const w = S.D[S.pages[p][0]][0];
  pk.innerHTML = `<span class="c">${cho1(w)}</span>${esc(w)} ~ ${esc(S.D[S.pages[p][1] - 1][0])}<small>${p + 1}쪽</small>`;
  pk.style.display = 'block'; pk.style.left = cx + 'px'; pk.style.top = cy + 'px';
}
function onDown(e) {
  if (S.busy || !S.D) return;
  ac();
  const t = e.target, book = $('#book'), r = book.getBoundingClientRect();
  const tab = t.closest('.tab'), edge = t.closest('.edge'), corner = t.closest('.corner');
  if (corner) { P = null; hideHint(); flipOnce(+corner.dataset.dir); return; }
  P = { x: e.clientX, y: e.clientY, t0: performance.now(), id: e.pointerId, kind: tab ? 'tab' : edge ? 'edge' : 'page', tab, edge, moved: false, flip: null, target: t };
  if (edge) {
    const side = edge.classList.contains('L') ? 'L' : 'R', er = edge.getBoundingClientRect();
    P.side = side; P.er = er; const tp = edgeTarget(side, e.clientX - er.left); P.tp = tp; showPeek(tp, e.clientX, er.top + 10);
  }
  book.setPointerCapture(e.pointerId); void r;
}
function onMove(e) {
  if (!P || e.pointerId !== P.id) return;
  const dx = e.clientX - P.x, dy = e.clientY - P.y;
  if (Math.hypot(dx, dy) > 10) P.moved = true;
  if (P.kind === 'edge') { P.tp = edgeTarget(P.side, e.clientX - P.er.left); showPeek(P.tp, Math.max(P.er.left - 60, Math.min(P.er.right + 60, e.clientX)), P.er.top + 10); return; }
  if (P.kind !== 'page') return;
  if (!P.flip && P.moved && Math.abs(dx) > Math.abs(dy) * 1.1 && Math.abs(dx) > 14) {
    const dir = dx < 0 ? 1 : -1;
    if (!canFlip(dir)) { P.kind = 'none'; toast(dir > 0 ? '마지막 쪽이에요' : '첫 쪽이에요'); return; }
    S.busy = true; hideHint(); P.flip = beginFlip(dir); P.dir = dir;
  }
  if (P.flip) {
    const prog = Math.max(0, Math.min(1, (-dx * P.dir) / (S.geom.pw * 1.25)));
    const f = P.flip, a = f.from + (f.to - f.from) * prog;
    setAngle(f.leaf, a, f.sign); P.prog = prog; P.vx = dx;
  }
}
function onUp(e) {
  if (!P || e.pointerId !== P.id) return;
  const p = P; P = null; $('#peek').style.display = 'none';
  if (p.kind === 'edge') { gotoPage(p.tp); return; }
  if (p.kind === 'tab' && !p.moved) { const k = +p.tab.dataset.tab; if (S.secStart[k] >= 0) gotoPage(S.secStart[k]); return; }
  if (p.flip) {
    const fast = performance.now() - p.t0 < 280 && Math.abs(e.clientX - p.x) > 30;
    finishFlip(p.flip, p.prog > 0.28 || fast); return;
  }
  if (p.kind === 'page' && !p.moved) {
    const ent = p.target.closest && p.target.closest('.ent');
    if (ent) { onEntry(+ent.dataset.i, ent); return; }
    const pr = $('.pages').getBoundingClientRect(), fx = (e.clientX - pr.left) / pr.width;
    if (fx > 0.5) flipOnce(1); else if (S.p > 0) flipOnce(-1);
  }
}

/* ---------- 쪽지 ---------- */
function openCard(html, wide) {
  const c = $('#card'); c.className = 'card' + (wide ? ' wide' : ''); c.innerHTML = '<button class="close" data-act="close">✕</button>' + html;
  $('#dim').classList.add('show'); c.scrollTop = 0;
}
function closeCard() { $('#dim').classList.remove('show'); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
function noteHTML(i) {
  const r = S.D[i], [w, hn, pos, g, senses] = r, pic = r[5];
  const rels = []; senses.forEach(s => s[2].forEach(x => { if (!rels.some(y => y[1] === x[1])) rels.push(x); }));
  return `<div class="note-top"><div class="note-pic">${pic || `<span style="font-size:46px;font-weight:700;color:var(--accent)">${esc(w[0])}</span>`}</div>
    <div><div class="note-w">${esc(w)}${hn ? `<sup>${hn}</sup>` : ''}</div>
    <div class="tagrow">${pos ? `<span class="tag">${POSNAME[pos] || pos}</span>` : ''}<span class="tag g">${GRADE[g]}</span><span class="tag">${S.pageOf[i] + 1}쪽</span><span class="tag">첫소리 ${choStr(w)}</span></div></div></div>
    <div class="btnrow"><button class="btn pri" data-act="say" data-i="${i}">🔊 읽어 주기</button><button class="btn gold" data-act="star" data-i="${i}">${S.stars.has(i) ? '★ 낱말장에서 빼기' : '☆ 낱말장에 담기'}</button></div>
    ${senses.map((s, k) => `<div class="sense">${senses.length > 1 ? `<span class="n">${CIRCLE[k] || k + 1}</span>` : ''}${esc(s[0])}${s[1] ? `<div class="ex">${esc(s[1])}</div>` : ''}</div>`).join('')}
    ${rels.length ? `<h3>비슷한말 · 반대말 <span class="small">누르면 그 낱말로 넘어가요</span></h3>${rels.map(x => `<button class="rel ${x[0] === '반' ? 'anti' : ''}" data-act="jump" data-w="${esc(x[1])}">${x[0] === '반' ? '↔ 반대말' : '≈ 비슷한말'} ${esc(x[1])}</button>`).join('')}` : ''}`;
}
function onEntry(i, el) {
  if (S.game && S.game.onBook) { gameTap(i, el); return; }
  openCard(noteHTML(i));
}

/* ---------- 놀이 ---------- */
const GAMES = {
  quick: { ic: '⏱️', name: '낱말 빨리 찾기', desc: '친구가 부탁한 낱말을 사전에서 빨리 찾아요', book: true },
  riddle: { ic: '🧩', name: '뜻풀이 수수께끼', desc: '뜻풀이를 읽고 어떤 낱말인지 찾아요', book: true },
  base: { ic: '🔍', name: '기본형 탐정', desc: '문장 속 낱말의 기본형을 찾아요', book: true },
  opp: { ic: '↔️', name: '반대말 찾기', desc: '반대되는 뜻의 낱말을 찾아요', book: true },
  order: { ic: '🔤', name: '가나다 줄 세우기', desc: '낱말 카드를 사전 순서대로 세워요', book: false },
};
const LIMIT = 100;
function setsOf(kind) { return kind === 'order' ? S.G.order : S.G[kind]; }
function gameMenu() {
  openCard(`<h2>🎲 놀이</h2><p class="small" style="margin:2px 0 12px">모든 놀이는 이 사전 위에서 해요. 반 전체가 같은 세트 번호를 고르면 같은 문제를 풀어요.</p>
  <div class="grid">${Object.entries(GAMES).map(([k, g]) => `<button class="gcard" data-act="gpick" data-k="${k}"><div class="ic">${g.ic}</div><b>${g.name}</b><span>${g.desc}</span></button>`).join('')}
  <button class="gcard" data-act="dogam"><div class="ic">📒</div><b>낱말 도감</b><span>찾은 낱말과 ★ 담은 낱말이 모여요</span></button></div>`, true);
}
let pickState = { mode: 'solo', teams: 5 };
function setMenu(kind) {
  const g = GAMES[kind], sets = setsOf(kind);
  const lv = {}; sets.forEach(s => (lv[s.level] = lv[s.level] || []).push(s));
  openCard(`<h2>${g.ic} ${g.name}</h2><p class="small" style="margin:2px 0 6px">${g.desc}${g.book ? ` · 한 판 5문제, 문제마다 ${kind === 'base' ? '시간 제한 없음' : LIMIT + '초'}` : ''}</p>
  ${g.book ? `<div style="margin:10px 0 4px"><div class="seg" id="modeSeg"><button data-act="mode" data-m="solo" class="${pickState.mode === 'solo' ? 'on' : ''}">혼자 하기</button><button data-act="mode" data-m="team" class="${pickState.mode === 'team' ? 'on' : ''}">모둠 대결</button></div>
  <span id="teamPick" style="margin-left:8px;${pickState.mode === 'team' ? '' : 'display:none'}"><span class="seg">${[2, 3, 4, 5, 6].map(n => `<button data-act="teams" data-n="${n}" class="${pickState.teams === n ? 'on' : ''}">${n}모둠</button>`).join('')}</span></span></div>
  <p class="small" id="teamNote" style="${pickState.mode === 'team' ? '' : 'display:none'}">문제마다 모둠이 차례대로 나와서 찾아요. 빨리 찾을수록 점수가 높아요.</p>` : ''}
  ${Object.entries(lv).map(([l, arr]) => `<div class="lvl">${l}</div><div class="sets">${arr.map(s => { const r = S.rec[kind + s.set]; return `<button class="set ${r ? 'done' : ''}" data-act="gstart" data-k="${kind}" data-s="${s.set}">${s.set}세트<small>${r ? '최고 ' + r : '아직 기록 없음'}</small></button>`; }).join('')}</div>`).join('')}
  <div class="btnrow"><button class="btn" data-act="games">← 놀이 고르기</button></div>`, true);
}
function startGame(kind, setNo, custom) {
  closeCard();
  const set = custom || setsOf(kind).find(s => s.set === setNo);
  if (kind === 'order') { orderGame(set); return; }
  const g = S.game = {
    kind, set, items: set.items, k: -1, onBook: true, mode: custom ? 'solo' : pickState.mode, teams: pickState.teams,
    scores: Array(6).fill(0), results: [], timer: 0, wrong: 0, flips: 0, title: custom ? (custom.title || GAMES[kind].name) : GAMES[kind].name,
    names: shuffle(S.names.slice()),
  };
  nextProblem();
  void g;
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function curTeam() { const g = S.game; return g.k % g.teams; }
function targetIdx(it) {
  if (it.i != null) return it.i;
  const c = S.idx.get(it.w) || []; return c[0];
}
function isAnswer(it, i) {
  if (it.any || it.i == null) return S.D[i][0] === it.w;
  return i === it.i;
}
function nextProblem() {
  const g = S.game; clearInterval(g.timer);
  document.querySelectorAll('.tab.flash').forEach(t => t.classList.remove('flash'));
  g.k++;
  if (g.k >= g.items.length) { endGame(); return; }
  g.t0 = Date.now(); g.wrong = 0; g.hinted = 0; g.done = false;
  renderRibbon();
  g.timer = setInterval(tickGame, 250);
}
function renderRibbon() {
  const g = S.game, it = g.items[g.k], rb = $('#ribbon');
  const no = `${g.k + 1}/${g.items.length}`;
  let main = '';
  if (g.kind === 'quick') {
    const nm = g.names[g.k % g.names.length];
    main = `<div><div class="gname">${esc(callName(nm))}가 찾는 낱말 · ${no}</div><div class="target">${esc(it.w)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</div></div>`;
  } else if (g.kind === 'riddle') {
    const clue = esc(it.clue);
    main = `<div><div class="gname">뜻풀이 수수께끼 · ${no} · 이 뜻을 가진 낱말은?</div><div class="clue">${clue}</div></div>`;
  } else if (g.kind === 'base') {
    main = `<div><div class="gname">기본형 탐정 · ${no} · 굵은 낱말의 기본형을 찾아요</div><div class="clue">${esc(it.before)}<b>${esc(it.form)}</b>${esc(it.after)}</div></div>`;
  } else if (g.kind === 'opp') {
    main = `<div><div class="gname">반대말 찾기 · ${no}</div><div class="target">${esc(it.from)}<small>의 반대말은?</small></div></div>`;
  }
  const team = g.mode === 'team' ? `<span class="team" style="background:${TEAM_COLORS[curTeam()]}">${curTeam() + 1}모둠 차례</span>` : '';
  rb.innerHTML = `${team}${main}<span class="hint" id="hint"></span><span class="time" id="time">0:00</span><button class="x" data-act="say-target">🔊</button><button class="x" data-act="quit">그만</button>`;
  rb.classList.add('show');
  $('#bar').style.visibility = 'hidden';
}
function fmt(s) { return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
function tickGame() {
  const g = S.game; if (!g || g.done) return;
  const it = g.items[g.k], sec = (Date.now() - g.t0) / 1000, ti = targetIdx(it);
  const limit = g.kind === 'base' ? 0 : LIMIT;
  const el = $('#time'); el.textContent = limit ? fmt(Math.max(0, limit - sec)) : fmt(sec);
  el.classList.toggle('late', limit && limit - sec < 15);
  if (sec > 30 && g.hinted < 1) {
    g.hinted = 1; const k = TABS.indexOf(cho1(S.D[ti][0]));
    const tab = document.querySelector(`.tab[data-tab="${k}"]`); tab && tab.classList.add('flash');
    if (g.kind === 'riddle') hint(`첫소리 힌트: ${choStr(it.w)}`);
    else hint(`'${cho1(S.D[ti][0])}' 색인을 잡아 보세요`);
  }
  if (sec > 60 && g.hinted < 2) {
    g.hinted = 2; const p = S.pageOf[ti], [a, b] = S.pages[p];
    hint(`길잡이 낱말: '${S.D[a][0]}' ~ '${S.D[b - 1][0]}' 쪽`);
  }
  if (limit && sec >= limit) {
    g.done = true; clearInterval(g.timer);
    record(false, limit);
    toast(`여기 있었어요! '${esc(S.D[ti][0])}'`, '', 2400);
    gotoEntry(ti); setTimeout(nextProblem, 2800);
  }
}
function hint(t) { const h = $('#hint'); if (h) { h.textContent = t; h.classList.add('show'); } }
function record(ok, sec) {
  const g = S.game, it = g.items[g.k];
  const r = { ok, sec: Math.round(sec), wrong: g.wrong, w: S.D[targetIdx(it)][0], team: g.mode === 'team' ? curTeam() : -1 };
  if (ok && g.mode === 'team') { const pts = 10 + Math.max(0, Math.floor((LIMIT - sec) / 10)); g.scores[curTeam()] += pts; r.pts = pts; }
  g.results.push(r);
}
function gameTap(i, el) {
  const g = S.game; if (g.done) return;
  const it = g.items[g.k];
  if (isAnswer(it, i)) {
    g.done = true; clearInterval(g.timer);
    const sec = (Date.now() - g.t0) / 1000;
    record(true, sec); sGood();
    el.classList.add('found'); setTimeout(() => el.classList.remove('found'), 1600);
    S.dogam.add(i); store.set('dogam', [...S.dogam]);
    const r = g.results[g.results.length - 1];
    const tip = it.tip ? `<br><span style="font-weight:400;font-size:15px">${esc(it.form)} → ${esc(it.w)} · ${esc(it.tip)}</span>` : '';
    toast(`딩동댕! ${Math.round(sec)}초 만에 찾았어요${r.pts ? ` · +${r.pts}점` : ''}${tip}`, 'good', it.tip ? 3000 : 1600);
    setTimeout(nextProblem, it.tip ? 3000 : 1500);
  } else {
    g.wrong++; sBad();
    el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 900);
    toast(`이건 '${esc(S.D[i][0])}'예요. 다시 찾아봐요!`, 'bad', 1400);
  }
}
function praise(rs) {
  const ok = rs.filter(r => r.ok).length, avg = ok ? rs.filter(r => r.ok).reduce((s, r) => s + r.sec, 0) / ok : 0;
  if (ok === rs.length && avg < 25) return '사전 박사! 정말 빠르게 찾았어요';
  if (ok === rs.length) return '모두 찾았어요! 끝까지 해낸 게 멋져요';
  if (ok >= rs.length - 1) return '거의 다 찾았어요! 색인과 길잡이 낱말을 쓰면 더 빨라져요';
  return '사전 찾기 연습 완료! 다음엔 색인부터 잡아 봐요';
}
function endGame() {
  const g = S.game; clearInterval(g.timer); stopGameUI();
  const rs = g.results, ok = rs.filter(r => r.ok);
  const total = ok.reduce((s, r) => s + r.sec, 0);
  let best = '';
  if (!g.set.custom && g.mode === 'solo' && ok.length === rs.length) {
    const key = g.kind + g.set.set, prev = S.rec[key], cur = total + '초';
    if (!prev || parseInt(prev) > total) { S.rec[key] = cur; store.set('rec', S.rec); best = prev ? `<p class="big-msg" style="color:var(--accent)">🎉 내 기록을 ${parseInt(prev) - total}초 줄였어요!</p>` : ''; }
  }
  let teamHTML = '';
  if (g.mode === 'team') {
    const sc = g.scores.slice(0, g.teams), mx = Math.max(...sc);
    teamHTML = `<h3>모둠 점수</h3><div class="teams">${sc.map((s, k) => `<div class="team-box" style="background:${TEAM_COLORS[k]}">${k + 1}모둠<b>${s}</b>${s === mx && mx > 0 ? '👑' : ''}</div>`).join('')}</div>`;
  }
  confetti(); sFanfare();
  openCard(`<h2>${GAMES[g.kind].ic} ${esc(g.title)} 끝!</h2><p class="big-msg">${praise(rs)}</p>${best}
    <p class="small">${ok.length}개 찾음${ok.length ? ` · 모두 ${total}초` : ''}</p>${teamHTML}
    <h3>문제별 기록</h3>${rs.map((r, k) => `<div class="res-row"><span>${k + 1}</span>${r.team >= 0 ? `<span class="tag" style="background:${TEAM_COLORS[r.team]};color:#fff">${r.team + 1}모둠</span>` : ''}<span class="w">${esc(r.w)}</span>${r.ok ? `<span class="ok">찾음 ${r.sec}초</span>` : '<span class="no">시간 끝</span>'}<span class="meta">${r.wrong ? `다른 낱말 ${r.wrong}번 누름` : '한 번에 콕!'}</span><button class="wchip" data-act="jump" data-w="${esc(r.w)}">보기</button></div>`).join('')}
    <div class="btnrow">${g.set.custom ? '' : `<button class="btn pri" data-act="gstart" data-k="${g.kind}" data-s="${g.set.set}">다시 하기</button><button class="btn" data-act="gpick" data-k="${g.kind}">다른 세트</button>`}<button class="btn" data-act="close">사전 보기</button></div>`, true);
  S.game = null;
}
function stopGameUI() {
  $('#ribbon').classList.remove('show'); $('#bar').style.visibility = '';
  document.querySelectorAll('.tab.flash').forEach(t => t.classList.remove('flash'));
}
function quitGame() { if (!S.game) return; clearInterval(S.game.timer); S.game = null; stopGameUI(); toast('놀이를 그만뒀어요'); }

/* 가나다 줄 세우기 */
function orderGame(set) {
  const words = set.words, correct = words.slice().sort((a, b) => S.idx.get(a)[0] - S.idx.get(b)[0]);
  const deck = shuffle(words.slice()); const placed = [];
  const t0 = Date.now();
  function draw(checked) {
    openCard(`<h2>🔤 가나다 줄 세우기 <span class="small">${set.set ? set.set + '세트 · ' + set.level : ''}</span></h2>
    <p class="small">사전에 먼저 나오는 낱말부터 차례로 눌러요. 잘못 놓은 카드는 다시 누르면 빠져요.</p>
    <div class="ord-slots">${correct.map((_, k) => { const w = placed[k]; let cls = ''; if (checked && w) cls = w === correct[k] ? 'ok' : 'no'; return `<div class="slot ${cls}" data-act="unplace" data-k="${k}"><small>${k + 1}</small>${w ? esc(w) : ''}${checked ? `<small>${S.pageOf[S.idx.get(correct[k])[0]] + 1}쪽 ${esc(correct[k])}</small>` : ''}</div>`; }).join('')}</div>
    <div class="ord-cards">${deck.map(w => `<button class="ocard ${placed.includes(w) ? 'used' : ''}" data-act="place" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>
    ${checked ? `<p class="big-msg">${placed.every((w, k) => w === correct[k]) ? '완벽해요! 사전 순서를 정확히 알고 있어요' : '아깝다! 아래 칸에 맞는 순서와 쪽수가 있어요'}</p>
      <p class="small">사전 순서: 첫 글자의 첫소리 → 가운데 소리 → 받침, 첫 글자가 같으면 둘째 글자를 비교해요.</p>
      <div class="btnrow">${correct.map(w => `<button class="wchip" data-act="jump" data-w="${esc(w)}">${esc(w)} 사전에서 보기</button>`).join('')}</div>
      <div class="btnrow">${set.set && set.set < S.G.order.length ? `<button class="btn pri" data-act="gstart" data-k="order" data-s="${set.set + 1}">다음 세트</button>` : ''}<button class="btn" data-act="gpick" data-k="order">세트 고르기</button></div>`
      : `<div class="btnrow"><button class="btn pri" data-act="ordcheck" ${placed.length < 5 ? 'disabled style="opacity:.5"' : ''}>확인하기</button><button class="btn" data-act="ordreset">처음부터</button></div>`}`, true);
  }
  S.order = {
    place(w) { if (!placed.includes(w) && placed.length < 5) { placed.push(w); sTick(); draw(); } },
    unplace(k) { if (placed[k]) { placed.splice(k, 1); draw(); } },
    reset() { placed.length = 0; draw(); },
    check() {
      const ok = placed.every((w, k) => w === correct[k]);
      if (ok) { sGood(); confetti(); const sec = Math.round((Date.now() - t0) / 1000); if (set.set) { const key = 'order' + set.set, prev = S.rec[key]; if (!prev || parseInt(prev) > sec) { S.rec[key] = sec + '초'; store.set('rec', S.rec); } } }
      else sBad();
      draw(true);
    }
  };
  draw();
}

/* 도감 */
function dogamCard() {
  const found = [...S.dogam].sort((a, b) => a - b), stars = [...S.stars].sort((a, b) => a - b);
  const cnt = {}; found.forEach(i => { const c = cho1(S.D[i][0]); cnt[c] = (cnt[c] || 0) + 1; });
  openCard(`<h2>📒 낱말 도감</h2><p class="small">놀이에서 찾은 낱말이 첫소리별로 모여요. 14개 도장을 모두 모아 봐요! 이 기록은 이 태블릿에만 남아요.</p>
  <div class="stamp" style="margin-top:12px">${TABS.map(t => `<div class="st ${cnt[t] ? 'on' : ''}">${t}<small>${cnt[t] ? cnt[t] + '개' : ''}</small></div>`).join('')}</div>
  <h3>찾은 낱말 ${found.length}개</h3><div class="words">${found.map(i => `<button class="wchip" data-act="jumpi" data-i="${i}">${S.D[i][5] || ''} ${esc(S.D[i][0])}</button>`).join('') || '<span class="small">놀이를 하면 여기에 모여요</span>'}</div>
  <h3>★ 내 낱말장 ${stars.length}개</h3><div class="words">${stars.map(i => `<button class="wchip" data-act="jumpi" data-i="${i}">★ ${esc(S.D[i][0])}</button>`).join('') || '<span class="small">낱말을 누르고 ☆ 낱말장에 담기를 눌러요</span>'}</div>`, true);
}

/* ---------- 설정과 선생님 메뉴 ---------- */
function settingsCard() {
  openCard(`<h2>⚙️ 설정</h2>
  <h3>글씨 크기</h3><div class="seg">${[[16, '보통'], [18, '크게'], [20, '아주 크게']].map(([v, l]) => `<button data-act="fs" data-v="${v}" class="${S.fs === v ? 'on' : ''}">${l}</button>`).join('')}</div>
  <h3>소리</h3><div class="seg"><button data-act="snd" data-v="1" class="${S.sound ? 'on' : ''}">넘김 소리 켜기</button><button data-act="snd" data-v="0" class="${!S.sound ? 'on' : ''}">끄기</button></div>
  <h3>읽어 주기 빠르기</h3><div class="seg">${[[0.75, '천천히'], [0.9, '보통'], [1.05, '빠르게']].map(([v, l]) => `<button data-act="rate" data-v="${v}" class="${S.rate === v ? 'on' : ''}">${l}</button>`).join('')}</div>
  <h3>전체 화면</h3><button class="btn" data-act="full">전체 화면으로 보기</button>
  <h3>선생님 메뉴</h3><div class="btnrow" style="margin-top:0"><button class="btn pri" data-act="maker">✏️ 문제 만들기 · QR</button><button class="btn" data-act="names">👧 우리 반 이름</button><button class="btn" data-act="find">🔎 낱말 바로 가기</button><button class="btn" data-act="about">이 사전에 대하여</button></div>`, true);
}
function namesCard() {
  openCard(`<h2>👧 우리 반 이름</h2><p class="small">낱말 빨리 찾기에서 "○○가 찾는 낱말"로 나와요. 쉼표나 줄바꿈으로 나눠 적어요. 이 태블릿에만 저장돼요.</p>
  <textarea id="nameBox" rows="5">${esc(S.names.join(', '))}</textarea>
  <div class="btnrow"><button class="btn pri" data-act="saveNames">저장</button><button class="btn" data-act="resetNames">처음 명단으로</button><button class="btn" data-act="settings">← 설정</button></div>`, true);
}
function makerCard() {
  openCard(`<h2>✏️ 선생님 문제 만들기</h2><p class="small">낱말을 적으면 문제 링크와 QR이 만들어져요. 아이들이 QR을 찍으면 바로 그 문제로 놀이를 시작해요. 문제는 링크 안에 들어 있어서 서버가 필요 없어요.</p>
  <h3>놀이</h3><div class="seg" id="mkKind"><button data-act="mk" data-v="quick" class="on">낱말 빨리 찾기</button><button data-act="mk" data-v="riddle">뜻풀이 수수께끼</button><button data-act="mk" data-v="order">가나다 줄 세우기</button></div>
  <h3>제목</h3><input type="text" id="mkTitle" placeholder="예: 3단원 낱말 찾기" value="">
  <h3>낱말 <span class="small">쉼표로 나눠 3~10개 (줄 세우기는 5개)</span></h3><textarea id="mkWords" rows="3" placeholder="나비, 사과, 무지개, 도서관, 연필"></textarea>
  <div class="btnrow"><button class="btn pri" data-act="mkgo">링크·QR 만들기</button><button class="btn" data-act="settings">← 설정</button></div>
  <div id="mkOut"></div>`, true);
  S.mkKind = 'quick';
}
function buildCustom(kind, words, title) {
  const ok = [], bad = [];
  words.forEach(w => { const c = S.idx.get(w); if (c) ok.push(w); else bad.push(w); });
  if (kind === 'order') return { set: { custom: true, words: ok.slice(0, 5), title }, ok, bad };
  const items = ok.map(w => {
    const c = S.idx.get(w), i = c[0];
    if (kind === 'riddle') { let clue = S.D[i][4][0][0]; clue = clue.split(w).join('○○'); return { w, i, any: true, clue }; }
    return { w, i, any: true, hint: c.length > 1 ? '' : '' };
  });
  return { set: { custom: true, items, title }, ok, bad };
}
function mkGo() {
  const kind = S.mkKind, words = $('#mkWords').value.split(/[,\s،、]+/).map(s => s.trim()).filter(Boolean), title = $('#mkTitle').value.trim();
  const { ok, bad } = buildCustom(kind, words, title);
  const out = $('#mkOut');
  if (kind === 'order' ? ok.length < 5 : ok.length < 1) { out.innerHTML = `<p class="small" style="color:#a0392d">사전에 있는 낱말이 ${kind === 'order' ? '5개' : '1개 이상'} 필요해요.${bad.length ? ` 사전에 없는 낱말: ${esc(bad.join(', '))}` : ''}</p>`; return; }
  const base = location.href.split('#')[0];
  const url = `${base}#play=${kind}&i=${ok.map(w => S.idx.get(w)[0].toString(36)).join('.')}${title ? '&t=' + encodeURIComponent(title) : ''}`;
  let qrHTML = '';
  try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qrHTML = q.createImgTag(6, 8); } catch (e) { qrHTML = '<p class="small">링크가 너무 길어 QR을 만들 수 없어요. 낱말 수를 줄여 주세요.</p>'; }
  out.innerHTML = `<h3>만든 문제</h3><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"><div id="qr">${qrHTML}</div>
  <div style="flex:1;min-width:220px"><p class="small">${ok.length}개 낱말: ${esc(ok.join(', '))}${bad.length ? `<br><span style="color:#a0392d">사전에 없어서 뺀 낱말: ${esc(bad.join(', '))}</span>` : ''}</p>
  <input type="text" readonly value="${esc(url)}" id="mkUrl"><div class="btnrow"><button class="btn" data-act="copy">링크 복사</button><button class="btn pri" data-act="mktry">지금 해 보기</button></div></div></div>`;
  S.mkLast = { kind, words: ok, title };
}
function aboutCard() {
  openCard(`<h2>이 사전에 대하여</h2>
  <p>버들 국어사전은 3학년 2반 친구들이 종이 사전처럼 넘기며 낱말을 찾는 연습을 하도록 만든 디지털 사전이에요. 학교 가기 전부터 4학년까지 배우는 낱말 ${S.D.length.toLocaleString()}개가 가나다순으로 ${S.N.toLocaleString()}쪽에 실려 있어요. 3·4학년 낱말에는 표시가 있어요.</p>
  <h3>낱말 자료 출처</h3>
  <p class="small">· 국립국어원 「한국어기초사전」 — 뜻풀이, 예문, 품사, 비슷한말·반대말. CC BY-SA 2.0 KR<br>
  · 국립국어원 「국어 기초 어휘 선정 및 어휘 등급화 목록」(2024) — 낱말 선별과 학년 등급. 공공누리 제1유형<br>
  · 가공 자료: 김목동, 「디지털 국어사전」(kimmokdong.github.io/dictionary) 사전 데이터, CC BY-SA 2.0 KR. 초등학생 눈높이로 고친 예문을 포함해요.<br>
  · 이 사전은 위 자료에서 1~3등급 낱말만 골라 다시 엮고 낱말 그림을 붙였어요. 가공한 데이터도 CC BY-SA 2.0 KR 조건을 따라요.</p>
  <h3>그 밖에</h3><p class="small">글꼴: Pretendard (SIL Open Font License) · 낱말 그림: 기기의 그림 글자(이모지) · 읽어 주기: 기기에 들어 있는 한국어 음성<br>놀이 기록과 낱말장은 이 기기 브라우저에만 저장되고 어디로도 보내지 않아요.</p>
  <div class="btnrow"><button class="btn" data-act="settings">← 설정</button></div>`, true);
}
function findCard() {
  openCard(`<h2>🔎 낱말 바로 가기</h2><p class="small">수업에서 보여 줄 낱말로 바로 넘어가요. (아이들은 직접 찾아보게 해 주세요!)</p>
  <input type="text" id="findBox" placeholder="낱말을 입력하세요"><div class="btnrow"><button class="btn pri" data-act="findgo">찾아가기</button></div><div id="findOut" class="words" style="margin-top:10px"></div>`);
  setTimeout(() => $('#findBox') && $('#findBox').focus(), 50);
}

/* ---------- 클릭 위임 ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) { if (e.target.id === 'dim') closeCard(); return; }
  const a = b.dataset.act;
  const acts = {
    close: closeCard, games: gameMenu, dogam: dogamCard, settings: settingsCard, about: aboutCard, names: namesCard, maker: makerCard, find: findCard,
    say: () => { const r = S.D[+b.dataset.i]; speak(r[0] + '. ' + r[4].map((s, k) => (r[4].length > 1 ? (k + 1) + '번 뜻. ' : '') + s[0] + (s[1] ? ' 예를 들면, ' + s[1] : '')).join(' ')); },
    star: () => { const i = +b.dataset.i; S.stars.has(i) ? S.stars.delete(i) : S.stars.add(i); store.set('stars', [...S.stars]); S.cache.clear(); drawView(); openCard(noteHTML(i)); },
    jump: () => { const c = S.idx.get(b.dataset.w); if (c) { closeCard(); setTimeout(() => gotoEntry(c[0]), 120); } },
    jumpi: () => { closeCard(); setTimeout(() => gotoEntry(+b.dataset.i), 120); },
    gpick: () => setMenu(b.dataset.k),
    gstart: () => startGame(b.dataset.k, +b.dataset.s),
    mode: () => { pickState.mode = b.dataset.m; setMenu(document.querySelector('[data-act="gstart"]').dataset.k); },
    teams: () => { pickState.teams = +b.dataset.n; setMenu(document.querySelector('[data-act="gstart"]').dataset.k); },
    quit: quitGame,
    'say-target': () => { const g = S.game; if (!g) return; const it = g.items[g.k]; speak(g.kind === 'riddle' ? it.clue : g.kind === 'base' ? it.before + it.form + it.after : g.kind === 'opp' ? it.from + '의 반대말' : it.w); },
    place: () => S.order.place(b.dataset.w), unplace: () => S.order.unplace(+b.dataset.k), ordreset: () => S.order.reset(), ordcheck: () => S.order.check(),
    fs: () => { const keep = S.pages[S.p][0]; S.fs = +b.dataset.v; store.set('fs', S.fs); relayout(keep); settingsCard(); },
    snd: () => { S.sound = b.dataset.v === '1'; store.set('sound', S.sound); settingsCard(); },
    rate: () => { S.rate = +b.dataset.v; store.set('rate', S.rate); settingsCard(); speak('이 빠르기로 읽어 줄게요'); },
    full: () => { const d = document.documentElement; try { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d); r && r.catch && r.catch(() => toast('여기서는 전체 화면을 쓸 수 없어요')); } catch (e) { toast('여기서는 전체 화면을 쓸 수 없어요'); } closeCard(); },
    saveNames: () => { const v = $('#nameBox').value.split(/[,\n]+/).map(s => s.trim()).filter(Boolean); if (v.length) { S.names = v; store.set('names', v); toast('이름을 저장했어요', 'good'); } settingsCard(); },
    resetNames: () => { S.names = DEFAULT_NAMES.slice(); store.set('names', S.names); namesCard(); },
    mk: () => { S.mkKind = b.dataset.v; document.querySelectorAll('#mkKind button').forEach(x => x.classList.toggle('on', x === b)); },
    mkgo: mkGo,
    copy: () => { const u = $('#mkUrl'); u.select(); try { navigator.clipboard.writeText(u.value); } catch (e) { document.execCommand('copy'); } toast('링크를 복사했어요', 'good'); },
    mktry: () => { const m = S.mkLast; startCustom(m.kind, m.words, m.title); },
    findgo: () => {
      const q = $('#findBox').value.trim(); const out = $('#findOut'); if (!q) return;
      const c = S.idx.get(q);
      if (c) { closeCard(); setTimeout(() => gotoEntry(c[0]), 120); return; }
      const sim = []; for (const [w, arr] of S.idx) { if (w.startsWith(q)) sim.push(arr[0]); if (sim.length > 20) break; }
      out.innerHTML = sim.length ? sim.map(i => `<button class="wchip" data-act="jumpi" data-i="${i}">${esc(S.D[i][0])}</button>`).join('') : '<span class="small">이 사전에 없는 낱말이에요</span>';
    },
  };
  if (acts[a]) acts[a]();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'findBox') $('[data-act="findgo"]').click();
  if ($('#dim').classList.contains('show')) { if (e.key === 'Escape') closeCard(); return; }
  if (e.key === 'ArrowRight') flipOnce(1); if (e.key === 'ArrowLeft') flipOnce(-1);
});
function startCustom(kind, words, title) {
  const { set } = buildCustom(kind, words, title);
  if (kind === 'order') { closeCard(); orderGame(set); return; }
  if (!set.items.length) { toast('문제 낱말을 찾을 수 없어요'); return; }
  pickState.mode = 'solo'; startGame(kind, 0, set);
}

/* ---------- 시작 ---------- */
function relayout(keepEntry) {
  layout(); paginate();
  const p = keepEntry != null ? S.pageOf[keepEntry] : 0;
  S.p = 0; setView(p);
}
function openBook() {
  ac();
  $('#cover').classList.add('hide');
  const keep = store.get('pos', 0);
  relayout(Math.min(keep, S.D.length - 1));
  sFlip();
  if (!store.get('hinted', 0)) { const h = document.createElement('div'); h.id = 'hint1'; h.innerHTML = '👉 종이를 손가락으로 <b>옆으로 밀면</b> 넘어가요<br><span>아래 구석의 ‹ › 를 눌러도 되고, 색인과 옆면을 잡으면 많이 넘어가요</span>'; h.onclick = hideHint; document.body.appendChild(h); }
  const m = location.hash.match(/play=(\w+)&(w|i)=([^&]*)(?:&t=([^&]*))?/);
  if (m) {
    const kind = m[1], title = m[4] ? decodeURIComponent(m[4]) : '';
    const words = m[2] === 'i' ? m[3].split('.').map(x => S.D[parseInt(x, 36)]).filter(Boolean).map(r => r[0]) : decodeURIComponent(m[3]).split(',').filter(Boolean);
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => startCustom(kind, words, title), 500);
  }
}
$('#openBtn').addEventListener('click', openBook);
$('#bGame').addEventListener('click', gameMenu);
$('#bDogam').addEventListener('click', dogamCard);
$('#bSet').addEventListener('click', settingsCard);
const book = $('#book');
book.addEventListener('pointerdown', onDown);
book.addEventListener('pointermove', onMove);
book.addEventListener('pointerup', onUp);
book.addEventListener('pointercancel', e => { if (P && P.flip) finishFlip(P.flip, false); P = null; $('#peek').style.display = 'none'; });
let rt = 0;
addEventListener('resize', () => { if (!S.D || $('#cover').classList.contains('hide') === false) return; clearTimeout(rt); rt = setTimeout(() => { if (S.busy) return; relayout(S.pages[S.p][0]); }, 250); });
load().catch(err => { $('#loadMsg').textContent = '사전을 불러오지 못했어요. 새로고침해 주세요.'; console.error(err); });
