import React, { useEffect, useRef, useState } from 'react';
import Worlds, { scenes } from './Worlds.jsx';
import { createSceneNavigation } from './sceneNavigation.js';

const services = [
  { name: 'Brand identities', text: 'A clear point of view, made visible. Strategy, visual identity, and a design language with room to grow.' },
  { name: 'Digital experiences', text: 'Websites that feel as considered as the brands behind them. From the first interaction to the smallest detail.' },
  { name: 'Art direction & motion', text: 'Unexpected imagery and movement with a purpose. A distinct visual world, brought to life across every touchpoint.' },
];

function Arrow({ direction = 'right', ...props }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`arrow arrow-${direction}`} {...props}><path d="M4 12h15M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BriefForm() {
  const [service, setService] = useState('Brand identity');
  const [status, setStatus] = useState('');
  function saveBrief(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!String(data.get('name')).trim() || String(data.get('message')).trim().length < 10) {
      setStatus('Please add your name and at least 10 characters about your project.');
      return;
    }
    const text = `MOTION — Project brief\n\nName: ${data.get('name')}\nEmail: ${data.get('email')}\nInterested in: ${service}\nBudget: ${data.get('budget')}\n\nProject\n${data.get('message')}\n\nThis brief was created locally. It has not been sent.\n`;
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'motion-project-brief.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Your brief is ready. Check your downloads — nothing has been sent.');
    } catch {
      setStatus('The download could not start. Your text is still here; please try again.');
    }
  }
  return <form className="brief-form" onSubmit={saveBrief}>
    <fieldset className="service-picker"><legend>What are you thinking?</legend><div className="service-options">{['Brand identity', 'Website', 'Art & motion'].map(item => <label key={item} className={service === item ? 'selected' : ''}><input type="radio" name="service" value={item} checked={service === item} onChange={() => setService(item)} /><span>{item}</span></label>)}</div></fieldset>
    <div className="form-row"><label>Your name<input name="name" autoComplete="name" placeholder="Alex Taylor" required maxLength={100} /></label><label>Your email<input type="email" name="email" autoComplete="email" placeholder="alex@company.com" required maxLength={254} /></label></div>
    <label>A little about your project<textarea name="message" placeholder="The idea, the ambition, the wild what-if…" minLength={10} maxLength={5000} required rows={3} /></label>
    <label>Budget in mind<select name="budget" defaultValue="Let's explore"><option>Let's explore</option><option>Under $5,000</option><option>$5,000–$15,000</option><option>$15,000–$30,000</option><option>$30,000+</option></select></label>
    <div className="form-action"><button className="pill solid" type="submit">Save my brief <Arrow /></button><p>Make a start. Save your idea.<br />This demo downloads your brief locally.</p></div>
    <p role="status" className="form-status">{status}</p>
  </form>;
}

export default function App() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const root = useRef(null);
  const menuButton = useRef(null);
  const navigation = useRef(null);
  const menuState = useRef(menuOpen);
  menuState.current = menuOpen;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    navigation.current = createSceneNavigation({ win: window, doc: document, scenes, reducedMotion, isMenuOpen: () => menuState.current });
    return () => { navigation.current.destroy(); navigation.current = null; };
  }, [reducedMotion]);

  useEffect(() => {
    const story = document.getElementById('worlds');
    const nativeTimeline = CSS.supports('animation-timeline', 'view()') && CSS.supports('animation-range', 'contain 0% contain 100%');
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const rect = story.getBoundingClientRect();
      const travel = Math.max(1, story.offsetHeight - story.querySelector('.worlds-stage').offsetHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / travel));
      if (!nativeTimeline && !reducedMotion) story.style.setProperty('--scroll-p', progress.toFixed(5));
      const worldIndex = reducedMotion
        ? [...story.querySelectorAll('.world')].reduce((index, world, i) => world.getBoundingClientRect().top < viewport * .5 ? i : index, 0)
        : progress >= .75 ? 2 : progress >= .25 ? 1 : 0;
      const next = document.getElementById('project').getBoundingClientRect().top < viewport * .5 ? 4
        : document.getElementById('studio').getBoundingClientRect().top < viewport * .5 ? 3
        : worldIndex;
      setActive(previous => previous === next ? previous : next);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll); update();
    return () => { window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll); cancelAnimationFrame(frame); };
  }, [reducedMotion]);

  // React mounts after the browser's initial fragment lookup. Restore deep links
  // once the scenes exist, using the same positions as the scene controls.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id || !document.getElementById(id)) return;
    const frame = requestAnimationFrame(() => goTo(id, true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function goTo(id, instant = false) {
    if (navigation.current?.navigate(id, instant)) setMenuOpen(false);
  }
  function follow(event, id) { event.preventDefault(); goTo(id); }

  return <div ref={root} className={`site ${active >= scenes.length ? 'on-ink' : ''}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className={`header ${menuOpen ? 'menu-open' : ''}`}>
      <a className="wordmark" href="#worlds" onClick={e => follow(e, 'worlds')} aria-label="MOTION home">motion<span className="wordmark-dot">.</span></a>
      <span className="header-note">Independent creative studio</span>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="#worlds" onClick={e => follow(e, 'worlds')} aria-current={active < scenes.length ? 'page' : undefined}>The worlds</a><a href="#studio" onClick={e => follow(e, 'studio')} aria-current={active === scenes.length ? 'page' : undefined}>The studio</a><a className="pill header-cta" href="#project" onClick={e => follow(e, 'project')}>Let’s talk <Arrow /></a></nav>
      <button ref={menuButton} className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
      {menuOpen && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation" onKeyDown={e => { if (e.key === 'Escape') { setMenuOpen(false); menuButton.current.focus(); } }}><a href="#worlds" onClick={e => follow(e, 'worlds')}>The worlds <Arrow /></a><a href="#studio" onClick={e => follow(e, 'studio')}>The studio <Arrow /></a><a href="#project" onClick={e => follow(e, 'project')}>Let’s talk <Arrow /></a></nav>}
    </header>

    <main id="main">
      <Worlds active={active} reducedMotion={reducedMotion} menuOpen={menuOpen} follow={follow} goTo={goTo} />

      <section className="studio-section" id="studio" aria-labelledby="studio-title">
        <div className="studio-intro"><h2 id="studio-title">Different by nature.<br /><span>Distinct by design.</span></h2><div className="studio-copy"><p>MOTION is a place for the what-ifs. For identities with a point of view. For digital experiences that make you stop, feel, and look again.</p><p>Strategy gives an idea direction.<br />Design gives it a world.</p><a className="text-link" href="#project" onClick={e => follow(e, 'project')}>Tell us your what-if <span className="circle"><Arrow /></span></a></div></div>
        <div className="services" aria-label="Studio capabilities">{services.map((service, index) => <details key={service.name} open={index === 0 ? true : undefined}><summary>{service.name}<span className="plus" aria-hidden="true" /></summary><p>{service.text}</p></details>)}</div>
        <div className="studio-foot"><span>Curiosity is the starting point.</span><span>Imagination does the rest.</span></div>
      </section>

      <section className="project-section" id="project" aria-labelledby="project-title"><div className="project-heading"><h2 id="project-title">Let’s make<br />something<br /><em>matter.</em></h2><p>Every good thing starts<br />with a conversation. Or an idea.</p><Arrow /></div><BriefForm /></section>
    </main>

    <footer><a className="wordmark" href="#worlds" onClick={e => follow(e, 'worlds')}>motion.</a><p>An independent creative studio concept.<br />Original imagery. Endless possibilities.</p><button className="text-link" onClick={() => goTo('worlds')}>Back to top <Arrow direction="up" /></button><span className="copyright">© {new Date().getFullYear()} MOTION · Concept site</span></footer>

  </div>;
}
