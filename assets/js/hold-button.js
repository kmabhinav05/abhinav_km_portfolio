/**
 * React Bits HoldButton Vanilla JS Implementation
 * Docs: https://reactbits.dev/components/hold-button
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HoldButton = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const TAP_MS = 250;
  const HIT_PAD = 10;
  const LINEAR = t => t;
  const EASE_OUT = t => 1 - Math.pow(1 - t, 3);

  class HoldButton {
    constructor(container, options = {}) {
      if (!container) throw new Error('HoldButton requires a container element');
      this.container = container;
      this.options = Object.assign({
        children: 'Hold to delete',
        doneLabel: 'Deleted',
        icon: null,
        doneIcon: null,
        backgroundColor: '#27272a',
        fillColor: '#5227FF',
        textColor: '#f5f5f5',
        fillTextColor: '#ffffff',
        size: 'md',
        radius: 14,
        fillDirection: 'right',
        holdTime: 2000,
        releaseTime: 200,
        pressScale: 0.97,
        wave: true,
        waveAmplitude: 6,
        glow: true,
        resetAfter: 1200,
        disabled: false,
        onHold: null,
        onTap: null,
        className: ''
      }, options);

      this.phase = 'idle';
      this.input = null;
      this.gesture = { pointerId: null, start: 0, rect: null };
      this.timers = { complete: 0, reset: 0 };
      this.motion = { raf: 0, p: 0, from: 0, to: 0, start: 0 };

      this.initDOM();
      this.bindEvents();
    }

    initDOM() {
      const opts = this.options;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hold-button hold-button--${opts.size}${opts.className ? ' ' + opts.className : ''}`;
      btn.setAttribute('data-phase', 'idle');
      btn.setAttribute('data-direction', opts.fillDirection === 'up' ? 'up' : 'right');
      if (opts.glow) btn.setAttribute('data-glow', 'true');
      if (opts.disabled) btn.disabled = true;

      this.button = btn;
      this.applyCSSProperties();

      // Pulse
      const pulse = document.createElement('span');
      pulse.className = 'hold-button__pulse';
      pulse.setAttribute('aria-hidden', 'true');
      btn.appendChild(pulse);

      // Base label container
      const baseLabel = document.createElement('span');
      baseLabel.className = 'hold-button__label';
      this.baseLabel = baseLabel;
      this.renderLabels(baseLabel);
      btn.appendChild(baseLabel);

      // Clip mask with fill and wave crest
      const clip = document.createElement('span');
      clip.className = 'hold-button__clip';
      clip.setAttribute('aria-hidden', 'true');

      const fill = document.createElement('span');
      fill.className = 'hold-button__fill';
      const fillLabel = document.createElement('span');
      fillLabel.className = 'hold-button__label hold-button__label--fill';
      this.fillLabel = fillLabel;
      this.renderLabels(fillLabel);
      fill.appendChild(fillLabel);
      clip.appendChild(fill);

      const crest = document.createElement('span');
      crest.className = 'hold-button__crest';
      crest.setAttribute('aria-hidden', 'true');
      const crestLabel = document.createElement('span');
      crestLabel.className = 'hold-button__label hold-button__label--fill';
      this.crestLabel = crestLabel;
      this.renderLabels(crestLabel);
      crest.appendChild(crestLabel);
      clip.appendChild(crest);

      btn.appendChild(clip);

      // Screen reader hint
      const sr = document.createElement('span');
      sr.className = 'hold-button__sr';
      sr.textContent = `Press and hold for ${Math.round(opts.holdTime / 100) / 10} seconds to confirm`;
      this.srHint = sr;
      btn.appendChild(sr);

      this.container.appendChild(btn);

      // Resize observer to track dimensions
      this.measure();
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.measure());
        this.resizeObserver.observe(btn);
      }
    }

    applyCSSProperties() {
      const opts = this.options;
      const b = this.button;
      b.style.setProperty('--hb-radius', typeof opts.radius === 'number' ? `${opts.radius}px` : opts.radius);
      b.style.setProperty('--hb-bg', opts.backgroundColor);
      b.style.setProperty('--hb-fill', opts.fillColor);
      b.style.setProperty('--hb-text', opts.textColor);
      b.style.setProperty('--hb-fill-text', opts.fillTextColor);
      b.style.setProperty('--hb-hold', `${opts.holdTime}ms`);
      b.style.setProperty('--hb-cycles', (opts.holdTime / 1100).toFixed(2));
      b.style.setProperty('--hb-release', `${opts.releaseTime}ms`);
      b.style.setProperty('--hb-press', opts.pressScale);
      b.style.setProperty('--hb-wave', `${opts.wave ? opts.waveAmplitude : 0}px`);
    }

    renderLabels(parent) {
      parent.innerHTML = '';

      const idle = document.createElement('span');
      idle.className = 'hold-button__idle';
      if (this.options.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'hold-button__icon';
        if (typeof this.options.icon === 'string') {
          iconSpan.innerHTML = this.options.icon;
        } else if (this.options.icon instanceof Node) {
          iconSpan.appendChild(this.options.icon.cloneNode(true));
        }
        idle.appendChild(iconSpan);
      }
      const idleText = document.createElement('span');
      idleText.className = 'hold-button__text';
      idleText.innerHTML = this.options.children;
      idle.appendChild(idleText);

      const done = document.createElement('span');
      done.className = 'hold-button__done';
      if (this.options.doneIcon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'hold-button__icon';
        if (typeof this.options.doneIcon === 'string') {
          iconSpan.innerHTML = this.options.doneIcon;
        } else if (this.options.doneIcon instanceof Node) {
          iconSpan.appendChild(this.options.doneIcon.cloneNode(true));
        }
        done.appendChild(iconSpan);
      }
      const doneText = document.createElement('span');
      doneText.className = 'hold-button__text';
      doneText.innerHTML = this.options.doneLabel;
      done.appendChild(doneText);

      parent.appendChild(idle);
      parent.appendChild(done);
    }

    measure() {
      if (!this.button) return;
      this.button.style.setProperty('--hb-w', `${this.button.offsetWidth}px`);
      this.button.style.setProperty('--hb-h', `${this.button.offsetHeight}px`);
    }

    go(next, kind = null) {
      this.phase = next;
      this.input = kind;
      this.button.setAttribute('data-phase', next);
      if (kind) {
        this.button.setAttribute('data-input', kind);
      } else {
        this.button.removeAttribute('data-input');
      }
    }

    clearTimers() {
      clearTimeout(this.timers.complete);
      clearTimeout(this.timers.reset);
    }

    drive(to, duration, ease) {
      const m = this.motion;
      cancelAnimationFrame(m.raf);
      m.from = m.p;
      m.to = to;
      m.start = performance.now();

      const step = now => {
        const t = duration > 0 ? Math.min(1, (now - m.start) / duration) : 1;
        m.p = m.from + (m.to - m.from) * ease(t);
        this.button?.style.setProperty('--hb-p', m.p.toFixed(4));
        if (t < 1) {
          m.raf = requestAnimationFrame(step);
          return;
        }
        m.raf = 0;
        if (m.to === 1) this.complete();
      };
      m.raf = requestAnimationFrame(step);
    }

    complete() {
      if (this.phase !== 'holding') return;
      if (performance.now() - this.gesture.start < this.options.holdTime - 50) return;
      this.clearTimers();
      this.go('done', this.input);
      if (typeof this.options.onHold === 'function') {
        this.options.onHold();
      }
      if (this.options.resetAfter > 0) {
        this.timers.reset = setTimeout(() => {
          this.go('idle');
          this.drive(0, this.options.releaseTime, EASE_OUT);
        }, this.options.resetAfter);
      }
    }

    begin(kind) {
      if (this.options.disabled || this.phase !== 'idle') return false;
      this.gesture.start = performance.now();
      this.gesture.rect = this.button.getBoundingClientRect();
      this.go('holding', kind);
      this.drive(1, this.options.holdTime, LINEAR);
      this.timers.complete = setTimeout(() => this.complete(), this.options.holdTime + 100);
      return true;
    }

    release({ drifted = false } = {}) {
      if (this.phase !== 'holding') return;
      this.clearTimers();
      const held = performance.now() - this.gesture.start;
      this.go('idle');
      this.drive(0, this.options.releaseTime, EASE_OUT);
      if (!drifted && held < TAP_MS && typeof this.options.onTap === 'function') {
        this.options.onTap();
      }
    }

    bindEvents() {
      const b = this.button;

      b.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !e.isPrimary || this.gesture.pointerId !== null) return;
        if (!this.begin('pointer')) return;
        this.gesture.pointerId = e.pointerId;
        try {
          b.setPointerCapture(e.pointerId);
        } catch {}
      });

      const endPointer = (e, opts) => {
        if (e.pointerId !== this.gesture.pointerId) return;
        this.gesture.pointerId = null;
        try {
          if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
        } catch {}
        this.release(opts);
      };

      b.addEventListener('pointermove', e => {
        if (e.pointerId !== this.gesture.pointerId) return;
        const r = this.gesture.rect;
        if (!r) return;
        const out =
          e.clientX < r.left - HIT_PAD ||
          e.clientX > r.right + HIT_PAD ||
          e.clientY < r.top - HIT_PAD ||
          e.clientY > r.bottom + HIT_PAD;
        if (out) endPointer(e, { drifted: true });
      });

      b.addEventListener('pointerup', e => endPointer(e));
      b.addEventListener('pointercancel', e => endPointer(e, { drifted: true }));
      b.addEventListener('lostpointercapture', e => endPointer(e, { drifted: true }));
      b.addEventListener('pointerleave', e => {
        if (e.pointerType !== 'touch') endPointer(e, { drifted: true });
      });

      b.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          if (this.input === 'key') this.release({ drifted: true });
          return;
        }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!e.repeat) this.begin('key');
        }
      });

      b.addEventListener('keyup', e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (this.input === 'key') this.release();
        }
      });

      b.addEventListener('contextmenu', e => e.preventDefault());

      this.onBlur = () => {
        if (this.phase === 'holding') this.release({ drifted: true });
      };
      window.addEventListener('blur', this.onBlur);

      this.onVisibility = () => {
        if (document.hidden && this.phase === 'holding') {
          this.release({ drifted: true });
        }
      };
      document.addEventListener('visibilitychange', this.onVisibility);
    }

    setProps(newProps = {}) {
      Object.assign(this.options, newProps);
      this.applyCSSProperties();

      if (newProps.children !== undefined || newProps.doneLabel !== undefined || newProps.icon !== undefined || newProps.doneIcon !== undefined) {
        if (this.baseLabel) this.renderLabels(this.baseLabel);
        if (this.fillLabel) this.renderLabels(this.fillLabel);
        if (this.crestLabel) this.renderLabels(this.crestLabel);
      }

      if (newProps.size) {
        this.button.className = `hold-button hold-button--${newProps.size}${this.options.className ? ' ' + this.options.className : ''}`;
      }

      this.measure();
    }

    destroy() {
      this.clearTimers();
      cancelAnimationFrame(this.motion.raf);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      window.removeEventListener('blur', this.onBlur);
      document.removeEventListener('visibilitychange', this.onVisibility);
      if (this.button && this.button.parentNode) {
        this.button.parentNode.removeChild(this.button);
      }
    }
  }

  return HoldButton;
});
