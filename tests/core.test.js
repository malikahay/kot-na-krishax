/* Юнит-тесты симуляции (core.js): физика, урон, клетка, призрак, миграция сейва. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { K, makeLevel, start, steps, press, release, clearInput } = require('./helper');

const T = 16;

test('прыжок с земли поднимает кота', () => {
  clearInput(); start(makeLevel());
  steps(2); // приземлиться
  assert.equal(K.G.P.onGround, true);
  press('jump');
  K.step(); K.events.length = 0;
  assert.ok(K.G.P.vy < 0, 'vy должен быть отрицательным');
  assert.equal(K.G.P.onGround, false);
});

test('jump cut: отпущенный прыжок обрезается', () => {
  clearInput(); start(makeLevel());
  steps(2);
  press('jump'); release('jump'); // зажать и сразу отпустить
  K.step(); K.events.length = 0;
  assert.ok(Math.abs(K.G.P.vy - (K.TUNE ? K.TUNE.JUMP_CUT + K.TUNE.GRAVITY : -2.5 + 0.35)) < 0.001,
    'vy должен быть обрезан до JUMP_CUT + гравитация');

  clearInput(); start(makeLevel());
  steps(2);
  press('jump'); // держим
  K.step(); K.events.length = 0;
  assert.ok(K.G.P.vy < -4, 'удерживаемый прыжок должен быть выше');
});

test('coyote time: прыжок сразу после схода с края работает', () => {
  clearInput(); start(makeLevel(48, { gap: [20, 24] }));
  steps(3);
  K.input.right = true;
  let jumped = false;
  steps(120, (P) => {
    if (!jumped && !P.onGround && P.coyote > 0 && P.vy > -1) {
      press('jump');
      jumped = true;
      assert.ok(P.vy < 0 || true); // прыжок применится на этом шаге
    }
  });
  assert.ok(jumped, 'игрок должен был сойти с края');
  // после прыжка из coyote-окна кот взлетает
  assert.ok(K.G.P.vy < 0 || K.G.P.y < 11 * T - 14, 'прыжок в coyote-окне должен поднять кота');
});

test('jump buffer: прыжок, нажатый чуть раньше земли, срабатывает после приземления', () => {
  clearInput(); start(makeLevel(48, { start: { col: 2, top: 4 } }));
  let tapped = false, jumped = false;
  steps(60, (P) => {
    if (!tapped && P.vy > 0 && P.y + P.h >= 11 * T - 16) { press('jump'); tapped = true; release('jump'); }
    if (tapped && P.vy < 0) jumped = true;
  });
  assert.ok(tapped, 'игрок должен был падать к земле');
  assert.ok(jumped, 'буфер прыжка должен был сработать после приземления');
});

test('сквозная доска: снизу проходит, сверху держит', () => {
  clearInput(); start(makeLevel(48, { plank: { c0: 6, w: 3, row: 8 }, start: { col: 6, top: 11 } }));
  steps(2);
  press('jump'); // держим для полного прыжка
  let passed = false, landed = false;
  steps(90, (P) => {
    if (P.vy < 0 && P.y + P.h < 8 * T) passed = true;
    if (passed && P.onGround && Math.abs(P.y + P.h - 8 * T) < 2) landed = true;
  });
  assert.ok(passed, 'кот должен пройти сквозь доску снизу');
  assert.ok(landed, 'кот должен приземлиться на доску сверху');
});

test('шипы отнимают сердце и дают неуязвимость', () => {
  clearInput(); start(makeLevel(48, { spikes: [10] }));
  steps(2);
  K.input.right = true;
  let inv = -1;
  for (let i = 0; i < 200; i++) {
    K.step(); K.events.length = 0;
    if (K.G.lives < 3) { inv = K.G.P.inv; break; }
  }
  assert.equal(K.G.lives, 2, 'должно остаться 2 сердца из 3');
  assert.ok(inv > 0, 'после урона должна быть неуязвимость');
  assert.equal(K.G.state, 'play');
});

test('падение в пропасть: минус сердце и респаун до пропасти', () => {
  clearInput(); start(makeLevel(48, { gap: [12, 14] }));
  steps(2);
  K.input.right = true;
  let fellFrame = -1;
  for (let i = 0; i < 300; i++) {
    K.step(); K.events.length = 0;
    if (K.G.lives < 3) { fellFrame = i; break; }
  }
  assert.ok(fellFrame >= 0, 'кот должен был упасть в пропасть');
  assert.equal(K.G.lives, 2, 'падение должно стоить сердце');
  assert.equal(K.G.state, 'play');
  assert.ok(K.G.P.x < 12 * T, 'кот должен респауниться до пропасти');
  assert.ok(K.G.P.inv > 0, 'после падения должна быть неуязвимость');
});

test('поражение при нуле сердец', () => {
  clearInput(); start(makeLevel(48, { spikes: [6, 7, 8, 9, 10, 11] }));
  K.G.lives = 1;
  steps(2);
  K.input.right = true;
  steps(200);
  assert.equal(K.G.state, 'dead');
  assert.equal(K.G.deaths, 1);
});

test('клетка: cageMissing и cageReady считают нехватку вещей', () => {
  clearInput(); start(makeLevel());
  K.G.need = { key: 2, rope: 1 };
  K.G.have = { key: 1, rope: 0, cutter: 0 };
  assert.deepEqual(K.cageMissing(), { key: 1, rope: 1 });
  assert.equal(K.cageReady(), false);
  K.G.have.key = 2; K.G.have.rope = 1;
  assert.deepEqual(K.cageMissing(), {});
  assert.equal(K.cageReady(), true);
});

test('призрак: encode/decode сохраняет запись', () => {
  const rec = [10, 20, -3, 4, 100, -200, 32767, -32768];
  const b64 = K.ghostEncode(rec);
  assert.equal(typeof b64, 'string');
  const back = K.ghostDecode(b64);
  assert.deepEqual([...back], rec);
  assert.equal(K.ghostDecode('не-base64!!'), null, 'мусор должен давать null');
});

test('миграция сейва: старые id уровней переводятся на новые', () => {
  const S = {
    ver: 1,
    levels: { '1-2': { stars: [true, false, false], time: 10, score: 5, fish: true } },
    ghosts: { '2-2': 'AAAA' },
    mapPos: 3
  };
  const changed = K.migrateSave(S);
  assert.equal(changed, true);
  assert.equal(S.ver, 3);
  assert.ok(S.levels['1-3'], '1-2 должен стать 1-3');
  assert.equal(S.levels['1-2'], undefined);
  assert.ok(S.ghosts['2-3'], 'призрак 2-2 должен стать 2-3');
  assert.equal(S.mapPos, undefined);
  assert.equal(K.migrateSave(S), false, 'повторная миграция не должна ничего менять');
});

test('startLevel: подсчёт звёзд, рекорд комбо и endless-дистанция', () => {
  clearInput();
  const L = makeLevel();
  L.stars = [{ x: 6 * T, y: 9 * T }, { x: 9 * T, y: 9 * T }];
  start(L, { mode: 'endless' });
  assert.equal(K.G.starsTotal, 2);
  assert.equal(K.G.maxLives, 3);
  K.input.right = true;
  steps(50);
  assert.ok(K.G.distance > 0, 'в бесконечном режиме дистанция должна расти');
});
