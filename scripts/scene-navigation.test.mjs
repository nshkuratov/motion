import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneNavigation, createScrollThrottle, SCENE_MOTION } from '../src/sceneNavigation.js';

const scenes = [{ id: 'worlds', progress: 0 }, { id: 'perspective', progress: .44 }, { id: 'afterglow', progress: .94 }];
function harness({ reducedMotion = false } = {}) {
  let time = 0, serial = 0;
  const frames = new Map(), handlers = new Map(), history = [];
  const target = { closest: () => null };
  const win = {
    scrollY: 0, innerHeight: 800, performance: { now: () => time },
    requestAnimationFrame: fn => { const id = ++serial; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    scrollTo: ({ top }) => { win.scrollY = top; },
    getComputedStyle: () => ({ scrollPaddingTop: '90px' }),
    history: { replaceState: (_, __, hash) => history.push(hash) },
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name, fn) => { if (handlers.get(name) === fn) handlers.delete(name); },
  };
  const element = top => ({ getBoundingClientRect: () => ({ top: top - win.scrollY }) });
  const story = { ...element(0), dataset: {}, offsetHeight: 4640,
    querySelector: () => ({ offsetHeight: 800 }), querySelectorAll: () => [element(0), element(800), element(1600)] };
  const doc = { documentElement: {}, getElementById: id => id === 'worlds' ? story : id === 'studio' ? element(4640) : null };
  const controller = createSceneNavigation({ win, doc, scenes, reducedMotion, isMenuOpen: () => false });
  function advance(ms) {
    const until = time + ms;
    while (time < until) {
      time = Math.min(until, time + 16);
      const scheduled = [...frames.values()]; frames.clear();
      scheduled.forEach(fn => fn(time));
    }
  }
  function event(name, overrides = {}) {
    const e = { target, deltaX: 0, deltaY: 100, deltaMode: 0, prevented: false, preventDefault() { this.prevented = true; }, ...overrides };
    handlers.get(name)?.(e); return e;
  }
  return { ...controller, win, story, history, handlers, advance, event, frames };
}

test('a large wheel burst completes exactly one slide, never a queued slide', () => {
  const h = harness();
  h.event('wheel', { deltaY: 10000 });
  for (let i = 0; i < 100; i++) { h.advance(10); h.event('wheel'); }
  h.advance(1800);
  assert.equal(h.win.scrollY, 3840 * .44);
  assert.deepEqual(h.history, ['#perspective']);
  assert.equal(h.frames.size, 0);
  h.event('wheel'); h.advance(SCENE_MOTION.duration);
  assert.equal(h.win.scrollY, 3840 * .94);
});

test('click and wheel use the same timing, trajectory and exact destination', () => {
  const a = harness(), b = harness();
  a.navigate('perspective'); b.event('wheel');
  for (const fraction of [.125, .25, .375, .25]) {
    const elapsed = SCENE_MOTION.duration * fraction;
    a.advance(elapsed); b.advance(elapsed);
    assert.equal(a.win.scrollY, b.win.scrollY);
  }
  assert.equal(a.win.scrollY, 3840 * .44);
});

test('repeated click, opposite wheel and held key cannot interrupt or queue navigation', () => {
  const h = harness(); h.navigate('perspective'); h.advance(SCENE_MOTION.duration / 2);
  assert.equal(h.navigate('afterglow'), false);
  h.event('wheel', { deltaY: -500 });
  h.event('keydown', { key: 'ArrowDown', repeat: true });
  h.advance(SCENE_MOTION.duration / 2);
  assert.equal(h.navigate('afterglow'), true);
  assert.deepEqual(h.history, ['#perspective', '#afterglow']);
});

test('trackpad momentum after the pause is discarded until a fresh gesture', () => {
  const throttle = createScrollThrottle();
  assert.equal(throttle(40, 0, false), 1);
  const lockTime = SCENE_MOTION.duration + SCENE_MOTION.pause;
  for (let time = 20; time < lockTime + 100; time += 20) assert.equal(throttle(80, time, time < lockTime), 0);
  assert.equal(throttle(50, lockTime + 400, false), 1);
  assert.equal(throttle(-50, lockTime + 650, false), -1);
});

test('small trackpad deltas accumulate; isolated jitter does not change scenes', () => {
  const throttle = createScrollThrottle();
  assert.equal(throttle(5, 0, false), 0);
  assert.equal(throttle(5, 300, false), 0);
  assert.equal(throttle(12, 320, false), 0);
  assert.equal(throttle(16, 340, false), 1);
});

test('the studio releases normal downward scrolling, with a reverse step into Afterglow', () => {
  const h = harness(); h.navigate('studio', true);
  assert.equal(h.event('wheel').prevented, false);
  assert.equal(h.event('wheel', { deltaY: -100 }).prevented, true);
  h.advance(SCENE_MOTION.duration);
  assert.equal(h.win.scrollY, 3840 * .94);
  h.advance(SCENE_MOTION.pause + 1);
  h.event('wheel', { deltaY: -100 }); h.advance(SCENE_MOTION.duration);
  assert.equal(h.win.scrollY, 3840 * .44);
});

test('reduced motion, zoom, horizontal gestures and editable fields retain native input', () => {
  const reduced = harness({ reducedMotion: true });
  assert.equal(reduced.event('wheel').prevented, false);
  reduced.navigate('afterglow'); assert.equal(reduced.win.scrollY, 1600);
  assert.equal(reduced.frames.size, 0);
  const h = harness();
  assert.equal(h.event('wheel', { ctrlKey: true }).prevented, false);
  assert.equal(h.event('wheel', { deltaX: 300 }).prevented, false);
  assert.equal(h.event('keydown', { key: 'ArrowDown', target: { closest: () => ({}) } }).prevented, false);
});

test('one finger swipe advances once; pinch remains native; cleanup cancels work', () => {
  const h = harness();
  h.event('touchstart', { touches: [{ clientX: 100, clientY: 600 }] });
  h.event('touchmove', { touches: [{ clientX: 100, clientY: 500 }] });
  h.advance(2200);
  h.event('touchmove', { touches: [{ clientX: 100, clientY: 300 }] });
  assert.deepEqual(h.history, ['#perspective']);
  assert.equal(h.event('touchmove', { touches: [{ clientX: 100, clientY: 300 }, { clientX: 200, clientY: 300 }] }).prevented, false);
  h.navigate('afterglow'); h.destroy();
  assert.equal(h.frames.size, 0); assert.equal(h.handlers.size, 0);
});
