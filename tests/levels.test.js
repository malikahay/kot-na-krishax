/* Юнит-тесты генератора уровней (levels.js): детерминизм, предметы, границы. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { K } = require('./helper');

const T = 16;

test('rng: одинаковое зерно — одинаковая последовательность, значения в [0,1)', () => {
  const a = K.rng(42), b = K.rng(42), c = K.rng(43);
  const va = [], vb = [], vc = [];
  for (let i = 0; i < 20; i++) { va.push(a()); vb.push(b()); vc.push(c()); }
  assert.deepEqual(va, vb);
  assert.notDeepEqual(va, vc);
  for (const v of va) assert.ok(v >= 0 && v < 1);
});

test('кампания: одинаковый уровень собирается одинаково', () => {
  const def = K.LEVEL['1-2'];
  const a = JSON.stringify(K.buildLevel(def));
  const b = JSON.stringify(K.buildLevel(def));
  assert.equal(a, b);
});

test('процедурный уровень: разные зёрна дают разные уровни', () => {
  const a = JSON.stringify(K.buildProcedural(1, 10, false));
  const b = JSON.stringify(K.buildProcedural(2, 10, false));
  const a2 = JSON.stringify(K.buildProcedural(1, 10, false));
  assert.notEqual(a, b);
  assert.equal(a, a2, 'одно зерно должно воспроизводиться');
});

test('предметы: ровно столько, сколько требует уровень, и до клетки', () => {
  for (const id of ['1-4', '2-2', '2-5', '3-5']) {
    const def = K.LEVEL[id];
    const L = K.buildLevel(def);
    const needSum = Object.values(def.need || {}).reduce((s, n) => s + n, 0);
    const want = needSum + (def.kits || 0);
    assert.equal(L.items.length, want, `${id}: предметов должно быть ${want}`);
    const counts = {};
    for (const it of L.items) counts[it.type] = (counts[it.type] || 0) + 1;
    for (const k in def.need) assert.equal(counts[k] || 0, def.need[k], `${id}: ${k}`);
    if (L.cage) for (const it of L.items) assert.ok(it.x < L.cage.col * T, `${id}: предметы должны быть до клетки`);
  }
});

test('все уровни кампании: звёзды и старт в границах, пар > 0', () => {
  for (const def of K.LEVELS) {
    const L = K.buildLevel(def);
    assert.ok(L.par > 0, `${def.id}: пар должен быть задан`);
    assert.ok(L.start.col >= 0 && L.start.col < L.w, `${def.id}: старт в границах`);
    assert.equal(L.g.length, K.ROWS, `${def.id}: высота сетки`);
    for (const s of L.stars) {
      assert.ok(s.x >= 0 && s.x <= L.w * T, `${def.id}: звезда по x (${s.x})`);
      assert.ok(s.y >= 0 && s.y <= K.ROWS * T, `${def.id}: звезда по y (${s.y})`);
    }
    for (const e of L.enemies) assert.ok(e.col >= 0 && e.col < L.w, `${def.id}: враг в границах`);
  }
});

test('рыбки-секреты: на каждом обычном уровне есть рыбка с умением-воротами', () => {
  for (const def of K.STORY_LEVELS) {
    const L = K.buildLevel(def);
    assert.equal(L.fish.length, 1, `${def.id}: ровно одна рыбка`);
    assert.ok(L.fish[0].gate, `${def.id}: у рыбки должны быть ворота-умение`);
    assert.ok(K.ABIL_FRIEND[L.fish[0].gate], `${def.id}: умение должно существовать`);
  }
});

test('trapTierOf: уровни идут по возрастанию силы ловушек', () => {
  let prev = -1;
  for (const def of K.STORY_LEVELS) {
    const t = K.trapTierOf(def);
    assert.ok(t >= 0 && t < K.TRAPS.length, `${def.id}: тир в границах`);
    assert.ok(t >= prev, `${def.id}: тир не должен уменьшаться`);
    prev = t;
  }
  assert.equal(K.trapTierOf(K.LEVEL['1-0']), 0, 'обучение — с первой ловушкой');
});

test('боссы: арена строится с боссом и без клетки', () => {
  for (const id of ['1-B', '2-B', '3-B']) {
    const L = K.buildLevel(K.LEVEL[id]);
    assert.ok(L.boss, `${id}: босс должен быть`);
    assert.equal(L.cage, null, `${id}: на арене нет клетки`);
    assert.ok(L.arena, `${id}: это арена`);
  }
});

test('обучение: строится с подсказками', () => {
  const L = K.buildLevel(K.LEVEL['1-0']);
  assert.ok(L.tutorial);
  assert.ok(L.tips.length > 5, 'в обучении должно быть много подсказок');
  assert.ok(L.items.some(i => i.type === 'key'), 'в обучении есть ключ');
});

test('dailySeed/dailyKey: стабильный формат', () => {
  const d = new Date(2026, 10, 11); // 11 ноября 2026
  assert.equal(K.dailySeed(d), 20261111);
  assert.equal(K.dailyKey(d), '2026-11-11');
});
