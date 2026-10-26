/**
 * React Bits BellToggle Component (Vanilla JS & Web Animation API Implementation)
 * Docs: https://reactbits.dev/components/bell-toggle
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellToggle = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const SEG_EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';
  const WARP = 0.6;
  const SIZES = {
    sm: [36, 12.5, 14, 15, 8],
    md: [44, 13.5, 16, 19, 9],
    lg: [52, 15, 18, 23, 10]
  };
  const WOBBLE = { amplitude: 0.4, passes: 3, duration: 420 };
  const BELL_BODY = 'M6 16.5V10a6 6 0 0 1 12 0v6.5l1.6 2.3H4.4L6 16.5z';

  const passOffset = (k, passes) => 1 - Math.pow(1 - (k + 2 / 3) / (passes + 1), WARP);

  const ringKeyframes = (from, amplitude, passes, decay) => {
    const frames = [{ transform: `rotate(${from}deg)`, offset: 0, easing: SEG_EASE }];
    for (let k = 0; k < passes; k++) {
      const angle = amplitude * Math.pow(1 - k / passes, decay) * (k % 2 ? 1 : -1);
      frames.push({
        transform: `rotate(${angle.toFixed(2)}deg)`,
        offset: passOffset(k, passes),
        easing: SEG_EASE
      });
    }
    frames.push({ transform: 'rotate(0deg)', offset: 1 });
    return frames;
  };

  const liveAngle = (el) => {
    if (!el) return 0;
    const tf = window.getComputedStyle(el).transform;
    if (!tf || tf === 'none') return 0;
    try {
      const m = new DOMMatrix(tf);
      return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    } catch (e) {
      return 0;
    }
  };

  class BellToggle {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) return;

      this.options = Object.assign({
        offLabel: 'Send Message',
        onLabel: 'Sent Successfully!',
        size: 'md',
        radius: 22,
        ringAmplitude: 17,
        ringPasses: 5,
        ringDecay: 1,
        ringDuration: 820,
        ringPivot: 16,
        crossfadeMs: 200,
        revealBounce: 0,
        count: 0,
        badge: false,
        badgeColor: '#ef4444',
        badgeTextColor: '#ffffff',
        waves: true,
        clapper: false,
        defaultPressed: false,
        disabled: false,
        className: '',
        color: '#f5f5f5',
        background: '#27272a',
        onColor: '#060908',
        onBackground: '#00d1ff',
        onChange: null
      }, options);

      this.on = Boolean(this.options.pressed !== undefined ? this.options.pressed : this.options.defaultPressed);
      this.t = this.on ? 1 : 0;
      this.targetT = this.t;
      this.wOff = 0;
      this.wOn = 0;
      this.springRaf = null;

      this.buildDOM();
      this.measure();
      this.bindEvents();
    }

    buildDOM() {
      const opt = this.options;
      const [h, fs, iconSize, px, gap] = SIZES[opt.size] || SIZES.md;

      this.root = document.createElement('span');
      this.root.className = `bell-toggle${opt.className ? ` ${opt.className}` : ''}`;
      this.root.dataset.on = this.on ? 'true' : 'false';
      if (opt.disabled) this.root.dataset.disabled = '';

      // CSS Variables
      const s = this.root.style;
      s.setProperty('--bt-clip', '0px');
      s.setProperty('--bt-color', opt.color);
      s.setProperty('--bt-bg', opt.background);
      s.setProperty('--bt-on-color', opt.onColor);
      s.setProperty('--bt-on-bg', opt.onBackground);
      s.setProperty('--bt-badge', opt.badgeColor);
      s.setProperty('--bt-badge-ink', opt.badgeTextColor);
      s.setProperty('--bt-radius', `${opt.radius}px`);
      s.setProperty('--bt-fade', `${opt.crossfadeMs}ms`);
      s.setProperty('--bt-pivot', `${opt.ringPivot}%`);
      s.setProperty('--bt-h', `${h}px`);
      s.setProperty('--bt-fs', `${fs}px`);
      s.setProperty('--bt-icon', `${iconSize}px`);
      s.setProperty('--bt-px', `${px}px`);
      s.setProperty('--bt-gap', `${gap}px`);

      // Button
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.className = 'bell-toggle__button';
      this.button.setAttribute('aria-pressed', this.on ? 'true' : 'false');
      this.button.setAttribute('aria-label', opt.label || opt.offLabel);
      if (opt.disabled) this.button.disabled = true;

      // Bell Graphic
      this.bell = document.createElement('span');
      this.bell.className = 'bell-toggle__bell';
      this.bell.setAttribute('aria-hidden', 'true');

      // Glyph
      this.glyph = document.createElement('span');
      this.glyph.className = 'bell-toggle__glyph';
      this.glyph.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2.5V4" />
          <path d="${BELL_BODY}" />
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </svg>
      `;
      this.bell.appendChild(this.glyph);

      // Sound Waves
      if (opt.waves) {
        this.waveLeft = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.waveLeft.setAttribute('class', 'bell-toggle__wave bell-toggle__wave--left');
        this.waveLeft.setAttribute('viewBox', '0 0 14 14');
        this.waveLeft.innerHTML = '<path d="M14 8a6 6 0 0 0-6 6" /><path d="M14 4A10 10 0 0 0 4 14" />';

        this.waveRight = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.waveRight.setAttribute('class', 'bell-toggle__wave bell-toggle__wave--right');
        this.waveRight.setAttribute('viewBox', '0 0 14 14');
        this.waveRight.innerHTML = '<path d="M0 8a6 6 0 0 1 6 6" /><path d="M0 4a10 10 0 0 1 10 10" />';

        this.bell.appendChild(this.waveLeft);
        this.bell.appendChild(this.waveRight);
      }

      // Badge
      if (opt.badge) {
        this.badge = document.createElement('span');
        this.badge.className = 'bell-toggle__badge';
        if (this.on && opt.count > 0) this.badge.dataset.show = '';
        this.digit = document.createElement('span');
        this.digit.className = 'bell-toggle__digit';
        this.digit.textContent = opt.count > 9 ? '9+' : opt.count;
        this.badge.appendChild(this.digit);
        this.bell.appendChild(this.badge);
      }

      this.button.appendChild(this.bell);

      // Labels container
      this.say = document.createElement('span');
      this.say.className = 'bell-toggle__say';
      this.say.setAttribute('aria-hidden', 'true');

      this.offFace = document.createElement('span');
      this.offFace.className = 'bell-toggle__face bell-toggle__face--off';
      this.offFace.textContent = opt.offLabel;

      this.onFace = document.createElement('span');
      this.onFace.className = 'bell-toggle__face bell-toggle__face--on';
      this.onFace.textContent = opt.onLabel;

      this.say.appendChild(this.offFace);
      this.say.appendChild(this.onFace);
      this.button.appendChild(this.say);

      this.root.appendChild(this.button);
      this.container.innerHTML = '';
      this.container.appendChild(this.root);
    }

    measure() {
      if (this.offFace) this.wOff = this.offFace.offsetWidth;
      if (this.onFace) this.wOn = this.onFace.offsetWidth;
      this.updateClip();

      if ('ResizeObserver' in window && !this.resizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.offFace) this.wOff = this.offFace.offsetWidth;
          if (this.onFace) this.wOn = this.onFace.offsetWidth;
          this.updateClip();
        });
        if (this.offFace) this.resizeObserver.observe(this.offFace);
        if (this.onFace) this.resizeObserver.observe(this.onFace);
      }

      if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
          if (this.offFace) this.wOff = this.offFace.offsetWidth;
          if (this.onFace) this.wOn = this.onFace.offsetWidth;
          this.updateClip();
        });
      }
    }

    updateClip() {
      const v = this.t;
      const maxW = Math.max(this.wOff, this.wOn);
      const curW = this.wOff + (this.wOn - this.wOff) * v;
      const clipPx = Math.max(0, maxW - curW);
      this.root.style.setProperty('--bt-clip', `${clipPx.toFixed(1)}px`);
    }

    animateT(target) {
      this.targetT = target;
      cancelAnimationFrame(this.springRaf);

      // Smooth spring step
      let velocity = 0;
      const stiffness = 180;
      const damping = 18;
      let lastTime = performance.now();

      const step = (now) => {
        const dt = Math.min((now - lastTime) / 1000, 0.032);
        lastTime = now;

        const force = -stiffness * (this.t - this.targetT);
        const damp = -damping * velocity;
        const acceleration = force + damp;

        velocity += acceleration * dt;
        this.t += velocity * dt;

        this.updateClip();

        if (Math.abs(this.t - this.targetT) > 0.001 || Math.abs(velocity) > 0.001) {
          this.springRaf = requestAnimationFrame(step);
        } else {
          this.t = this.targetT;
          this.updateClip();
        }
      };

      this.springRaf = requestAnimationFrame(step);
    }

    swing(amplitude, passes, duration) {
      const el = this.glyph;
      if (!el) return;

      const anims = el.getAnimations ? el.getAnimations() : [];
      anims.forEach((a) => a.cancel());

      const frames = ringKeyframes(liveAngle(el), amplitude, passes, this.options.ringDecay);
      el.animate(frames, { duration, easing: 'linear' });

      if (!this.options.waves) return;

      for (let k = 0; k < passes; k++) {
        const side = k % 2 ? this.waveRight : this.waveLeft;
        if (!side) continue;
        const strength = Math.pow(1 - k / passes, this.options.ringDecay);
        side.animate(
          [
            { opacity: 0, transform: 'scale(0.55)' },
            { opacity: 0.9 * strength, offset: 0.3 },
            { opacity: 0, transform: 'scale(1.25)' }
          ],
          {
            duration: 380,
            delay: passOffset(k, passes) * duration,
            easing: 'ease-out'
          }
        );
      }
    }

    setOn(nextState, triggerSwing = true) {
      if (this.on === nextState) return;
      this.on = nextState;
      this.root.dataset.on = this.on ? 'true' : 'false';
      this.button.setAttribute('aria-pressed', this.on ? 'true' : 'false');

      if (this.badge && this.options.badge) {
        if (this.on && this.options.count > 0) {
          this.badge.dataset.show = '';
        } else {
          delete this.badge.dataset.show;
        }
      }

      this.animateT(this.on ? 1 : 0);

      if (this.on && triggerSwing) {
        this.swing(this.options.ringAmplitude, this.options.ringPasses, this.options.ringDuration);
      }

      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.on);
      }
    }

    toggle() {
      this.setOn(!this.on, true);
    }

    bindEvents() {
      const onDown = (e) => {
        if (e.button === 0 && !this.options.disabled) {
          this.root.dataset.pressed = '';
        }
      };

      const onUp = () => {
        delete this.root.dataset.pressed;
      };

      this.button.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);

      this.button.addEventListener('click', (e) => {
        // If consumer provided a custom submit handler or form submit, they can intercept
        if (this.options.onClick) {
          this.options.onClick(e, this);
        } else {
          this.toggle();
        }
      });
    }

    destroy() {
      cancelAnimationFrame(this.springRaf);
      if (this.resizeObserver) this.resizeObserver.disconnect();
    }
  }

  return BellToggle;
});
