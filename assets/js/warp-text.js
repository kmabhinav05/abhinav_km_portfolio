/**
 * React Bits WarpText Vanilla JS WebGL2 Implementation
 * Interactive fluid glass text with refraction, chromatic dispersion, lens bulge & click ripples
 */
(function() {
  'use strict';

  const LENS_MODES = { bulge: 0, pinch: 1, swirl: 2 };
  const INTRO_MS = 1600;
  const RIPPLE_LIFE = 1.6;
  const MAX_CLICKS = 4;

  const VERTEX = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  const FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uChromatic;
uniform float uRipple;
uniform float uMotion;
uniform float uLens;
uniform float uIntro;
uniform float uReveal;
uniform float uBackdrop;
uniform vec4 uClicks[4];

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * (uWarpStrength * 0.045 * uMotion + uIntro * 0.18);

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = dir * rippleRing * bulge * uPointerStrength * 0.016;

  if (uLens > 1.5) {
    float twist = (1.0 - t) * (1.0 - t) * uPointerActive * uPointerStrength * 2.4;
    float s = sin(twist);
    float c = cos(twist);
    vec2 turned = vec2(aspectDelta.x * c - aspectDelta.y * s, aspectDelta.x * s + aspectDelta.y * c);
    pointerWarp += vec2(turned.x / aspect, turned.y) - pointerDelta;
  } else {
    float side = uLens > 0.5 ? -1.0 : 1.0;
    pointerWarp -= dir * side * bulge * uPointerStrength * 0.045;
  }

  vec2 shock = vec2(0.0);
  float shockLight = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 click = uClicks[i];
    if (click.w <= 0.0) continue;
    vec2 clickDelta = uv - click.xy;
    vec2 clickAspect = vec2(clickDelta.x * aspect, clickDelta.y);
    float clickDist = length(clickAspect);
    float age = click.z;
    float offset = (clickDist - age * 0.9) / (0.06 + age * 0.06);
    float fade = 1.0 - smoothstep(0.0, 1.6, age);
    float energy = exp(-offset * offset) * fade * smoothstep(0.0, 0.08, age) * click.w;
    vec2 clickDir = clickDist > 0.0001 ? vec2(clickAspect.x / aspect, clickAspect.y) / clickDist : vec2(0.0);
    shock -= clickDir * offset * energy * 0.09;
    shockLight += energy;
  }

  vec2 bend = pointerWarp + shock;
  vec2 rest = uv + ambient;
  vec2 splitDir = ambient + bend;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65 + uIntro * 3.0);
  float dispersion = uChromatic * 0.5;

  vec3 ink = vec3(0.0);
  vec3 cover = vec3(0.0);
  vec3 weight = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float k = 1.0 - float(i) / 3.0;
    vec4 tap = sampleText(rest + bend * (1.0 + dispersion * k) + split * k);
    vec3 band = vec3(max(k, 0.0), 1.0 - abs(k), max(-k, 0.0));
    ink += tap.rgb * band;
    cover += tap.a * band;
    weight += band;
  }
  ink /= weight;
  cover /= weight;
  float a = max(max(cover.r, cover.g), cover.b);
  vec3 color = ink + (a - cover) * uBackdrop;
  color = min(color + (lens + shockLight * 0.5) * cover.g * 0.055, vec3(a));
  fragColor = vec4(color, a) * uReveal;
}
`;

  const smooth = value => value * value * (3 - 2 * value);

  const getLuminance = color => {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const ctx = probe.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 1;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };

  const measureLine = (ctx, line, letterSpacing) => {
    const chars = Array.from(line);
    const textWidth = chars.reduce((width, char) => width + ctx.measureText(char).width, 0);
    return textWidth + Math.max(0, chars.length - 1) * letterSpacing;
  };

  const drawLine = (ctx, line, x, y, letterSpacing) => {
    const chars = Array.from(line);
    let cursor = x - measureLine(ctx, line, letterSpacing) / 2;
    chars.forEach((char, index) => {
      ctx.fillText(char, cursor, y);
      cursor += ctx.measureText(char).width + (index === chars.length - 1 ? 0 : letterSpacing);
    });
  };

  const buildTextCanvas = ({ container, width, height, dpr, props }) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return { canvas, ink: props.color };

    const probe = document.createElement('span');
    probe.textContent = props.text;
    Object.assign(probe.style, {
      position: 'absolute',
      visibility: 'hidden',
      pointerEvents: 'none',
      whiteSpace: 'pre',
      inset: '0 auto auto 0',
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: typeof props.fontSize === 'number' ? `${props.fontSize}px` : props.fontSize,
      fontWeight: String(props.fontWeight),
      letterSpacing: typeof props.letterSpacing === 'number' ? `${props.letterSpacing}px` : props.letterSpacing,
      lineHeight: typeof props.lineHeight === 'number' ? String(props.lineHeight) : props.lineHeight
    });
    container.appendChild(probe);
    const computed = window.getComputedStyle(probe);
    let fontSizePx = parseFloat(computed.fontSize) || 84;
    const ink = computed.color || props.color;
    const fontFamily = computed.fontFamily || 'serif';
    const fontWeight = computed.fontWeight || String(props.fontWeight);
    let letterSpacing = computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing) || 0;
    let lineHeight = parseFloat(computed.lineHeight);
    if (!Number.isFinite(lineHeight)) {
      lineHeight = fontSizePx * (typeof props.lineHeight === 'number' ? props.lineHeight : 0.95);
    }
    probe.remove();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const lines = String(props.text || '').split('\n');
    const applyFont = () => {
      ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
    };
    applyFont();

    const maxWidth = width * 0.94;
    const maxHeight = height * 0.88;
    const widest = Math.max(...lines.map(line => measureLine(ctx, line, letterSpacing)), 1);
    const blockHeight = Math.max(lineHeight * lines.length, 1);
    const fit = Math.min(1, maxWidth / widest, maxHeight / blockHeight);

    if (fit < 1) {
      fontSizePx *= fit;
      letterSpacing *= fit;
      lineHeight *= fit;
      applyFont();
    }

    const startY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
    lines.forEach((line, index) => drawLine(ctx, line, width / 2, startY + index * lineHeight, letterSpacing));

    return { canvas, ink };
  };

  function createWarpText(container, options = {}) {
    if (!container) return null;

    const props = {
      text: options.text || 'Abhinav K M',
      color: options.color || '#1c1917',
      fontSize: options.fontSize || 'clamp(3rem, 7.5vw, 6.5rem)',
      fontWeight: options.fontWeight || 700,
      fontFamily: options.fontFamily || "'Playfair Display', Georgia, serif",
      letterSpacing: options.letterSpacing || '-0.02em',
      lineHeight: options.lineHeight || 0.95,
      warpStrength: options.warpStrength !== undefined ? options.warpStrength : 0.08,
      warpScale: options.warpScale || 1.7,
      speed: options.speed || 0.55,
      pointerInfluence: options.pointerInfluence || 0.42,
      pointerStrength: options.pointerStrength || 0.38,
      refraction: options.refraction || 0.018,
      chromatic: options.chromatic !== undefined ? options.chromatic : 0.35,
      ripple: options.ripple !== false,
      clickRipple: options.clickRipple !== false,
      idleDrift: options.idleDrift !== undefined ? options.idleDrift : 0.2,
      lens: options.lens || 'bulge',
      intro: options.intro !== false
    };

    const fallbackEl = container.querySelector('.warp-text__fallback');

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    let gl;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true
      });
    } catch (e) {
      gl = null;
    }

    if (!gl) {
      if (fallbackEl) fallbackEl.style.display = 'flex';
      canvas.style.display = 'none';
      return null;
    }

    if (fallbackEl) fallbackEl.style.display = 'none';

    // Compile shaders
    function compileShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('WarpText shader compile error:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('WarpText program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);

    // Fullscreen single triangle buffer: [-1,-1], [3,-1], [-1,3]
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    const uvLoc = gl.getAttribLocation(program, 'uv');

    // Text texture setup
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Get Uniform Locations
    const uTextTexture = gl.getUniformLocation(program, 'uTextTexture');
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uPointer = gl.getUniformLocation(program, 'uPointer');
    const uPointerActive = gl.getUniformLocation(program, 'uPointerActive');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uWarpStrength = gl.getUniformLocation(program, 'uWarpStrength');
    const uWarpScale = gl.getUniformLocation(program, 'uWarpScale');
    const uSpeed = gl.getUniformLocation(program, 'uSpeed');
    const uPointerInfluence = gl.getUniformLocation(program, 'uPointerInfluence');
    const uPointerStrength = gl.getUniformLocation(program, 'uPointerStrength');
    const uRefraction = gl.getUniformLocation(program, 'uRefraction');
    const uChromatic = gl.getUniformLocation(program, 'uChromatic');
    const uRipple = gl.getUniformLocation(program, 'uRipple');
    const uMotion = gl.getUniformLocation(program, 'uMotion');
    const uLens = gl.getUniformLocation(program, 'uLens');
    const uIntro = gl.getUniformLocation(program, 'uIntro');
    const uReveal = gl.getUniformLocation(program, 'uReveal');
    const uBackdrop = gl.getUniformLocation(program, 'uBackdrop');
    const uClicks = gl.getUniformLocation(program, 'uClicks');

    let textReady = false;
    let introProgress = props.intro ? 0 : 1;
    let lastFrame = 0;
    let frame = 0;
    let raf = 0;
    let disposed = false;
    const startTime = performance.now();

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
    const clicks = [
      0.5, 0.5, 0, 0,
      0.5, 0.5, 0, 0,
      0.5, 0.5, 0, 0,
      0.5, 0.5, 0, 0
    ];
    let clickSlot = 0;

    const rasterize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const raster = buildTextCanvas({
        container,
        width: rect.width,
        height: rect.height,
        dpr,
        props
      });

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raster.canvas);

      gl.useProgram(program);
      gl.uniform1f(uBackdrop, getLuminance(raster.ink) < 0.5 ? 1 : 0);
      textReady = true;
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      rasterize();
    };

    const onPointerMove = event => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.tx = (event.clientX - rect.left) / rect.width;
      pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
      pointer.activeTarget = 1;
    };

    const onPointerLeave = () => {
      pointer.activeTarget = 0;
    };

    const onPointerDown = event => {
      if (!props.clickRipple) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const baseIdx = clickSlot * 4;
      clickSlot = (clickSlot + 1) % MAX_CLICKS;
      clicks[baseIdx] = (event.clientX - rect.left) / rect.width;
      clicks[baseIdx + 1] = 1 - (event.clientY - rect.top) / rect.height;
      clicks[baseIdx + 2] = 0;
      clicks[baseIdx + 3] = 1;
    };

    const loop = now => {
      if (disposed) return;

      const elapsed = (now - startTime) * 0.001;
      const delta = lastFrame ? Math.min(now - lastFrame, 50) : 16;
      lastFrame = now;
      frame += 1;

      if (textReady && introProgress < 1) {
        introProgress = Math.min(1, introProgress + delta / INTRO_MS);
      }
      const settle = 1 - introProgress;

      const drift = Math.min(Math.max(props.idleDrift, 0), 1);
      const engaged = pointer.activeTarget > 0;
      const idleX = 0.5 + Math.sin(elapsed * 0.33) * (0.08 + drift * 0.2);
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * (0.06 + drift * 0.2);
      const follow = 1 - Math.exp(-delta / (engaged ? 130 : 470));

      pointer.x += ((engaged ? pointer.tx : idleX) - pointer.x) * follow;
      pointer.y += ((engaged ? pointer.ty : idleY) - pointer.y) * follow;
      pointer.active += ((engaged ? 1 : drift) - pointer.active) * (1 - Math.exp(-delta / 270));

      // Update click shockwaves
      for (let i = 0; i < MAX_CLICKS; i++) {
        const base = i * 4;
        if (clicks[base + 3] > 0) {
          clicks[base + 2] += delta / 1000;
          if (clicks[base + 2] > RIPPLE_LIFE) {
            clicks[base + 3] = 0;
          }
        }
      }

      gl.useProgram(program);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Bind attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      // Bind texture to unit 0
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uTextTexture, 0);

      // Set uniforms
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform1f(uPointerActive, pointer.active);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uWarpStrength, props.warpStrength);
      gl.uniform1f(uWarpScale, props.warpScale);
      gl.uniform1f(uSpeed, props.speed);
      gl.uniform1f(uPointerInfluence, props.pointerInfluence);
      gl.uniform1f(uPointerStrength, props.pointerStrength);
      gl.uniform1f(uRefraction, props.refraction);
      gl.uniform1f(uChromatic, props.chromatic);
      gl.uniform1f(uRipple, props.ripple ? 1 : 0);
      gl.uniform1f(uMotion, 1);
      gl.uniform1f(uLens, LENS_MODES[props.lens] ?? 0);
      gl.uniform1f(uIntro, settle * settle * settle);
      gl.uniform1f(uReveal, textReady ? smooth(Math.min(1, introProgress / 0.45)) : 0);
      gl.uniform4fv(uClicks, clicks);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(loop);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointerdown', onPointerDown);

    resize();
    if (document.fonts?.ready) {
      document.fonts.ready.then(resize);
    }
    raf = requestAnimationFrame(loop);

    return {
      destroy: () => {
        disposed = true;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        canvas.removeEventListener('pointerdown', onPointerDown);
        if (canvas.parentNode === container) container.removeChild(canvas);
      }
    };
  }

  function init() {
    const el = document.getElementById('hero-warp-name');
    if (el) {
      window.warpTextInstance = createWarpText(el, {
        text: 'Abhinav K M',
        fontFamily: "'Playfair Display', Georgia, serif",
        fontWeight: 700,
        color: '#18181b',
        fontSize: 'clamp(3rem, 7.5vw, 6.5rem)',
        letterSpacing: '-0.02em',
        warpStrength: 0.08,
        warpScale: 1.7,
        speed: 0.55,
        lens: 'bulge',
        pointerInfluence: 0.42,
        pointerStrength: 0.4,
        refraction: 0.018,
        chromatic: 0.35,
        idleDrift: 0.2,
        ripple: true,
        clickRipple: true,
        intro: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.createWarpText = createWarpText;
})();
