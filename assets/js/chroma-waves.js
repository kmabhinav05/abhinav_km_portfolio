/**
 * Chroma Waves - React Bits Pro Component
 * WebGL GPU Shader Engine
 * 
 * Features:
 * - Fluid undulating harmonic wave fields with prismatic chromatic dispersion (RGB shift)
 * - Full props support: width, height, speed, color, backgroundColor, waveFrequency,
 *   waveAmplitude, distortion, chromaShift, noiseLevel, flatness, opacity, quality
 * - Smooth interactive pointer disturbance with natural fluid inertia
 * - Seamless Light / Dark theme responsiveness
 * 
 * Docs: https://pro.reactbits.dev/docs/components/chroma-waves
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChromaWaves = factory();
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
    uniform vec3 uColor;
    uniform vec3 uBackgroundColor;
    uniform float uWaveFrequency;
    uniform float uWaveAmplitude;
    uniform float uDistortion;
    uniform float uChromaShift;
    uniform float uNoiseLevel;
    uniform float uFlatness;
    uniform float uOpacity;
    uniform vec2 uPointer;
    varying vec2 vUv;

    mat2 rotate2d(float angle) {
      return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    }

    float waveOffset(vec2 pos, float shift, float t) {
      // Displace along chromatic offset axis
      vec2 q = pos + vec2(shift * uChromaShift * 0.12, -shift * uChromaShift * 0.06);
      q = rotate2d(0.38) * q;

      float w1 = sin(q.x * uWaveFrequency * 7.0 + t * 1.4) * uWaveAmplitude;
      float w2 = cos(q.y * uWaveFrequency * 9.0 - t * 1.1 + w1 * uDistortion) * (uWaveAmplitude * 0.7);
      float w3 = sin((q.x + q.y) * uWaveFrequency * 6.0 + t * 0.9 + w2 * uDistortion) * (uWaveAmplitude * 0.5);

      float elevation = w1 + w2 + w3;
      float peak = sin(elevation * 3.14159265 + q.y * 2.2 + t);
      peak = 0.5 + 0.5 * peak;
      return pow(peak, max(0.1, uFlatness));
    }

    void main() {
      vec2 p = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
      p.x *= (uResolution.x / uResolution.y);

      // Smooth interactive mouse disturbance
      vec2 m = uPointer * 2.0 - 1.0;
      m.x *= (uResolution.x / uResolution.y);
      float mDist = length(p - m);
      p += normalize(p - m + 0.001) * exp(-mDist * 2.2) * 0.12;

      // Sample chromatic RGB separation
      float r = waveOffset(p, 1.0, uTime);
      float g = waveOffset(p, 0.0, uTime);
      float b = waveOffset(p, -1.0, uTime);

      vec3 waveCol = vec3(r, g, b);

      // Vertical background gradient
      vec3 bg = mix(uBackgroundColor, uBackgroundColor * 0.75, gl_FragCoord.y / uResolution.y);

      // Prismatic iridescent specular fringe
      vec3 fringe = vec3(r * 1.05, g * 0.85, b * 1.25);
      vec3 waveMix = uColor * waveCol + fringe * 0.35;

      float waveMask = clamp((r + g + b) * 0.45, 0.0, 1.0);
      vec3 col = mix(bg, waveMix, waveMask);

      // Film grain noise
      float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (grain - 0.5) * uNoiseLevel * 0.15;

      gl_FragColor = vec4(col, uOpacity);
    }
  `;

  class ChromaWaves {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) return;

      const ds = this.container.dataset || {};

      this.speed = options.speed !== undefined ? Number(options.speed) : (ds.speed ? Number(ds.speed) : 0.5);
      this.color = options.color || ds.color || '#FFFFFF';
      this.backgroundColor = options.backgroundColor || ds.backgroundColor || '#8B5CF6';
      this.waveFrequency = options.waveFrequency !== undefined ? Number(options.waveFrequency) : (ds.waveFrequency ? Number(ds.waveFrequency) : 0.2);
      this.waveAmplitude = options.waveAmplitude !== undefined ? Number(options.waveAmplitude) : (ds.waveAmplitude ? Number(ds.waveAmplitude) : 0.3);
      this.distortion = options.distortion !== undefined ? Number(options.distortion) : (ds.distortion ? Number(ds.distortion) : 1.5);
      this.chromaShift = options.chromaShift !== undefined ? Number(options.chromaShift) : (ds.chromaShift ? Number(ds.chromaShift) : 0.25);
      this.noiseLevel = options.noiseLevel !== undefined ? Number(options.noiseLevel) : (ds.noiseLevel ? Number(ds.noiseLevel) : 0.1);
      this.flatness = options.flatness !== undefined ? Number(options.flatness) : (ds.flatness ? Number(ds.flatness) : 1.0);
      this.opacity = options.opacity !== undefined ? Number(options.opacity) : (ds.opacity ? Number(ds.opacity) : 1.0);
      this.quality = options.quality || ds.quality || 'high';

      // Current interpolated colors for smooth transition between themes
      this.curColor = hexToRgb(this.color);
      this.targetColor = [...this.curColor];
      this.curBgColor = hexToRgb(this.backgroundColor);
      this.targetBgColor = [...this.curBgColor];

      this.pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
      this.startTime = performance.now();
      this.animId = null;

      this.initCanvas();
      this.initGL();
      this.bindEvents();
      this.checkThemeColors();
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

      let dpr = window.devicePixelRatio || 1;
      if (this.quality === 'low') dpr = Math.min(dpr, 0.75);
      else if (this.quality === 'medium') dpr = Math.min(dpr, 1);
      else dpr = Math.min(dpr, 1.75);

      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);

      if (this.gl) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    initGL() {
      const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: true }) ||
                 this.canvas.getContext('webgl', { alpha: true });
      if (!gl) {
        console.warn('WebGL not supported for ChromaWaves');
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
        console.error('ChromaWaves program link error:', gl.getProgramInfoLog(program));
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
        uColor: gl.getUniformLocation(program, 'uColor'),
        uBackgroundColor: gl.getUniformLocation(program, 'uBackgroundColor'),
        uWaveFrequency: gl.getUniformLocation(program, 'uWaveFrequency'),
        uWaveAmplitude: gl.getUniformLocation(program, 'uWaveAmplitude'),
        uDistortion: gl.getUniformLocation(program, 'uDistortion'),
        uChromaShift: gl.getUniformLocation(program, 'uChromaShift'),
        uNoiseLevel: gl.getUniformLocation(program, 'uNoiseLevel'),
        uFlatness: gl.getUniformLocation(program, 'uFlatness'),
        uOpacity: gl.getUniformLocation(program, 'uOpacity'),
        uPointer: gl.getUniformLocation(program, 'uPointer')
      };

      this.resize();
    }

    compileShader(type, src) {
      const gl = this.gl;
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('ChromaWaves shader compile error:', gl.getShaderInfoLog(s));
      }
      return s;
    }

    checkThemeColors() {
      const isLight = document.documentElement.classList.contains('light');
      // If user hasn't explicitly locked custom colors, dynamically adapt palette
      if (this.container.dataset.adaptiveTheme !== 'false') {
        if (isLight) {
          this.targetBgColor = hexToRgb('#f1f5f9');
          this.targetColor = hexToRgb('#6366f1');
        } else {
          this.targetBgColor = hexToRgb('#09090b');
          this.targetColor = hexToRgb('#8b5cf6');
        }
      }
    }

    bindEvents() {
      this.onResize = () => this.resize();
      window.addEventListener('resize', this.onResize);

      this.onMouseMove = (e) => {
        this.pointer.targetX = e.clientX / window.innerWidth;
        this.pointer.targetY = 1.0 - (e.clientY / window.innerHeight);
      };
      window.addEventListener('mousemove', this.onMouseMove);

      // Listen for light/dark mode changes
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

      const elapsed = ((now - this.startTime) / 1000) * this.speed;

      // Smooth pointer lerp
      this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.06;
      this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.06;

      // Smooth color transitions between themes
      for (let i = 0; i < 3; i++) {
        this.curColor[i] = lerp(this.curColor[i], this.targetColor[i], 0.05);
        this.curBgColor[i] = lerp(this.curBgColor[i], this.targetBgColor[i], 0.05);
      }

      gl.useProgram(this.program);

      gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.uTime, elapsed);
      gl.uniform3fv(this.uniforms.uColor, this.curColor);
      gl.uniform3fv(this.uniforms.uBackgroundColor, this.curBgColor);
      gl.uniform1f(this.uniforms.uWaveFrequency, this.waveFrequency);
      gl.uniform1f(this.uniforms.uWaveAmplitude, this.waveAmplitude);
      gl.uniform1f(this.uniforms.uDistortion, this.distortion);
      gl.uniform1f(this.uniforms.uChromaShift, this.chromaShift);
      gl.uniform1f(this.uniforms.uNoiseLevel, this.noiseLevel);
      gl.uniform1f(this.uniforms.uFlatness, this.flatness);
      gl.uniform1f(this.uniforms.uOpacity, this.opacity);
      gl.uniform2f(this.uniforms.uPointer, this.pointer.x, this.pointer.y);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    destroy() {
      if (this.animId) cancelAnimationFrame(this.animId);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('mousemove', this.onMouseMove);
      if (this.observer) this.observer.disconnect();
    }

    static initAll(selector = '.chroma-waves, [data-chroma-waves]') {
      const containers = document.querySelectorAll(selector);
      const instances = [];
      containers.forEach(el => {
        if (!el._chromaWavesInstance) {
          el._chromaWavesInstance = new ChromaWaves(el);
          instances.push(el._chromaWavesInstance);
        }
      });
      return instances;
    }
  }

  // Auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => ChromaWaves.initAll());
    } else {
      ChromaWaves.initAll();
    }
  }

  return ChromaWaves;
});
