/**
 * Glow Cursor - React Bits Component
 * WebGL2 Real-Time Fluid Light Simulation Engine
 * 
 * Configured Props:
 * - color: "#7ff3ff"
 * - intensity: 0.75
 * - trailWidth: 2
 * - linger: 1
 * - glow: 0.6
 * - clickBurst: false
 * - theme: "dark"
 * 
 * Docs: https://pro.reactbits.dev/docs/components/glow-cursor
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GlowCursor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERTEX = `#version 300 es
in vec2 aPosition;
uniform vec2 uTexel;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  const HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
`;

  const SPLAT = `${HEADER}
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uA;
uniform vec2 uB;
uniform float uRadius;
uniform float uWide;
uniform vec3 uValue;
uniform float uMode;
uniform float uStrength;
float erf(float x) {
  float x2 = x * x;
  float a = 0.147;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + a * x2) / (1.0 + a * x2)));
}
float sweep(float along, float length, float across, float radius) {
  return exp(-across * across / (radius * radius)) * 0.5 * (erf(along / radius) - erf((along - length) / radius));
}
void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 a = vec2(uA.x * uAspect, uA.y);
  vec2 ab = vec2(uB.x * uAspect, uB.y) - a;
  float len = length(ab);
  vec2 dir = len > 1e-6 ? ab / len : vec2(1.0, 0.0);
  vec2 ap = p - a;
  vec3 base = texture(uTarget, vUv).xyz;
  if (uMode > 1.5) {
    float along = dot(ap, dir);
    float across = dot(ap, vec2(-dir.y, dir.x));
    if (uMode > 2.5) {
      outColor = vec4(mix(base, uValue, sweep(along, len, across, uRadius) * uStrength), 1.0);
      return;
    }
    vec3 add = vec3(uValue.xy * sweep(along, len, across, uRadius), uValue.z * sweep(along, len, across, uWide));
    outColor = vec4(base + add, 1.0);
    return;
  }
  float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
  vec2 d = ap - ab * h;
  float r2 = dot(d, d);
  float falloff = exp(-r2 / (uRadius * uRadius));
  float wide = exp(-r2 / (uWide * uWide));
  vec3 result = uMode > 0.5 ? mix(base, uValue, falloff * uStrength) : base + vec3(uValue.xy * falloff, uValue.z * wide);
  outColor = vec4(result, 1.0);
}`;

  const ADVECT = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uVelocityTexel;
uniform float uDt;
uniform vec4 uDecay;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  outColor = texture(uSource, coord) * uDecay;
}`;

  const MACCORMACK = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uForward;
uniform sampler2D uBack;
uniform vec2 uVelocityTexel;
uniform vec2 uSourceTexel;
uniform float uDt;
uniform vec4 uDecay;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  vec4 forward = texture(uForward, vUv);
  vec4 corrected = forward + 0.5 * (texture(uSource, vUv) - texture(uBack, vUv));
  vec2 base = (floor(coord / uSourceTexel - 0.5) + 0.5) * uSourceTexel;
  vec4 a = texture(uSource, base);
  vec4 b = texture(uSource, base + vec2(uSourceTexel.x, 0.0));
  vec4 c = texture(uSource, base + vec2(0.0, uSourceTexel.y));
  vec4 d = texture(uSource, base + uSourceTexel);
  vec4 low = min(min(a, b), min(c, d));
  vec4 high = max(max(a, b), max(c, d));
  outColor = clamp(corrected, low, high) * uDecay;
}`;

  const DIVERGENCE = `${HEADER}
uniform sampler2D uVelocity;
void main() {
  float left = texture(uVelocity, vL).x;
  float right = texture(uVelocity, vR).x;
  float top = texture(uVelocity, vT).y;
  float bottom = texture(uVelocity, vB).y;
  vec2 center = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) left = -center.x;
  if (vR.x > 1.0) right = -center.x;
  if (vT.y > 1.0) top = -center.y;
  if (vB.y < 0.0) bottom = -center.y;
  outColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}`;

  const SCALE = `${HEADER}
uniform sampler2D uSource;
uniform float uValue;
void main() {
  outColor = texture(uSource, vUv) * uValue;
}`;

  const PRESSURE = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  outColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

  const GRADIENT = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  outColor = vec4(velocity, 0.0, 1.0);
}`;

  const SHADE = `
uniform vec3 uColor;
uniform vec3 uSecondary;
uniform float uIntensity;
uniform float uHotspot;
vec3 shade(vec3 dye) {
  float energy = max(dye.x, 0.0);
  float heat = clamp(dye.y, 0.0, energy);
  float gas = max(dye.z, 0.0);
  float fresh = heat / max(energy, 0.0001);
  vec3 tint = mix(uSecondary, uColor, fresh);
  return (tint * energy + uSecondary * gas + vec3(heat * heat * 0.3 * uHotspot)) * uIntensity;
}
`;

  const PREFILTER = `${HEADER}${SHADE}
uniform sampler2D uDye;
uniform vec2 uDyeTexel;
void main() {
  vec2 o = uDyeTexel * 0.5;
  vec3 light = shade(texture(uDye, vUv + vec2(-o.x, -o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(o.x, -o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(-o.x, o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(o.x, o.y)).xyz);
  outColor = vec4(light * 0.25, 1.0);
}`;

  const DOWN = `${HEADER}
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
void main() {
  vec2 o = uSourceTexel;
  vec3 color = texture(uSource, vUv).rgb * 4.0;
  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb;
  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb;
  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb;
  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb;
  outColor = vec4(color / 8.0, 1.0);
}`;

  const UP = `${HEADER}
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
void main() {
  vec2 o = uSourceTexel;
  vec3 color = texture(uSource, vUv + vec2(-o.x * 2.0, 0.0)).rgb;
  color += texture(uSource, vUv + vec2(o.x * 2.0, 0.0)).rgb;
  color += texture(uSource, vUv + vec2(0.0, -o.y * 2.0)).rgb;
  color += texture(uSource, vUv + vec2(0.0, o.y * 2.0)).rgb;
  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb * 2.0;
  outColor = vec4(color / 12.0, 1.0);
}`;

  const DISPLAY = `${HEADER}${SHADE}
uniform sampler2D uDye;
uniform sampler2D uBloom;
uniform float uGlow;
uniform float uGrain;
uniform float uTime;
uniform float uLight;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  vec3 dye = texture(uDye, vUv).xyz;
  vec3 light = shade(dye);
  vec3 bloom = texture(uBloom, vUv).rgb * uGlow;
  float edge = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  float grain = 1.0 + (hash(gl_FragCoord.xy + fract(uTime * 13.7) * 97.0) - 0.5) * uGrain * 2.0;
  if (uLight > 0.5) {
    float energy = max(dye.x, 0.0);
    float heat = clamp(dye.y, 0.0, energy);
    float gas = max(dye.z, 0.0);
    float fresh = heat / max(energy, 0.0001);
    vec3 tint = mix(uSecondary, uColor, fresh);
    float halo = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
    float density = 1.0 - exp(-((energy * 1.1 + gas * 0.8) * uIntensity + halo * 0.25));
    float tone = dot(tint, vec3(0.2126, 0.7152, 0.0722));
    vec3 ink = tint * min(1.0, 0.5 / max(tone, 0.001)) * mix(0.95, 0.72, smoothstep(0.5, 3.0, energy));
    ink = mix(ink, vec3(1.0), clamp(heat * heat * 0.05 * uHotspot, 0.0, 0.45));
    density = clamp(density * grain, 0.0, 1.0) * edge;
    outColor = vec4(ink * density, density);
  } else {
    vec3 color = 1.0 - exp(-(light + bloom) * grain);
    color *= edge;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`;

  const QUALITY = {
    low: { sim: 96, dye: 384 },
    medium: { sim: 128, dye: 576 },
    high: { sim: 160, dye: 768 }
  };

  const PRESSURE_STEPS = 20;
  const FLOW = 0.75;
  const BLOOM_LEVELS = 5;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.warn('Shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  };

  const toHsv = ([r, g, b]) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;
    if (delta > 0) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
    }
    return [(hue * 60 + 360) % 360, max > 0 ? delta / max : 0, max];
  };

  const fromHsv = (hue, saturation, value) => {
    const h = (((hue % 360) + 360) % 360) / 60;
    const c = value * saturation;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = value - c;
    const [r, g, b] =
      h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
    return [r + m, g + m, b + m];
  };

  class GlowCursor {
    constructor(container, options = {}) {
      if (typeof window === 'undefined') return;

      // Touch / mobile detection
      if (window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) {
        return;
      }

      let c = typeof container === 'string' ? document.querySelector(container) : container;
      if (!c) {
        c = document.getElementById('glow-cursor-container');
        if (!c) {
          c = document.createElement('div');
          c.id = 'glow-cursor-container';
          c.className = 'glow-cursor-fixed';
          document.body.prepend(c);
        }
      }
      this.container = c;

      // User configuration with exact defaults requested
      this.settings = {
        color: options.color || '#7ff3ff',
        secondaryColor: options.secondaryColor || '',
        intensity: options.intensity !== undefined ? Math.max(0, Number(options.intensity)) : 0.75,
        trailWidth: options.trailWidth !== undefined ? clamp(Number(options.trailWidth), 0.5, 40) : 2,
        linger: options.linger !== undefined ? clamp(Number(options.linger), 0.1, 10) : 1,
        glow: options.glow !== undefined ? Math.max(0, Number(options.glow)) : 0.6,
        hotspot: options.hotspot !== undefined ? Math.max(0, Number(options.hotspot)) : 0.8,
        followSpeed: options.followSpeed !== undefined ? clamp(Number(options.followSpeed), 0, 1) : 0.6,
        grain: options.grain !== undefined ? Math.max(0, Number(options.grain)) : 0,
        clickBurst: options.clickBurst !== undefined ? Boolean(options.clickBurst) : false,
        quality: QUALITY[options.quality] ? options.quality : 'high',
        theme: options.theme || (document.documentElement.classList.contains('light') ? 'light' : 'dark'),
        blendMode: options.blendMode || 'auto',
        maxDevicePixelRatio: options.maxDevicePixelRatio || 2,
        enabled: options.enabled !== undefined ? Boolean(options.enabled) : true
      };

      this.initCanvas();
      this.initWebGL();
    }

    initCanvas() {
      let canvas = this.container.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'glow-cursor__canvas';
        canvas.setAttribute('aria-hidden', 'true');
        this.container.appendChild(canvas);
      }
      this.canvas = canvas;
      this.updateBlendMode();
    }

    updateBlendMode() {
      const isLight = this.settings.theme === 'light' || document.documentElement.classList.contains('light');
      const mode = this.settings.blendMode !== 'auto'
        ? this.settings.blendMode
        : (isLight ? 'normal' : 'screen');
      if (this.canvas) {
        this.canvas.style.mixBlendMode = mode;
      }
    }

    initWebGL() {
      const canvas = this.canvas;
      const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false
      });
      if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
        console.warn('WebGL2 EXT_color_buffer_float required for GlowCursor');
        return;
      }
      this.gl = gl;

      const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX);
      if (!vertexShader) return;

      const build = source => {
        const fragment = compile(gl, gl.FRAGMENT_SHADER, source);
        const program = gl.createProgram();
        if (!fragment || !program) return null;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragment);
        gl.bindAttribLocation(program, 0, 'aPosition');
        gl.linkProgram(program);
        gl.deleteShader(fragment);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          gl.deleteProgram(program);
          return null;
        }
        const uniforms = {};
        const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
          const info = gl.getActiveUniform(program, i);
          if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
        }
        return { program, uniforms };
      };

      this.passes = {
        splat: build(SPLAT),
        advect: build(ADVECT),
        maccormack: build(MACCORMACK),
        divergence: build(DIVERGENCE),
        scale: build(SCALE),
        pressure: build(PRESSURE),
        gradient: build(GRADIENT),
        prefilter: build(PREFILTER),
        down: build(DOWN),
        up: build(UP),
        display: build(DISPLAY)
      };

      if (Object.values(this.passes).some(p => !p)) return;

      this.vao = gl.createVertexArray();
      this.buffer = gl.createBuffer();
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.probe = document.createElement('canvas');
      this.probe.width = 1;
      this.probe.height = 1;
      this.probeContext = this.probe.getContext('2d', { willReadFrequently: true });
      this.reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      this.state = {
        width: 1,
        height: 1,
        ratio: 1,
        colorKey: '',
        color: [0.5, 0.95, 1],
        secondary: [0.25, 0.8, 1],
        pointer: { x: 0, y: 0, inside: false },
        emitter: { x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0, travelled: 0 },
        ready: false,
        bursts: [],
        active: -Infinity,
        time: 0,
        allocated: '',
        targets: null
      };

      this.raf = 0;
      this.last = 0;
      this.alive = true;
      this.visible = true;

      this.bindEvents();
      this.resize();
      this.blank();
    }

    toRgb(value, fallback) {
      if (!this.probeContext || !value) return fallback;
      const css = /^[0-9a-f]{3,8}$/i.test(value) ? `#${value}` : value;
      this.probeContext.clearRect(0, 0, 1, 1);
      this.probeContext.fillStyle = '#000000';
      this.probeContext.fillStyle = css;
      this.probeContext.fillRect(0, 0, 1, 1);
      const [r, g, b] = this.probeContext.getImageData(0, 0, 1, 1).data;
      return [r / 255, g / 255, b / 255];
    }

    resolveColors(s) {
      const key = `${s.color}|${s.secondaryColor}`;
      if (key === this.state.colorKey) return;
      this.state.colorKey = key;
      this.state.color = this.toRgb(s.color, [0.5, 0.95, 1]);
      if (s.secondaryColor) {
        this.state.secondary = this.toRgb(s.secondaryColor, this.state.color);
      } else {
        const [hue, saturation, value] = toHsv(this.state.color);
        this.state.secondary = fromHsv(hue + 8, Math.min(1, saturation * 1.1 + 0.05), value);
      }
    }

    createTarget(width, height, internalFormat, format, filter) {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.HALF_FLOAT, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, fbo, width, height, texel: [1 / width, 1 / height] };
    }

    createPair(width, height, internalFormat, format, filter) {
      let read = this.createTarget(width, height, internalFormat, format, filter);
      let write = this.createTarget(width, height, internalFormat, format, filter);
      return {
        get read() { return read; },
        get write() { return write; },
        swap() {
          const next = read;
          read = write;
          write = next;
        },
        targets() { return [read, write]; }
      };
    }

    destroyTarget(target) {
      this.gl.deleteTexture(target.texture);
      this.gl.deleteFramebuffer(target.fbo);
    }

    release() {
      const t = this.state.targets;
      if (!t) return;
      [
        ...t.velocity.targets(),
        ...t.dye.targets(),
        ...t.pressure.targets(),
        t.divergence,
        t.forward,
        t.back,
        ...t.bloom
      ].forEach(target => this.destroyTarget(target));
      this.state.targets = null;
    }

    clearTargets() {
      const t = this.state.targets;
      if (!t) return;
      const gl = this.gl;
      gl.clearColor(0, 0, 0, 0);
      [...t.velocity.targets(), ...t.dye.targets(), ...t.pressure.targets()].forEach(target => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT);
      });
    }

    allocate() {
      const s = this.settings;
      const key = `${s.quality}|${this.state.width}|${this.state.height}|${this.canvas.width}|${this.canvas.height}`;
      if (key === this.state.allocated && this.state.targets) return;
      this.release();
      this.state.allocated = key;
      const preset = QUALITY[s.quality] || QUALITY.high;
      const aspect = this.state.width / this.state.height;
      const dims = base => (aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)]);
      const [simW, simH] = dims(preset.sim);
      let [dyeW, dyeH] = dims(preset.dye);
      const shrink = Math.min(1, this.canvas.width / dyeW, this.canvas.height / dyeH);
      dyeW = Math.max(2, Math.round(dyeW * shrink));
      dyeH = Math.max(2, Math.round(dyeH * shrink));
      const bloom = [];
      let bloomW = dyeW >> 1;
      let bloomH = dyeH >> 1;
      const gl = this.gl;
      for (let i = 0; i < BLOOM_LEVELS; i++) {
        bloom.push(this.createTarget(Math.max(1, bloomW), Math.max(1, bloomH), gl.RGBA16F, gl.RGBA, gl.LINEAR));
        bloomW >>= 1;
        bloomH >>= 1;
      }
      this.state.targets = {
        velocity: this.createPair(simW, simH, gl.RG16F, gl.RG, gl.LINEAR),
        dye: this.createPair(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        forward: this.createTarget(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        back: this.createTarget(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        pressure: this.createPair(simW, simH, gl.R16F, gl.RED, gl.NEAREST),
        divergence: this.createTarget(simW, simH, gl.R16F, gl.RED, gl.NEAREST),
        bloom
      };
    }

    resize() {
      const s = this.settings;
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, Math.max(0.5, s.maxDevicePixelRatio || 2));
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
      }
      this.state.width = width;
      this.state.height = height;
      this.state.ratio = ratio;
      this.allocate();
    }

    draw(target) {
      const gl = this.gl;
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.width, target.height);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    use(pass, texel) {
      const gl = this.gl;
      gl.useProgram(pass.program);
      if (pass.uniforms.uTexel) gl.uniform2f(pass.uniforms.uTexel, texel[0], texel[1]);
      return pass.uniforms;
    }

    bind(unit, target) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      return unit;
    }

    splat(pair, ax, ay, bx, by, radius, value, mode, strength, wide = radius) {
      const gl = this.gl;
      const u = this.use(this.passes.splat, pair.read.texel);
      gl.uniform1i(u.uTarget, this.bind(0, pair.read));
      gl.uniform1f(u.uAspect, this.state.width / this.state.height);
      gl.uniform2f(u.uA, ax / this.state.width, 1 - ay / this.state.height);
      gl.uniform2f(u.uB, bx / this.state.width, 1 - by / this.state.height);
      gl.uniform1f(u.uRadius, radius / this.state.height);
      gl.uniform1f(u.uWide, wide / this.state.height);
      gl.uniform3f(u.uValue, value[0], value[1], value[2]);
      gl.uniform1f(u.uMode, mode);
      gl.uniform1f(u.uStrength, strength);
      this.draw(pair.write);
      pair.swap();
    }

    toGrid(vx, vy) {
      const { velocity } = this.state.targets;
      return [(vx * velocity.read.width) / this.state.width, (-vy * velocity.read.height) / this.state.height];
    }

    lightRadius(s) {
      return Math.max(s.trailWidth * 0.5, (this.state.height / this.state.targets.dye.read.height) * 0.9);
    }

    emit(s, dt, now) {
      const { emitter, pointer } = this.state;
      const { velocity, dye } = this.state.targets;
      emitter.px = emitter.x;
      emitter.py = emitter.y;
      if (this.reduce || s.followSpeed >= 1) {
        emitter.x = pointer.x;
        emitter.y = pointer.y;
      } else {
        const omega = 10 + s.followSpeed * 50;
        const steps = Math.max(1, Math.ceil(dt / 0.004));
        const h = dt / steps;
        for (let k = 0; k < steps; k++) {
          emitter.vx += (omega * omega * (pointer.x - emitter.x) - 2 * omega * emitter.vx) * h;
          emitter.vy += (omega * omega * (pointer.y - emitter.y) - 2 * omega * emitter.vy) * h;
          emitter.x += emitter.vx * h;
          emitter.y += emitter.vy * h;
        }
      }
      const dx = emitter.x - emitter.px;
      const dy = emitter.y - emitter.py;
      const length = Math.hypot(dx, dy);
      if (length < 0.05 || !s.enabled) return;
      const radius = this.lightRadius(s);
      if (!this.reduce) {
        const target = this.toGrid(dx / Math.max(dt, 1e-3), dy / Math.max(dt, 1e-3));
        this.splat(
          velocity,
          emitter.px,
          emitter.py,
          emitter.x,
          emitter.y,
          radius * 4 + 18,
          [target[0], target[1], 0],
          3,
          FLOW * 0.6
        );
      }
      this.splat(dye, emitter.px, emitter.py, emitter.x, emitter.y, radius, [5.6, 5.6, 0.7], 2, 1, radius * 5 + 6);
      this.state.active = now;
    }

    burst(s, x, y, now) {
      const { velocity, dye } = this.state.targets;
      const radius = this.lightRadius(s);
      const jets = 6;
      const base = Math.random() * Math.PI * 2;
      for (let k = 0; k < jets; k++) {
        const angle = base + (k / jets) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const cx = Math.cos(angle);
        const cy = Math.sin(angle);
        const reach = 20 + Math.random() * 14;
        const ax = x + cx * 3;
        const ay = y + cy * 3;
        const bx = x + cx * reach;
        const by = y + cy * reach;
        if (!this.reduce) {
          const target = this.toGrid(Math.cos(angle + 0.6) * 760, Math.sin(angle + 0.6) * 760);
          this.splat(velocity, ax, ay, bx, by, 18, [target[0], target[1], 0], 1, 0.9);
        }
        this.splat(dye, ax, ay, bx, by, radius * 1.1, [2.4, 2.4, 0.3], 0, 1, radius * 5 + 6);
      }
      this.splat(dye, x, y, x + 0.01, y, radius * 2.2, [1.8, 1.8, 0.4], 0, 1, radius * 7 + 10);
      this.state.active = now;
    }

    step(s, dt) {
      const gl = this.gl;
      const { velocity, dye, pressure, divergence } = this.state.targets;
      if (!this.reduce) {
        let u = this.use(this.passes.divergence, velocity.read.texel);
        gl.uniform1i(u.uVelocity, this.bind(0, velocity.read));
        this.draw(divergence);

        u = this.use(this.passes.scale, pressure.read.texel);
        gl.uniform1i(u.uSource, this.bind(0, pressure.read));
        gl.uniform1f(u.uValue, 0.8);
        this.draw(pressure.write);
        pressure.swap();

        u = this.use(this.passes.pressure, pressure.read.texel);
        gl.uniform1i(u.uDivergence, this.bind(1, divergence));
        for (let i = 0; i < PRESSURE_STEPS; i++) {
          gl.uniform1i(u.uPressure, this.bind(0, pressure.read));
          this.draw(pressure.write);
          pressure.swap();
        }

        u = this.use(this.passes.gradient, velocity.read.texel);
        gl.uniform1i(u.uPressure, this.bind(0, pressure.read));
        gl.uniform1i(u.uVelocity, this.bind(1, velocity.read));
        this.draw(velocity.write);
        velocity.swap();

        u = this.use(this.passes.advect, velocity.read.texel);
        gl.uniform2f(u.uVelocityTexel, velocity.read.texel[0], velocity.read.texel[1]);
        gl.uniform1i(u.uVelocity, this.bind(0, velocity.read));
        gl.uniform1i(u.uSource, this.bind(0, velocity.read));
        gl.uniform1f(u.uDt, dt);
        const calm = Math.exp(-dt * 1.2);
        gl.uniform4f(u.uDecay, calm, calm, 1, 1);
        this.draw(velocity.write);
        velocity.swap();
      }

      const decay = [
        Math.exp((-dt * 4.6) / (s.linger * 0.8)),
        Math.exp((-dt * 4.6) / (s.linger * 0.2)),
        Math.exp((-dt * 4.6) / (s.linger * 1.2)),
        1
      ];
      const { forward, back } = this.state.targets;
      if (this.reduce) {
        const u = this.use(this.passes.advect, dye.read.texel);
        gl.uniform2f(u.uVelocityTexel, velocity.read.texel[0], velocity.read.texel[1]);
        gl.uniform1i(u.uVelocity, this.bind(0, velocity.read));
        gl.uniform1i(u.uSource, this.bind(1, dye.read));
        gl.uniform1f(u.uDt, 0);
        gl.uniform4f(u.uDecay, decay[0], decay[1], decay[2], decay[3]);
        this.draw(dye.write);
        dye.swap();
        return;
      }
      let u = this.use(this.passes.advect, dye.read.texel);
      gl.uniform2f(u.uVelocityTexel, velocity.read.texel[0], velocity.read.texel[1]);
      gl.uniform1i(u.uVelocity, this.bind(0, velocity.read));
      gl.uniform1i(u.uSource, this.bind(1, dye.read));
      gl.uniform1f(u.uDt, dt);
      gl.uniform4f(u.uDecay, 1, 1, 1, 1);
      this.draw(forward);
      gl.uniform1i(u.uSource, this.bind(1, forward));
      gl.uniform1f(u.uDt, -dt);
      this.draw(back);
      u = this.use(this.passes.maccormack, dye.read.texel);
      gl.uniform2f(u.uVelocityTexel, velocity.read.texel[0], velocity.read.texel[1]);
      gl.uniform2f(u.uSourceTexel, dye.read.texel[0], dye.read.texel[1]);
      gl.uniform1i(u.uVelocity, this.bind(0, velocity.read));
      gl.uniform1i(u.uSource, this.bind(1, dye.read));
      gl.uniform1i(u.uForward, this.bind(2, forward));
      gl.uniform1i(u.uBack, this.bind(3, back));
      gl.uniform1f(u.uDt, dt);
      gl.uniform4f(u.uDecay, decay[0], decay[1], decay[2], decay[3]);
      this.draw(dye.write);
      dye.swap();
    }

    setShade(u, s) {
      const gl = this.gl;
      gl.uniform3f(u.uColor, this.state.color[0], this.state.color[1], this.state.color[2]);
      gl.uniform3f(u.uSecondary, this.state.secondary[0], this.state.secondary[1], this.state.secondary[2]);
      gl.uniform1f(u.uIntensity, s.intensity);
      gl.uniform1f(u.uHotspot, s.hotspot);
    }

    render(s) {
      const gl = this.gl;
      const { dye, bloom } = this.state.targets;
      if (s.glow > 0) {
        let u = this.use(this.passes.prefilter, bloom[0].texel);
        gl.uniform1i(u.uDye, this.bind(0, dye.read));
        gl.uniform2f(u.uDyeTexel, dye.read.texel[0], dye.read.texel[1]);
        this.setShade(u, s);
        this.draw(bloom[0]);
        u = this.use(this.passes.down, bloom[0].texel);
        for (let i = 1; i < bloom.length; i++) {
          gl.uniform1i(u.uSource, this.bind(0, bloom[i - 1]));
          gl.uniform2f(u.uSourceTexel, bloom[i - 1].texel[0], bloom[i - 1].texel[1]);
          this.draw(bloom[i]);
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        u = this.use(this.passes.up, bloom[0].texel);
        for (let i = bloom.length - 1; i > 0; i--) {
          gl.uniform1i(u.uSource, this.bind(0, bloom[i]));
          gl.uniform2f(u.uSourceTexel, bloom[i].texel[0], bloom[i].texel[1]);
          this.draw(bloom[i - 1]);
        }
        gl.disable(gl.BLEND);
      }
      const u = this.use(this.passes.display, [1 / this.canvas.width, 1 / this.canvas.height]);
      gl.uniform1i(u.uDye, this.bind(0, dye.read));
      gl.uniform1i(u.uBloom, this.bind(1, bloom[0]));
      this.setShade(u, s);
      gl.uniform1f(u.uGlow, s.glow > 0 ? (s.glow * 1.4) / BLOOM_LEVELS : 0);
      gl.uniform1f(u.uGrain, s.grain);
      gl.uniform1f(u.uTime, this.state.time);
      const isLight = s.theme === 'light' || document.documentElement.classList.contains('light');
      gl.uniform1f(u.uLight, isLight ? 1 : 0);
      this.draw(null);
    }

    blank() {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    frame(now) {
      this.raf = 0;
      if (!this.alive || !this.visible || document.hidden) return;
      const s = this.settings;
      const dt = this.last ? Math.min(1 / 30, (now - this.last) / 1000) : 1 / 60;
      this.last = now;
      this.state.time += dt;
      const wanted = Math.min(window.devicePixelRatio || 1, Math.max(0.5, s.maxDevicePixelRatio || 2));
      if (Math.abs(wanted - this.state.ratio) > 0.01) this.resize();
      this.allocate();
      this.resolveColors(s);
      this.gl.bindVertexArray(this.vao);
      this.gl.disable(this.gl.BLEND);

      if (this.state.ready) this.emit(s, dt, now);
      while (this.state.bursts.length) {
        const [x, y] = this.state.bursts.shift();
        this.burst(s, x, y, now);
      }
      this.step(s, dt);
      this.render(s);

      const quiet = now - this.state.active > s.linger * 1200 + 900;
      const resting = Math.hypot(this.state.emitter.vx, this.state.emitter.vy) < 1;
      if (quiet && resting) {
        this.clearTargets();
        this.blank();
        this.last = 0;
        return;
      }
      this.raf = requestAnimationFrame(t => this.frame(t));
    }

    wake() {
      if (!this.raf && this.alive && this.visible && !document.hidden) {
        this.raf = requestAnimationFrame(t => this.frame(t));
      }
    }

    bindEvents() {
      this.onPointerMove = event => {
        const x = event.clientX;
        const y = event.clientY;
        if (!this.state.ready) {
          this.state.emitter.x = x;
          this.state.emitter.y = y;
          this.state.emitter.px = x;
          this.state.emitter.py = y;
          this.state.emitter.vx = 0;
          this.state.emitter.vy = 0;
          this.state.ready = true;
        }
        this.state.pointer.x = x;
        this.state.pointer.y = y;
        this.state.pointer.inside = true;
        this.wake();
      };

      this.onPointerDown = event => {
        if (!this.settings.clickBurst || !this.settings.enabled) return;
        this.state.bursts.push([event.clientX, event.clientY]);
        this.wake();
      };

      this.onPointerLeave = () => {
        this.state.pointer.inside = false;
        this.state.ready = false;
        this.wake();
      };

      this.onVisibility = () => {
        this.last = 0;
        this.wake();
      };

      this.onResize = () => {
        this.resize();
        this.wake();
      };

      window.addEventListener('resize', this.onResize, { passive: true });
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
      document.documentElement.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibility);

      // Listen for light/dark mode theme changes
      this.themeObserver = new MutationObserver(() => {
        const isLight = document.documentElement.classList.contains('light');
        this.settings.theme = isLight ? 'light' : 'dark';
        this.updateBlendMode();
        this.wake();
      });
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    destroy() {
      this.alive = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerdown', this.onPointerDown);
      document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
      document.removeEventListener('visibilitychange', this.onVisibility);
      if (this.themeObserver) this.themeObserver.disconnect();
      this.release();
      const gl = this.gl;
      if (gl) {
        Object.values(this.passes).forEach(p => gl.deleteProgram(p.program));
        gl.deleteBuffer(this.buffer);
        gl.deleteVertexArray(this.vao);
      }
      if (this.container && this.container.id === 'glow-cursor-container') {
        this.container.remove();
      }
    }
  }

  // Auto-init with the exact requested React Bits configuration
  if (typeof document !== 'undefined') {
    const init = () => {
      if (!window.__glowCursorInstance) {
        window.__glowCursorInstance = new GlowCursor(null, {
          color: '#7ff3ff',
          intensity: 0.75,
          trailWidth: 2,
          linger: 1,
          glow: 0.6,
          clickBurst: false,
          theme: document.documentElement.classList.contains('light') ? 'light' : 'dark'
        });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return GlowCursor;
});
