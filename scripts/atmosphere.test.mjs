import test from 'node:test';
import assert from 'node:assert/strict';
import { atmosphereAllowed, atmosphereScene, atmosphereSize } from '../src/atmospherePolicy.js';

test('render size is bounded on laptop, retina, ultrawide and portrait screens', () => {
  for (const [w, h] of [[805, 775], [1440, 900], [3840, 2160], [5120, 1440], [900, 3000]]) {
    const size = atmosphereSize(w, h);
    assert.ok(size.width * size.height <= 800000);
    assert.ok(size.width <= 1280 && size.height <= 900);
    assert.ok(size.width <= w && size.height <= h);
    assert.ok(Math.abs(size.width / size.height - w / h) < .02);
  }
});
test('unsupported budgets and user preferences keep the ordinary image path', () => {
  const desktop = { reducedMotion: false, narrow: false, coarse: false, saveData: false, memory: 8 };
  assert.equal(atmosphereAllowed(desktop), true);
  for (const key of ['reducedMotion', 'narrow', 'coarse', 'saveData']) {
    assert.equal(atmosphereAllowed({ ...desktop, [key]: true }), false);
  }
  assert.equal(atmosphereAllowed({ ...desktop, memory: 4 }), false);
  assert.equal(atmosphereAllowed({ ...desktop, memory: undefined }), true);
});
test('only visible settled desert and ocean scenes can render', () => {
  const state = { scene: 'perspective', navigation: 'idle', enabled: true, visible: true };
  assert.equal(atmosphereScene(state), 'perspective');
  assert.equal(atmosphereScene({ ...state, scene: 'afterglow' }), 'afterglow');
  for (const scene of ['worlds', 'studio', 'project']) assert.equal(atmosphereScene({ ...state, scene }), null);
  assert.equal(atmosphereScene({ ...state, navigation: 'transitioning' }), null);
  assert.equal(atmosphereScene({ ...state, visible: false }), null);
  assert.equal(atmosphereScene({ ...state, enabled: false }), null);
});
