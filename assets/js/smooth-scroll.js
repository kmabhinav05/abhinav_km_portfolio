/**
 * Ultra-Smooth Momentum Scroll Engine (Lenis-style Vanilla JS implementation)
 * Tuned for locked 60/120fps GPU scrolling without blocking the main thread.
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SmoothScroll = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class SmoothScroll {
    constructor(options = {}) {
      if (typeof window === 'undefined') return;

      this.options = Object.assign({
        lerp: 0.09,              // Linear interpolation smoothing factor
        wheelMultiplier: 0.9,   // Wheel delta dampener
        touchMultiplier: 1.0,
        smoothTouch: false,      // Native touch momentum is 120Hz; keep native on touch by default
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      }, options);

      this.isTouch = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
      this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      // Do not override if user prefers reduced motion or on touch without smoothTouch
      if (this.reducedMotion || (this.isTouch && !this.options.smoothTouch)) {
        this.bindAnchorsOnly();
        return;
      }

      this.target = window.scrollY;
      this.current = window.scrollY;
      this.maxScroll = 0;
      this.isScrolling = false;
      this.raf = null;
      this.lastTime = performance.now();

      this.updateMaxScroll();
      this.bindEvents();
    }

    updateMaxScroll() {
      this.maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    onWheel(e) {
      if (e.ctrlKey || e.metaKey) return; // Allow pinch-zoom

      // Check if user is scrolling inside an overflow container (e.g. modal or scrollable box)
      let target = e.target;
      while (target && target !== document.body && target !== document.documentElement) {
        const style = window.getComputedStyle(target);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight) {
          // Allow internal scrolling
          return;
        }
        target = target.parentElement;
      }

      e.preventDefault();

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 40; // Line mode
      else if (e.deltaMode === 2) delta *= window.innerHeight; // Page mode

      this.target = Math.max(0, Math.min(this.target + delta * this.options.wheelMultiplier, this.maxScroll));

      if (!this.isScrolling) {
        this.isScrolling = true;
        this.lastTime = performance.now();
        this.raf = requestAnimationFrame(t => this.step(t));
      }
    }

    step(now) {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      // Frame-rate independent lerp dampening
      const factor = 1 - Math.exp(-dt * (1 / (this.options.lerp * 0.15)));
      this.current += (this.target - this.current) * factor;

      window.scrollTo(0, Math.round(this.current));

      const diff = Math.abs(this.target - this.current);
      if (diff > 0.4) {
        this.raf = requestAnimationFrame(t => this.step(t));
      } else {
        this.current = this.target;
        window.scrollTo(0, this.target);
        this.isScrolling = false;
        cancelAnimationFrame(this.raf);
        this.raf = null;
      }
    }

    scrollTo(targetY, duration = 650) {
      this.target = Math.max(0, Math.min(targetY, this.maxScroll));
      if (!this.isScrolling) {
        this.isScrolling = true;
        this.lastTime = performance.now();
        this.raf = requestAnimationFrame(t => this.step(t));
      }
    }

    bindAnchorsOnly() {
      // Smooth anchor clicks even when smooth wheel scroll is disabled
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const hash = a.getAttribute('href');
        if (!hash || hash === '#') return;
        const targetEl = document.querySelector(hash);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    bindEvents() {
      this.onWheelBound = this.onWheel.bind(this);
      window.addEventListener('wheel', this.onWheelBound, { passive: false });

      // Synchronize on native scroll events (like drag scrollbar or anchor jumps)
      window.addEventListener('scroll', () => {
        if (!this.isScrolling) {
          this.current = window.scrollY;
          this.target = window.scrollY;
        }
      }, { passive: true });

      // Resize / DOM changes
      window.addEventListener('resize', () => {
        this.updateMaxScroll();
      }, { passive: true });

      // Handle internal anchor clicks smoothly
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const hash = a.getAttribute('href');
        if (!hash || hash === '#') return;
        const targetEl = document.querySelector(hash);
        if (targetEl) {
          e.preventDefault();
          const offsetTop = targetEl.getBoundingClientRect().top + window.scrollY;
          this.scrollTo(offsetTop - 40);
        }
      });
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.onWheelBound) {
        window.removeEventListener('wheel', this.onWheelBound);
      }
    }
  }

  // Auto-mount on DOM ready
  if (typeof document !== 'undefined') {
    const init = () => {
      if (!window.smoothScrollInstance) {
        window.smoothScrollInstance = new SmoothScroll();
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return SmoothScroll;
});
