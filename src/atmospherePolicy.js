export const ATMOSPHERE = { fps: 30, maxPixels: 800_000, maxWidth: 1280, maxHeight: 900 };

export function atmosphereSize(width, height) {
  const scale = Math.min(1, ATMOSPHERE.maxWidth / width, ATMOSPHERE.maxHeight / height,
    Math.sqrt(ATMOSPHERE.maxPixels / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

export function atmosphereAllowed({ reducedMotion, narrow, coarse, saveData, memory }) {
  return !reducedMotion && !narrow && !coarse && !saveData && !(memory > 0 && memory <= 4);
}

export function atmosphereScene({ scene, navigation, enabled, visible }) {
  return enabled && visible && navigation !== 'transitioning' && ['perspective', 'afterglow'].includes(scene)
    ? scene : null;
}
