import { useEffect } from 'react';
import { atmosphereAllowed, atmosphereScene } from './atmospherePolicy.js';

// Mount no canvas and download no Pixi code until an eligible scene is resting.
export default function Atmosphere({ stageRef, reducedMotion }) {
  useEffect(() => {
    const stage = stageRef.current;
    const story = stage.closest('.worlds-scroll');
    const narrow = matchMedia('(max-width: 680px)');
    const coarse = matchMedia('(pointer: coarse)');
    const connection = navigator.connection;
    let disposed = false, pending = false, failed = false, runtime = null;
    let timer = 0;

    function desired() {
      if (!atmosphereAllowed({ reducedMotion, narrow: narrow.matches, coarse: coarse.matches,
        saveData: connection?.saveData, memory: navigator.deviceMemory })) return null;
      return atmosphereScene({ scene: story.dataset.scene, navigation: story.dataset.navigation,
        enabled: stage.dataset.cameraEnabled === 'true', visible: stage.dataset.cameraVisible === 'true' && !document.hidden });
    }

    async function load() {
      timer = 0;
      if (disposed || !desired() || pending || failed) return;
      pending = true;
      stage.dataset.atmosphere = 'loading';
      try {
        const { createAtmosphere } = await import('./pixiAtmosphere.js');
        if (disposed) return;
        runtime = await createAtmosphere(stage, () => {
          failed = true;
          runtime?.destroy();
          runtime = null;
          stage.dataset.atmosphere = 'fallback';
        });
        if (disposed) { runtime.destroy(); return; }
        update();
      } catch {
        failed = true;
        if (!disposed) stage.dataset.atmosphere = 'fallback';
      } finally { pending = false; }
    }

    function update() {
      if (disposed || failed) return;
      const scene = desired();
      if (runtime) {
        if (scene) runtime.show(scene);
        else runtime.pause();
      } else if (scene && !pending && !timer) {
        // Let navigation and image painting finish before loading optional effects.
        timer = window.setTimeout(load, 350);
      } else if (!scene && timer) {
        clearTimeout(timer); timer = 0;
      }
    }

    const observer = new MutationObserver(update);
    observer.observe(stage, { attributes: true, attributeFilter: ['data-camera-enabled', 'data-camera-visible'] });
    observer.observe(story, { attributes: true, attributeFilter: ['data-scene', 'data-navigation'] });
    narrow.addEventListener('change', update);
    coarse.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      narrow.removeEventListener('change', update);
      coarse.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      runtime?.destroy();
      delete stage.dataset.atmosphere;
    };
  }, [stageRef, reducedMotion]);
  return null;
}
