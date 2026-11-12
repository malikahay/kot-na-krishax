/* Загрузка игрового ядра в Node для юнит-тестов.
   core.js / levels.js / data.js не используют DOM, поэтому работают как есть. */
'use strict';
const path = require('path');

if (!global.window) global.window = {};
if (!global.window.KOT) {
  require(path.join(__dirname, '../js/data.js'));
  require(path.join(__dirname, '../js/levels.js'));
  require(path.join(__dirname, '../js/core.js'));
}

const K = global.window.KOT;

/* Минимальный уровень: сплошная крыша на строке 11, пустота сверху.
   Параметры opts: gap:[c0,c1] — провал в крыше, spikes:[col,…] — шипы,
   plank:{c0,w,row} — сквозная доска, start:{col,top} — точка старта. */
function makeLevel(w = 48, opts = {}) {
  const g = [];
  for (let r = 0; r < K.ROWS; r++) g.push(new Uint8Array(w));
  for (let c = 0; c < w; c++) for (let r = 11; r < K.ROWS; r++) g[r][c] = 1;
  if (opts.gap) for (let c = opts.gap[0]; c <= opts.gap[1]; c++) for (let r = 11; r < K.ROWS; r++) g[r][c] = 0;
  for (const c of opts.spikes || []) g[10][c] = 3;
  if (opts.plank) for (let i = 0; i < opts.plank.w; i++) g[opts.plank.row][opts.plank.c0 + i] = 2;
  return {
    w, rows: K.ROWS, g,
    stars: [], hearts: [], fish: [], enemies: [], springs: [], movers: [],
    falls: [], winds: [], checks: [], decor: [], blds: [], items: [],
    drips: [], geysers: [], darks: [],
    cage: null, goal: null, boss: null,
    start: opts.start || { col: 2, top: 11 },
    par: 60
  };
}

function start(L, opts = {}) {
  K.events.length = 0;
  K.startLevel(L, Object.assign({ mode: 'story', abil: [] }, opts));
}

/* Прокрутка n кадров; fn(P, G) вызывается перед каждым шагом (для ввода). */
function steps(n, fn) {
  for (let i = 0; i < n; i++) {
    if (fn) fn(K.G.P, K.G);
    K.step();
    K.events.length = 0;
    if (K.G.state !== 'play') return i + 1;
  }
  return n;
}

function press(k) {
  K.input[k] = true;
  K.input.taps[k] = 1;
}

function release(k) { K.input[k] = false; }

function clearInput() {
  for (const k of ['left', 'right', 'jump', 'dash', 'paw', 'trap']) { K.input[k] = false; K.input.taps[k] = 0; }
}

module.exports = { K, makeLevel, start, steps, press, release, clearInput };
