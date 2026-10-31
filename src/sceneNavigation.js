export const SCENE_MOTION = { duration: 1800, pause: 0, gestureGap: 180, threshold: 32 };

// Leading-edge throttle: discard extra input, never queue another slide.
// A trackpad's momentum must stop before it can become a new gesture.
export function createScrollThrottle() {
  let lastAt = -Infinity;
  let amount = 0;
  let blockedGesture = false;
  return (delta, now, locked) => {
    if (now - lastAt >= SCENE_MOTION.gestureGap) {
      amount = 0;
      blockedGesture = false;
    }
    lastAt = now;
    if (locked) { amount = 0; blockedGesture = true; return 0; }
    if (blockedGesture) return 0;
    if (Math.sign(amount) !== Math.sign(delta)) amount = 0;
    amount += delta;
    if (Math.abs(amount) < SCENE_MOTION.threshold) return 0;
    const direction = Math.sign(amount);
    amount = 0;
    blockedGesture = true;
    return direction;
  };
}

const ease = t => t * t * t * (t * (t * 6 - 15) + 10);

export function createSceneNavigation({ win, doc, scenes, reducedMotion, isMenuOpen }) {
  const story = doc.getElementById('worlds');
  const throttle = createScrollThrottle();
  let frame = 0;
  let destination = null;
  let releaseAt = 0;
  let touch = null;
  const now = () => win.performance.now();
  const locked = () => destination !== null || now() < releaseAt;
  const editable = target => target?.closest?.('input, textarea, select, [contenteditable="true"]');

  function position(id) {
    const index = scenes.findIndex(scene => scene.id === id);
    if (index !== -1) {
      if (reducedMotion) return story.querySelectorAll('.world')[index].getBoundingClientRect().top + win.scrollY;
      const start = story.getBoundingClientRect().top + win.scrollY;
      return start + (story.offsetHeight - story.querySelector('.worlds-stage').offsetHeight) * scenes[index].progress;
    }
    const target = doc.getElementById(id);
    if (!target) return null;
    const padding = parseFloat(win.getComputedStyle(doc.documentElement).scrollPaddingTop) || 0;
    return Math.max(0, target.getBoundingClientRect().top + win.scrollY - padding);
  }

  function mark(state) { story.dataset.navigation = state; }

  function navigate(id, instant = false) {
    const target = position(id);
    if (target === null || (!instant && locked())) return false;
    win.cancelAnimationFrame(frame);
    destination = null;
    win.history.replaceState(null, '', `#${id}`);
    const from = win.scrollY;
    if (instant || reducedMotion || Math.abs(target - from) < 1) {
      win.scrollTo({ top: target, behavior: 'instant' });
      releaseAt = 0;
      mark('idle');
      return true;
    }
    destination = id;
    mark('transitioning');
    const startedAt = now();
    function tick(time) {
      const progress = Math.min(1, (time - startedAt) / SCENE_MOTION.duration);
      const to = position(id);
      win.scrollTo({ top: from + (to - from) * ease(progress), behavior: 'instant' });
      if (progress < 1) frame = win.requestAnimationFrame(tick);
      else {
        destination = null;
        releaseAt = time + SCENE_MOTION.pause;
        mark(SCENE_MOTION.pause > 0 ? 'resting' : 'idle');
        frame = 0;
      }
    }
    frame = win.requestAnimationFrame(tick);
    return true;
  }

  function ownsInput(direction) {
    if (reducedMotion || isMenuOpen()) return false;
    if (locked()) return true;
    mark('idle');
    const start = position(scenes[0].id);
    const end = position('studio');
    return direction > 0
      ? win.scrollY >= start - 2 && win.scrollY < end - 2
      : win.scrollY > start + 2 && win.scrollY <= end + 2;
  }

  function step(direction) {
    const stops = [...scenes.map(scene => scene.id), 'studio'];
    let closest = 0;
    stops.forEach((id, index) => {
      if (Math.abs(position(id) - win.scrollY) < Math.abs(position(stops[closest]) - win.scrollY)) closest = index;
    });
    const next = Math.max(0, Math.min(stops.length - 1, closest + direction));
    return next !== closest && navigate(stops[next]);
  }

  function wheel(event) {
    if (event.ctrlKey || event.metaKey || editable(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    if (!ownsInput(Math.sign(event.deltaY))) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? win.innerHeight : 1;
    const direction = throttle(event.deltaY * unit, now(), locked());
    if (direction) step(direction);
  }

  function key(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || editable(event.target)) return;
    if (event.key === ' ' && event.target?.closest?.('button, a, summary')) return;
    const direction = ['ArrowDown', 'PageDown'].includes(event.key) || (event.key === ' ' && !event.shiftKey) ? 1
      : ['ArrowUp', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey) ? -1 : 0;
    if (!direction || !ownsInput(direction)) return;
    event.preventDefault();
    if (!event.repeat && !locked()) step(direction);
  }

  function touchStart(event) {
    touch = event.touches.length === 1 && !editable(event.target)
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY, consumed: false } : null;
  }
  function touchMove(event) {
    if (!touch || event.touches.length !== 1) return;
    const dy = touch.y - event.touches[0].clientY;
    const dx = touch.x - event.touches[0].clientX;
    if (Math.abs(dx) > Math.abs(dy) || !dy || !ownsInput(Math.sign(dy))) return;
    event.preventDefault();
    if (touch.consumed) return;
    if (locked()) { touch.consumed = true; return; }
    if (Math.abs(dy) >= SCENE_MOTION.threshold) { touch.consumed = true; step(Math.sign(dy)); }
  }
  const touchEnd = () => { touch = null; };
  function resize() {
    if (!destination) return;
    const id = destination;
    navigate(id, true);
    releaseAt = now() + SCENE_MOTION.pause;
  }

  win.addEventListener('wheel', wheel, { passive: false });
  win.addEventListener('keydown', key);
  win.addEventListener('touchstart', touchStart, { passive: true });
  win.addEventListener('touchmove', touchMove, { passive: false });
  win.addEventListener('touchend', touchEnd);
  win.addEventListener('touchcancel', touchEnd);
  win.addEventListener('resize', resize);
  return {
    navigate,
    destroy() {
      win.cancelAnimationFrame(frame);
      for (const [name, handler] of Object.entries({ wheel, keydown: key, touchstart: touchStart, touchmove: touchMove, touchend: touchEnd, touchcancel: touchEnd, resize })) win.removeEventListener(name, handler);
      delete story.dataset.navigation;
    },
  };
}
