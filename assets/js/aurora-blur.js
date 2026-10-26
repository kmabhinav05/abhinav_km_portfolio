/**
 * Aurora Blur - React Bits Pro Component
 * WebGL GPU Shader Engine
 * 
 * Props:
 * - speed: number (Default: 1.5)
 * - noiseScale: number (Default: 3.5)
 * - movementX: number (Default: -2)
 * - movementY: number (Default: -3)
 * - verticalFade: number (Default: 0.75)
 * - bloomIntensity: number (Default: 2.0)
 * - brightness: number (Default: 0.8)
 * - saturation: number (Default: 1.0)
 * - layers: array of colors
 * - skyLayers: array of sky gradient colors
 * 
 * Docs: https://pro.reactbits.dev/docs/components/aurora-blur
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AuroraBlur = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function hexToRgb(hex) {
    if (!hex) return [1, 1, 1];
    let c = hex.replace('#', '').trim();
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const num = parseInt(c, 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    ];
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  const VS_SOURCE = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const FS_SOURCE = `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uNoiseScale;
    uniform float uMovementX;
    uniform float uMovementY;
    uniform float uVerticalFade;
    uniform float uBloomIntensity;
    uniform float uBrightness;
    uniform float uSaturation;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform vec3 uSkyTop;
    uniform vec3 uSkyBottom;
    varying vec2 vUv;

    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.2113248654, 0.3660254038, -0.5773502692, 0.0243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m; m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.792842914 - 0.85373472 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float auroraCurtain(vec2 uv, float t, float offset, float freq, float speed) {
      vec2 move = vec2(uMovementX * 0.035, uMovementY * 0.035) * t * speed;
      vec2 p = uv * uNoiseScale + move;
      float n = snoise(p + vec2(offset * 2.2, t * 0.12));
      float wave = sin(uv.x * freq + t * speed * 1.4 + n * 1.7) * 0.18;
      float yCenter = offset + wave;
      float dist = abs(uv.y - yCenter);
      return exp(-dist * dist * 16.0) * (0.65 + 0.35 * n);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      float t = uTime * uSpeed * 0.35;

      vec3 sky = mix(uSkyBottom, uSkyTop, uv.y);

      float a1 = auroraCurtain(uv, t, 0.36, 3.2, 1.0);
      float a2 = auroraCurtain(uv, t, 0.52, 4.4, 0.85);
      float a3 = auroraCurtain(uv, t, 0.68, 2.7, 1.15);
      float a4 = auroraCurtain(uv, t, 0.45, 5.2, 0.95);

      vec3 aurora = uColor1 * a1 + uColor2 * a2 + uColor3 * a3 + uColor4 * a4;
      float vFade = pow(sin(clamp(uv.y, 0.0, 1.0) * 3.14159265), uVerticalFade);

      vec3 col = sky + aurora * uBloomIntensity * vFade;
      col *= uBrightness;

      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, uSaturation);

      // Subtle atmospheric grain
      float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (grain - 0.5) * 0.02;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  class AuroraBlur {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) return;

      const ds = this.container.dataset || {};

      this.speed = options.speed !== undefined ? Number(options.speed) : (ds.speed ? Number(ds.speed) : 1.5);
      this.noiseScale = options.noiseScale !== undefined ? Number(options.noiseScale) : (ds.noiseScale ? Number(ds.noiseScale) : 3.5);
      this.movementX = options.movementX !== undefined ? Number(options.movementX) : (ds.movementX ? Number(ds.movementX) : -2);
      this.movementY = options.movementY !== undefined ? Number(options.movementY) : (ds.movementY ? Number(ds.movementY) : -3);
      this.verticalFade = options.verticalFade !== undefined ? Number(options.verticalFade) : (ds.verticalFade ? Number(ds.verticalFade) : 0.75);
      this.bloomIntensity = options.bloomIntensity !== undefined ? Number(options.bloomIntensity) : (ds.bloomIntensity ? Number(ds.bloomIntensity) : 2.0);
      this.brightness = options.brightness !== undefined ? Number(options.brightness) : (ds.brightness ? Number(ds.brightness) : 0.8);
      this.saturation = options.saturation !== undefined ? Number(options.saturation) : (ds.saturation ? Number(ds.saturation) : 1.0);

      // Target colors (interpolated for smooth theme transitions)
      this.color1 = hexToRgb('#00f5a0'); // Emerald
      this.color2 = hexToRgb('#00d9f5'); // Cyan
      this.color3 = hexToRgb('#7928ca'); // Violet
      this.color4 = hexToRgb('#ff0080'); // Magenta

      this.skyTop = hexToRgb('#090d16');
      this.skyBottom = hexToRgb('#030712');

      this.curSkyTop = [...this.skyTop];
      this.curSkyBottom = [...this.skyBottom];

      this.startTime = performance.now();
      this.animId = null;

      this.initCanvas();
      this.initGL();
      this.checkThemeColors();
      this.bindEvents();
      this.start();
    }

    initCanvas() {
      let canvas = this.container.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        this.container.appendChild(canvas);
      }
      this.canvas = canvas;
      this.resize();
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.container.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);

      if (this.gl) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    initGL() {
      const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: true }) ||
                 this.canvas.getContext('webgl', { alpha: false });
      if (!gl) {
        console.warn('WebGL not supported for AuroraBlur');
        return;
      }
      this.gl = gl;

      const vs = this.compileShader(gl.VERTEX_SHADER, VS_SOURCE);
      const fs = this.compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('AuroraBlur program link error:', gl.getProgramInfoLog(program));
        return;
      }

      this.program = program;
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const aPos = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      this.uniforms = {
        uResolution: gl.getUniformLocation(program, 'uResolution'),
        uTime: gl.getUniformLocation(program, 'uTime'),
        uSpeed: gl.getUniformLocation(program, 'uSpeed'),
        uNoiseScale: gl.getUniformLocation(program, 'uNoiseScale'),
        uMovementX: gl.getUniformLocation(program, 'uMovementX'),
        uMovementY: gl.getUniformLocation(program, 'uMovementY'),
        uVerticalFade: gl.getUniformLocation(program, 'uVerticalFade'),
        uBloomIntensity: gl.getUniformLocation(program, 'uBloomIntensity'),
        uBrightness: gl.getUniformLocation(program, 'uBrightness'),
        uSaturation: gl.getUniformLocation(program, 'uSaturation'),
        uColor1: gl.getUniformLocation(program, 'uColor1'),
        uColor2: gl.getUniformLocation(program, 'uColor2'),
        uColor3: gl.getUniformLocation(program, 'uColor3'),
        uColor4: gl.getUniformLocation(program, 'uColor4'),
        uSkyTop: gl.getUniformLocation(program, 'uSkyTop'),
        uSkyBottom: gl.getUniformLocation(program, 'uSkyBottom')
      };

      this.resize();
    }

    compileShader(type, src) {
      const gl = this.gl;
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('AuroraBlur shader compile error:', gl.getShaderInfoLog(s));
      }
      return s;
    }

    checkThemeColors() {
      const isLight = document.documentElement.classList.contains('light');
      if (isLight) {
        this.skyTop = hexToRgb('#e2e8f0');
        this.skyBottom = hexToRgb('#f8fafc');
        this.brightness = 0.95;
      } else {
        this.skyTop = hexToRgb('#090d16');
        this.skyBottom = hexToRgb('#030712');
        this.brightness = 0.8;
      }
    }

    bindEvents() {
      this.onResize = () => this.resize();
      window.addEventListener('resize', this.onResize);

      this.observer = new MutationObserver(() => {
        this.checkThemeColors();
      });
      this.observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    start() {
      const loop = (now) => {
        this.render(now);
        this.animId = requestAnimationFrame(loop);
      };
      this.animId = requestAnimationFrame(loop);
    }

    render(now) {
      const gl = this.gl;
      if (!gl || !this.program) return;

      const elapsed = (now - this.startTime) / 1000;

      // Smooth sky transition
      for (let i = 0; i < 3; i++) {
        this.curSkyTop[i] = lerp(this.curSkyTop[i], this.skyTop[i], 0.05);
        this.curSkyBottom[i] = lerp(this.curSkyBottom[i], this.skyBottom[i], 0.05);
      }

      gl.useProgram(this.program);

      gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.uTime, elapsed);
      gl.uniform1f(this.uniforms.uSpeed, this.speed);
      gl.uniform1f(this.uniforms.uNoiseScale, this.noiseScale);
      gl.uniform1f(this.uniforms.uMovementX, this.movementX);
      gl.uniform1f(this.uniforms.uMovementY, this.movementY);
      gl.uniform1f(this.uniforms.uVerticalFade, this.verticalFade);
      gl.uniform1f(this.uniforms.uBloomIntensity, this.bloomIntensity);
      gl.uniform1f(this.uniforms.uBrightness, this.brightness);
      gl.uniform1f(this.uniforms.uSaturation, this.saturation);

      gl.uniform3fv(this.uniforms.uColor1, this.color1);
      gl.uniform3fv(this.uniforms.uColor2, this.color2);
      gl.uniform3fv(this.uniforms.uColor3, this.color3);
      gl.uniform3fv(this.uniforms.uColor4, this.color4);

      gl.uniform3fv(this.uniforms.uSkyTop, this.curSkyTop);
      gl.uniform3fv(this.uniforms.uSkyBottom, this.curSkyBottom);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    destroy() {
      if (this.animId) cancelAnimationFrame(this.animId);
      window.removeEventListener('resize', this.onResize);
      if (this.observer) this.observer.disconnect();
    }

    static initAll(selector = '.aurora-blur-fixed, .aurora-blur, [data-aurora-blur]') {
      const containers = document.querySelectorAll(selector);
      const instances = [];
      containers.forEach(el => {
        if (!el._auroraBlurInstance) {
          el._auroraBlurInstance = new AuroraBlur(el);
          instances.push(el._auroraBlurInstance);
        }
      });
      return instances;
    }
  }

  // Auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => AuroraBlur.initAll());
    } else {
      AuroraBlur.initAll();
    }
  }

  return AuroraBlur;
});
