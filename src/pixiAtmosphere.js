import { Container, Filter, GlProgram, Rectangle, Sprite, Texture, Ticker, WebGLRenderer } from 'pixi.js';
import 'pixi.js/filters';
import { ATMOSPHERE, atmosphereSize } from './atmospherePolicy.js';

const vertex = `
precision highp float;
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main() {
  vec2 p = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  p.x = p.x * (2.0 / uOutputTexture.x) - 1.0;
  p.y = p.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(p, 0.0, 1.0);
  vTextureCoord = aPosition * uOutputFrame.zw * uInputSize.zw;
}`;

// One texture lookup, no noise textures, blur, particles, or multipass postprocessing.
// Masks use source-image coordinates so the horizon stays still after cover cropping.
const fragment = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
uniform vec2 uSize;
uniform vec4 uCrop;
uniform float uTime;
uniform float uOcean;
void main() {
  vec2 p = vTextureCoord * uInputSize.xy / uSize;
  vec2 source = uCrop.xy + p * uCrop.zw;
  float edge = smoothstep(0.0, 0.04, p.x) * (1.0 - smoothstep(0.96, 1.0, p.x));
  edge *= smoothstep(0.0, 0.03, p.y) * (1.0 - smoothstep(0.97, 1.0, p.y));
  float water = smoothstep(0.632, 0.72, source.y);
  float heat = smoothstep(0.57, 0.67, source.y) * (1.0 - smoothstep(0.84, 0.96, source.y));
  float wave = sin(source.y * 140.0 - uTime * 1.9 + sin(source.x * 19.0 + uTime * 0.5));
  float shimmer = sin(source.x * 76.0 + source.y * 34.0 - uTime * 1.3);
  vec2 ripple = vec2(wave * 7.5, sin(source.x * 33.0 + source.y * 95.0 - uTime * 1.4) * 2.6) * water;
  vec2 haze = vec2(shimmer * 4.0, sin(source.x * 65.0 - uTime * 1.8) * 2.2) * heat;
  vec2 offset = mix(haze, ripple, uOcean) * edge * uInputSize.zw;
  // Composite only the affected band; keep the sky and other regions at native image sharpness.
  finalColor = texture(uTexture, clamp(vTextureCoord + offset, uInputClamp.xy, uInputClamp.zw))
    * mix(heat, water, uOcean) * edge;
}`;

export async function createAtmosphere(stage, onFailure) {
  const renderer = new WebGLRenderer();
  const canvas = document.createElement('canvas');
  canvas.className = 'world-atmosphere';
  canvas.setAttribute('aria-hidden', 'true');
  const root = new Container();
  const sprite = new Sprite();
  root.addChild(sprite);
  const textures = new Map();
  let filter, resizeObserver, disposed = false, failed = false, frame = 0;
  let current = null, requested = null, lastAt = 0, previousAt = 0, time = 0;
  let slowFrames = 0, frames = 0, cost = 0, fps = ATMOSPHERE.fps;
  let shaderChecked = false;
  let width = 1, height = 1;
  const uniforms = {
    uTime: { value: 0, type: 'f32' }, uOcean: { value: 0, type: 'f32' },
    uSize: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
    uCrop: { value: new Float32Array([0, 0, 1, 1]), type: 'vec4<f32>' },
  };

  function pause() {
    requested = null;
    cancelAnimationFrame(frame); frame = 0;
    // This is the site's only Pixi renderer; suspend its housekeeping ticker too.
    Ticker.system.stop();
    lastAt = 0; previousAt = 0; slowFrames = 0;
    canvas.dataset.visible = 'false';
    if (!disposed && !failed) stage.dataset.atmosphere = 'paused';
  }
  function fail(reason = 'frame-budget', error) {
    if (disposed || failed) return;
    failed = true;
    canvas.dataset.fallbackReason = reason;
    if (import.meta.env.DEV && error) console.warn('MOTION atmosphere fallback:', error);
    pause();
    onFailure();
  }
  function contextLost(event) { event.preventDefault(); fail('context-lost'); }
  canvas.addEventListener('webglcontextlost', contextLost);

  function fit() {
    if (!current || disposed) return;
    const host = canvas.parentElement;
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    const size = atmosphereSize(width, height);
    // Logical renderer coordinates equal the CSS box; density never exceeds 1.
    renderer.resize(width, height, Math.min(size.width / width, size.height / height));
    const scale = Math.max(width / sprite.texture.width, height / sprite.texture.height);
    sprite.scale.set(scale);
    sprite.position.set((width - sprite.width) * .5, (height - sprite.height) * .5);
    root.filterArea = new Rectangle(0, 0, width, height);
    const u = filter.resources.atmosphereUniforms.uniforms;
    u.uSize = new Float32Array([width, height]);
    u.uCrop = new Float32Array([-sprite.x / sprite.width, -sprite.y / sprite.height,
      width / sprite.width, height / sprite.height]);
    // The intermediate filter target uses the same bounded pixel density.
    filter.resolution = renderer.resolution;
  }

  function tick(now) {
    frame = 0;
    if (!requested || disposed || failed) return;
    if (previousAt && now - previousAt > 80) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - .1);
    previousAt = now;
    if (slowFrames > 12) { fail(); return; }
    if (!lastAt || now - lastAt >= 1000 / fps - 1) {
      time += lastAt ? Math.min((now - lastAt) / 1000, .1) : 0;
      lastAt = now;
      filter.resources.atmosphereUniforms.uniforms.uTime = time;
      const start = performance.now();
      try { renderer.render({ container: root }); } catch (error) { fail('render', error); return; }
      if (!shaderChecked) {
        shaderChecked = true;
        if (renderer.gl.getError() !== renderer.gl.NO_ERROR) { fail('webgl'); return; }
      }
      const elapsed = performance.now() - start;
      // Shader compilation/upload is a one-time cost, not sustained frame pressure.
      if (frames >= 5) cost = cost * .95 + elapsed * .05;
      frames++;
      if (frames > 30 && cost > 12) { fail(); return; }
      if (cost > 6) fps = 20;
      else if (frames % 150 === 0 && cost < 2) fps = ATMOSPHERE.fps;
      // Low-frequency diagnostics, useful without a permanent performance overlay.
      if (frames % 30 === 0) {
        canvas.dataset.frames = String(frames);
        canvas.dataset.renderMs = cost.toFixed(2);
        canvas.dataset.fpsLimit = String(fps);
      }
      canvas.dataset.visible = 'true';
    }
    frame = requestAnimationFrame(tick);
  }

  async function show(scene) {
    if (disposed || failed || (requested === scene && frame)) return;
    requested = scene;
    const host = stage.querySelector(scene === 'afterglow' ? '.ocean-backdrop .world-camera' : '.desert-backdrop .world-camera');
    const image = host.querySelector('img');
    try {
      await image.decode();
      if (disposed || failed || requested !== scene) return;
      if (!textures.has(scene)) textures.set(scene, Texture.from(image));
      if (current !== scene) {
        canvas.dataset.visible = 'false';
        host.appendChild(canvas);
        current = scene;
        sprite.texture = textures.get(scene);
        filter.resources.atmosphereUniforms.uniforms.uOcean = scene === 'afterglow' ? 1 : 0;
        fit();
      }
      stage.dataset.atmosphere = scene;
      Ticker.system.start();
      if (!frame) frame = requestAnimationFrame(tick);
    } catch (error) { fail('texture', error); }
  }

  function destroy() {
    if (disposed) return;
    pause(); disposed = true;
    resizeObserver?.disconnect();
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.remove();
    root.destroy({ children: true });
    filter?.destroy();
    for (const texture of textures.values()) texture.destroy(true);
    // Failed initialization may not have constructed all renderer systems.
    try { renderer.destroy(); } catch { /* HTML image remains the fallback. */ }
  }

  try {
    await renderer.init({ canvas, width: 1, height: 1, resolution: 1, antialias: false,
      backgroundAlpha: 0, powerPreference: 'low-power', manageImports: false });
    Ticker.system.stop();
    filter = new Filter({ glProgram: GlProgram.from({ vertex, fragment, name: 'motion-atmosphere' }),
      resources: { atmosphereUniforms: uniforms }, resolution: 1, antialias: false });
    root.filters = [filter];
    resizeObserver = new ResizeObserver(() => { if (current) { fit(); if (!requested) canvas.dataset.visible = 'false'; } });
    resizeObserver.observe(stage);
    return { show, pause, destroy };
  } catch (error) { destroy(); throw error; }
}
