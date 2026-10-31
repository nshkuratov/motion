import React, { useEffect, useRef } from 'react';
import './motion.css';
import Atmosphere from './Atmosphere.jsx';

export const scenes = [
  { id: 'worlds', name: 'Cloud nine', progress: 0 },
  { id: 'perspective', name: 'Otherworld', progress: .44 },
  { id: 'afterglow', name: 'Afterglow', progress: .94 },
];

function DownArrow() {
  return <svg className="arrow arrow-down" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Lines({ words }) {
  return words.map((word, index) => <span className="story-line motion-layer" data-line={index} style={{ '--line': index }} key={word}>{index === words.length - 1 ? <em>{word}</em> : word}</span>);
}

export default function Worlds({ active, reducedMotion, menuOpen, follow, goTo }) {
  const stageRef = useRef(null);
  const pointerEnabled = !reducedMotion && !menuOpen && active < scenes.length;
  useEffect(() => {
    const stage = stageRef.current;
    let inView = false;
    const update = () => { stage.dataset.cameraVisible = String(inView && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(stage);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useEffect(() => {
    const stage = stageRef.current;
    if (!pointerEnabled) return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let cursor = null;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      cursor = null;
      stage.style.removeProperty('--pointer-x');
      stage.style.removeProperty('--pointer-y');
    };
    const flush = () => {
      frame = 0;
      const rect = stage.getBoundingClientRect();
      if (!cursor || cursor.x < rect.left || cursor.x > rect.right || cursor.y < rect.top || cursor.y > rect.bottom) { reset(); return; }
      const x = Math.max(-1, Math.min(1, (cursor.x - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (cursor.y - rect.top) / rect.height * 2 - 1));
      stage.style.setProperty('--pointer-x', x.toFixed(4));
      stage.style.setProperty('--pointer-y', y.toFixed(4));
    };
    const move = event => {
      if (!media.matches || event.pointerType !== 'mouse') return;
      cursor = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset);
    document.documentElement.addEventListener('pointerleave', reset);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', reset);
    return () => {
      reset();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', reset);
      document.documentElement.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', reset);
    };
  }, [pointerEnabled]);
  const sceneIndex = Math.min(active, scenes.length - 1);
  const nextScene = scenes[sceneIndex + 1];
  return <div className="worlds-scroll" id="worlds" data-scene={scenes[sceneIndex].id}>
    <div id="perspective" className="world-anchor" aria-hidden="true" />
    <div id="afterglow" className="world-anchor world-anchor-last" aria-hidden="true" />
    <div className="worlds-stage" ref={stageRef} data-camera-enabled={pointerEnabled}>
      <div className="world-backdrops" aria-hidden="true">
        <div className="world-backdrop cloud-backdrop motion-layer"><img className="world-camera" src="/images/cloud-background.webp" alt="" fetchPriority="high" /></div>
        <div className="world-backdrop desert-backdrop motion-layer"><div className="world-camera"><img src="/images/desert-background.webp" alt="" /></div></div>
        <div className="world-backdrop ocean-backdrop motion-layer"><div className="world-camera"><img src="/images/ocean-background.webp" alt="" /></div></div>
      </div>
      <Atmosphere stageRef={stageRef} reducedMotion={reducedMotion} />

      <section className="world world-cloud" aria-labelledby="hero-title" inert={!reducedMotion && active !== 0}>
        <div className="world-object orbit-object motion-layer" aria-hidden="true"><img src="/images/chrome-orbit.webp" alt="" fetchPriority="high" /></div>
        <div className="cloud-foreground motion-layer" aria-hidden="true"><img src="/images/cloud-foreground.webp" alt="" /></div>
        <div className="world-scrim cloud-scrim motion-layer" />
        <div className="world-copy"><h1 id="hero-title" aria-label="Ideas beyond ordinary."><Lines words={['Ideas', 'beyond', 'ordinary.']} /></h1><a className="text-link world-link motion-layer" href="#perspective" onClick={e => follow(e, 'perspective')}>Scroll into the unexpected <span className="circle"><DownArrow /></span></a></div>
        <p className="world-description motion-layer">A little unexpected.<br />Entirely unforgettable.<br /><span>Brands, experiences & everything between.</span></p>
        <div className="world-caption motion-layer"><span>Cloud nine</span><span>Art direction concept / 2026</span></div>
      </section>

      <section className="world world-desert" aria-labelledby="perspective-title" inert={!reducedMotion && active !== 1}>
        <div className="world-object moon-object motion-layer" aria-hidden="true"><img src="/images/moon.webp" alt="" /></div>
        <div className="world-scrim desert-scrim motion-layer" />
        <div className="world-copy"><h2 id="perspective-title" aria-label="A different kind of gravity."><Lines words={['A different', 'kind of', 'gravity.']} /></h2><a className="text-link world-link motion-layer" href="#afterglow" onClick={e => follow(e, 'afterglow')}>Follow the flow <span className="circle"><DownArrow /></span></a></div>
        <p className="world-description motion-layer">Change the perspective.<br />Change the possibilities.<br /><span>Big ideas deserve a world of their own.</span></p>
        <div className="world-caption motion-layer"><span>Otherworld</span><span>Visual exploration / 2026</span></div>
      </section>

      <section className="world world-ocean" aria-labelledby="afterglow-title" inert={!reducedMotion && active !== 2}>
        <div className="world-object glass-object motion-layer" aria-hidden="true"><img src="/images/glass-knot.webp" alt="" /></div>
        <div className="ocean-foreground motion-layer" aria-hidden="true"><img src="/images/ocean-foreground.webp" alt="" /></div>
        <div className="world-scrim ocean-scrim motion-layer" />
        <div className="world-copy"><h2 id="afterglow-title" aria-label="Make waves. Leave a mark."><Lines words={['Make waves.', 'Leave a', 'mark.']} /></h2><a className="text-link world-link motion-layer" href="#studio" onClick={e => follow(e, 'studio')}>Meet the studio <span className="circle"><DownArrow /></span></a></div>
        <p className="world-description motion-layer">An idea in motion.<br />An impression that stays.<br /><span>From first spark to lasting impact.</span></p>
        <div className="world-caption motion-layer"><span>Afterglow</span><span>Motion & material study / 2026</span></div>
      </section>

      {!menuOpen && <nav className="world-navigation" aria-label="Explore scenes"><div className="world-pagination">{scenes.map(({ id, name }, index) => <button key={id} className={sceneIndex === index ? 'active' : ''} aria-label={`View ${name}`} aria-current={sceneIndex === index ? 'step' : undefined} onClick={() => goTo(id)}><span>0{index + 1}</span><span className="pagination-name">{name}</span></button>)}</div><button className="circle next-world" onClick={() => goTo(nextScene?.id ?? 'studio')} aria-label={nextScene ? `Next scene: ${nextScene.name}` : 'Continue to the studio'}><DownArrow /></button></nav>}
      <div className="world-progress" aria-hidden="true"><span className="motion-layer" /></div>
    </div>
  </div>;
}
