/* Юнит-тесты интерфейса (ui.js): строки настроек, экранирование. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// минимальные заглушки браузера — ui.js не должен требовать реальный DOM
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, addEventListener() {} }),
  hidden: false
};
global.matchMedia = global.matchMedia || (() => ({ matches: false }));
global.requestAnimationFrame = global.requestAnimationFrame || (fn => setTimeout(fn, 16));
global.performance = global.performance || { now: () => Date.now() };
global.addEventListener = global.addEventListener || (() => {});
global.removeEventListener = global.removeEventListener || (() => {});
global.innerWidth = global.innerWidth || 1280;
global.innerHeight = global.innerHeight || 720;

const { K } = require('./helper');
require('../js/ui.js');

test('optRows: качество графики, тряска и мягкие вспышки на месте', () => {
  const html = K.ui.optRows({ quality: 'auto', shake: true, softFx: false });
  assert.ok(html.includes('Качество графики'), 'строка качества');
  assert.ok(html.includes('data-act="optquality"'), 'кнопки качества');
  assert.ok(html.includes('data-act="optshake"'), 'переключатель тряски');
  assert.ok(html.includes('data-act="optsoft"'), 'переключатель вспышек');
  assert.ok(html.includes("data-v=\"low\""), 'низкое качество');
});

test('optRows: старые сейвы без новых полей получают настройки по умолчанию', () => {
  const html = K.ui.optRows({});
  assert.ok(html.includes('data-act="optdog"'), 'режим пса');
  assert.ok(html.includes('data-act="optfriends"'), 'друзья рядом');
  // shake и softFx читают значения с фолбэками: пустой объект не должен ломать разметку
  assert.ok(html.includes('sw2 on'), 'тряска по умолчанию включена');
});
