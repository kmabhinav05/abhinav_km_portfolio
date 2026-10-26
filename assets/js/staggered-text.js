/**
 * Staggered Text - React Bits Pro Component
 * Vanilla JS & Tailwind CSS Engine
 * 
 * Features:
 * - segmentBy: 'chars' | 'words' | 'lines'
 * - delay: stagger delay per segment in milliseconds
 * - duration: animation duration in seconds
 * - direction: 'top' | 'bottom' | 'left' | 'right'
 * - staggerDirection: 'forward' | 'reverse' | 'center'
 * - blur: boolean for smooth motion blur reveal
 * - exitOnScrollOut: boolean to replay on scroll
 * - respectReducedMotion: accessibility support
 * 
 * Docs: https://pro.reactbits.dev/docs/components/staggered-text
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StaggeredText = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class StaggeredText {
    constructor(element, options = {}) {
      this.element = typeof element === 'string' ? document.querySelector(element) : element;
      if (!this.element) return;

      const ds = this.element.dataset;
      this.text = options.text || ds.staggeredText || this.element.textContent.trim();
      this.segmentBy = options.segmentBy || ds.segmentBy || 'chars';
      this.delay = options.delay !== undefined 
        ? Number(options.delay) 
        : (ds.delay ? Number(ds.delay) : (this.segmentBy === 'chars' ? 40 : 80));
      this.duration = options.duration !== undefined 
        ? Number(options.duration) 
        : (ds.duration ? Number(ds.duration) : 0.65);
      this.direction = options.direction || ds.direction || 'top';
      this.staggerDirection = options.staggerDirection || ds.staggerDirection || 'forward';
      this.blur = options.blur !== undefined 
        ? Boolean(options.blur) 
        : (ds.blur !== undefined ? ds.blur === 'true' : true);
      this.respectReducedMotion = options.respectReducedMotion !== undefined 
        ? Boolean(options.respectReducedMotion) 
        : true;
      this.exitOnScrollOut = options.exitOnScrollOut !== undefined 
        ? Boolean(options.exitOnScrollOut) 
        : (ds.exitOnScrollOut === 'true');
      this.threshold = options.threshold !== undefined 
        ? Number(options.threshold) 
        : (ds.threshold ? Number(ds.threshold) : 0.15);
      this.rootMargin = options.rootMargin || ds.rootMargin || '0px 0px -40px 0px';
      this.onAnimationComplete = options.onAnimationComplete;

      this.segments = [];
      this.isAnimated = false;
      this.observer = null;

      this.buildDOM();
      this.bindObserver();
    }

    getDelayForIndex(idx, total) {
      if (this.staggerDirection === 'reverse') {
        return (total - 1 - idx) * this.delay;
      }
      if (this.staggerDirection === 'center') {
        const center = (total - 1) / 2;
        return Math.abs(idx - center) * this.delay;
      }
      // 'forward' default
      return idx * this.delay;
    }

    buildDOM() {
      // Clear container and setup accessibility aria-label
      this.element.setAttribute('aria-label', this.text);
      this.element.innerHTML = '';
      this.element.classList.add('staggered-text-root');

      const words = this.text.split(' ');
      this.segments = [];

      if (this.segmentBy === 'words') {
        words.forEach((wordText, wordIdx) => {
          const wrapper = document.createElement('span');
          wrapper.className = 'staggered-segment-wrapper';
          wrapper.setAttribute('aria-hidden', 'true');

          const segment = document.createElement('span');
          segment.className = 'staggered-segment is-hidden';
          segment.dataset.direction = this.direction;
          if (this.blur) segment.dataset.blur = 'true';
          segment.style.transitionDuration = `${this.duration}s`;
          segment.textContent = wordText;

          wrapper.appendChild(segment);
          this.element.appendChild(wrapper);
          this.segments.push(segment);

          if (wordIdx < words.length - 1) {
            const space = document.createElement('span');
            space.className = 'staggered-space';
            space.setAttribute('aria-hidden', 'true');
            space.textContent = ' ';
            this.element.appendChild(space);
          }
        });
      } else {
        // segmentBy === 'chars'
        words.forEach((wordText, wordIdx) => {
          const wordContainer = document.createElement('span');
          wordContainer.className = 'staggered-word';
          wordContainer.setAttribute('aria-hidden', 'true');

          const chars = Array.from(wordText);
          chars.forEach(char => {
            const wrapper = document.createElement('span');
            wrapper.className = 'staggered-segment-wrapper';

            const segment = document.createElement('span');
            segment.className = 'staggered-segment is-hidden';
            segment.dataset.direction = this.direction;
            if (this.blur) segment.dataset.blur = 'true';
            segment.style.transitionDuration = `${this.duration}s`;
            segment.textContent = char;

            wrapper.appendChild(segment);
            wordContainer.appendChild(wrapper);
            this.segments.push(segment);
          });

          this.element.appendChild(wordContainer);

          if (wordIdx < words.length - 1) {
            const space = document.createElement('span');
            space.className = 'staggered-space';
            space.setAttribute('aria-hidden', 'true');
            space.textContent = ' ';
            this.element.appendChild(space);
          }
        });
      }
    }

    bindObserver() {
      if (typeof IntersectionObserver === 'undefined') {
        this.reveal();
        return;
      }

      this.observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.reveal();
              if (!this.exitOnScrollOut) {
                this.observer.unobserve(this.element);
              }
            } else if (this.exitOnScrollOut && this.isAnimated) {
              this.hide();
            }
          });
        },
        {
          threshold: this.threshold,
          rootMargin: this.rootMargin
        }
      );

      this.observer.observe(this.element);
    }

    reveal() {
      if (this.respectReducedMotion && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        this.segments.forEach(seg => {
          seg.classList.remove('is-hidden');
          seg.classList.add('is-visible');
          seg.style.transitionDelay = '0s';
        });
        this.isAnimated = true;
        if (this.onAnimationComplete) this.onAnimationComplete();
        return;
      }

      const total = this.segments.length;
      let maxDelay = 0;

      this.segments.forEach((seg, idx) => {
        const delayMs = this.getDelayForIndex(idx, total);
        if (delayMs > maxDelay) maxDelay = delayMs;
        seg.style.transitionDelay = `${delayMs}ms`;
      });

      requestAnimationFrame(() => {
        this.segments.forEach(seg => {
          seg.classList.remove('is-hidden');
          seg.classList.add('is-visible');
        });
      });

      const totalTime = maxDelay + this.duration * 1000;
      setTimeout(() => {
        this.isAnimated = true;
        if (this.onAnimationComplete) this.onAnimationComplete();
      }, totalTime);
    }

    hide() {
      this.segments.forEach(seg => {
        seg.style.transitionDelay = '0s';
        seg.classList.remove('is-visible');
        seg.classList.add('is-hidden');
      });
      this.isAnimated = false;
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.element.textContent = this.text;
      this.element.classList.remove('staggered-text-root');
    }

    static initAll(selector = '.staggered-text, [data-staggered-text]') {
      const elements = document.querySelectorAll(selector);
      const instances = [];
      elements.forEach(el => {
        if (!el._staggeredTextInstance) {
          el._staggeredTextInstance = new StaggeredText(el);
          instances.push(el._staggeredTextInstance);
        }
      });
      return instances;
    }
  }

  // Auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => StaggeredText.initAll());
    } else {
      StaggeredText.initAll();
    }
  }

  return StaggeredText;
});
