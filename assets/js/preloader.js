/**
 * React Bits Pro Preloader Component (Vanilla JS & Tailwind compatible)
 * Docs: https://pro.reactbits.dev/docs/components/preloader
 *
 * Props:
 * - loading: boolean (Default: true)
 * - variant: 'stairs' | 'percentage' | 'curtain' | 'slide' | 'circle' (Default: 'stairs')
 * - duration: number (Default: 1200ms)
 * - stairCount: number (Default: 10)
 * - stairsRevealFrom: 'left' | 'right' | 'center' (Default: 'left')
 * - stairsRevealDirection: 'up' | 'down' (Default: 'up')
 * - loadingText: string (Default: 'Loading your next level experience')
 * - onComplete: () => void
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Preloader = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class Preloader {
    constructor(options = {}) {
      this.options = Object.assign({
        loading: true,
        variant: 'stairs',
        duration: 1200,
        stairCount: window.innerWidth < 640 ? 6 : 10,
        stairsRevealFrom: 'left',
        stairsRevealDirection: 'up',
        loadingText: 'Abhinav K M',
        subtext: 'Data Analyst Portfolio',
        zIndex: 99999,
        onComplete: null
      }, options);

      this.isTransitioning = false;
      this.initDOM();

      if (this.options.loading) {
        this.runInitialLoad();
      }
    }

    initDOM() {
      // Create root container
      let container = document.getElementById('rb-preloader-root');
      if (!container) {
        container = document.createElement('div');
        container.id = 'rb-preloader-root';
        container.className = 'rb-preloader';
        container.setAttribute('aria-hidden', 'true');
        document.body.prepend(container);
      }
      this.container = container;
      this.container.setAttribute('data-reveal-direction', this.options.stairsRevealDirection);

      // Create stairs container
      const stairsWrapper = document.createElement('div');
      stairsWrapper.className = 'rb-preloader__stairs';
      this.stairsWrapper = stairsWrapper;

      this.buildStairs();

      // Create center typographic content
      const content = document.createElement('div');
      content.className = 'rb-preloader__content';
      content.innerHTML = `
        <div class="rb-preloader__badge">
          <span class="rb-preloader__badge-dot"></span>
          <span id="rb-preloader-badge-text">Switching Section</span>
        </div>
        <h2 id="rb-preloader-title" class="rb-preloader__text">${this.options.loadingText}</h2>
        <p id="rb-preloader-subtext" class="rb-preloader__subtext">${this.options.subtext}</p>
      `;
      this.content = content;

      // Progress bar
      const bar = document.createElement('div');
      bar.className = 'rb-preloader__bar';
      const progress = document.createElement('div');
      progress.className = 'rb-preloader__progress';
      bar.appendChild(progress);
      this.progressBar = progress;

      this.container.innerHTML = '';
      this.container.appendChild(stairsWrapper);
      this.container.appendChild(content);
      this.container.appendChild(bar);

      this.titleEl = content.querySelector('#rb-preloader-title');
      this.subtextEl = content.querySelector('#rb-preloader-subtext');
      this.badgeTextEl = content.querySelector('#rb-preloader-badge-text');
    }

    buildStairs() {
      this.stairsWrapper.innerHTML = '';
      const count = this.options.stairCount;
      const from = this.options.stairsRevealFrom;

      for (let i = 0; i < count; i++) {
        const stair = document.createElement('div');
        stair.className = 'rb-preloader__stair';

        // Calculate staggered index based on reveal direction
        let index = i;
        if (from === 'right') {
          index = count - 1 - i;
        } else if (from === 'center') {
          const mid = Math.floor(count / 2);
          index = Math.abs(mid - i);
        }

        stair.style.setProperty('--stair-index', index);
        this.stairsWrapper.appendChild(stair);
      }
    }

    runInitialLoad() {
      this.container.setAttribute('data-active', 'true');
      this.container.setAttribute('data-phase', 'hold');
      if (this.badgeTextEl) this.badgeTextEl.textContent = 'Welcome';

      // Animate progress bar from 0% to 100%
      requestAnimationFrame(() => {
        if (this.progressBar) this.progressBar.style.width = '100%';
      });

      const revealDelay = Math.max(700, this.options.duration - 400);

      setTimeout(() => {
        this.leave(() => {
          if (typeof this.options.onComplete === 'function') {
            this.options.onComplete();
          }
        });
      }, revealDelay);
    }

    /**
     * Smoothly transitions the screen when switching pages or sections
     * @param {Element|string} target Target DOM element or CSS selector
     * @param {Object} opts Options for this transition
     */
    transitionTo(target, opts = {}) {
      if (this.isTransitioning) return;
      this.isTransitioning = true;

      const title = opts.title || (typeof target === 'string' ? target.replace('#', '').toUpperCase() : 'Navigating');
      const sub = opts.subtext || 'Abhinav K M • Data Analyst';
      const badge = opts.badge || 'Switching Screen';

      if (this.titleEl) this.titleEl.textContent = title;
      if (this.subtextEl) this.subtextEl.textContent = sub;
      if (this.badgeTextEl) this.badgeTextEl.textContent = badge;
      if (this.progressBar) this.progressBar.style.width = '0%';

      // 1. Enter phase (stairs wipe down to cover screen)
      this.container.setAttribute('data-active', 'true');
      this.container.setAttribute('data-phase', 'enter');

      setTimeout(() => {
        if (this.progressBar) this.progressBar.style.width = '100%';
      }, 100);

      // Duration for enter stairs to completely cover the screen
      const coverDuration = (this.options.stairCount * 35) + 380;

      setTimeout(() => {
        this.container.setAttribute('data-phase', 'hold');

        // Scroll under the cover
        if (target) {
          const el = typeof target === 'string' ? document.querySelector(target) : target;
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'auto' });
          }
        }

        // Brief hold to give human eye satisfaction, then leave
        setTimeout(() => {
          this.leave(() => {
            this.isTransitioning = false;
            if (typeof opts.onComplete === 'function') {
              opts.onComplete();
            }
          });
        }, 180);
      }, coverDuration);
    }

    leave(callback) {
      this.container.setAttribute('data-phase', 'leave');

      const leaveDuration = (this.options.stairCount * 38) + 480;

      setTimeout(() => {
        this.container.setAttribute('data-active', 'false');
        this.container.removeAttribute('data-phase');
        if (this.progressBar) this.progressBar.style.width = '0%';
        if (typeof callback === 'function') callback();
      }, leaveDuration);
    }
  }

  // Auto-init Preloader on DOMContentLoaded
  function initPreloader() {
    if (window.preloaderInstance) return;

    window.preloaderInstance = new Preloader({
      loading: true,
      variant: 'stairs',
      duration: 1100,
      loadingText: 'Abhinav K M',
      subtext: 'Data Analyst • Portfolio',
      stairsRevealFrom: 'left',
      stairsRevealDirection: 'up'
    });

    // Intercept navigation links for smooth screen switching effect
    const SECTION_TITLES = {
      '#hero': { title: 'Abhinav K M', subtext: 'Data Analyst Trainee • Malappuram', badge: 'Home' },
      '#myskills': { title: 'My Skills', subtext: 'Interactive Skill Folders & Analytics Stack', badge: '01 // Skills' },
      '#projects': { title: 'My Works', subtext: 'Curated Projects & Business Intelligence', badge: '02 // Portfolio' },
      '#profile': { title: 'About Me', subtext: 'BCA Graduate & Analytical Trainee', badge: '03 // Bio' },
      '#experience': { title: 'Experience', subtext: 'Professional Trajectory & Education', badge: '04 // Journey' },
      '#contact': { title: 'Where to find me', subtext: 'Contact & Collaboration', badge: '05 // Reach Out' }
    };

    document.addEventListener('click', e => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute('href');
      if (hash && hash.length > 1 && SECTION_TITLES[hash]) {
        e.preventDefault();
        const info = SECTION_TITLES[hash];
        window.preloaderInstance.transitionTo(hash, {
          title: info.title,
          subtext: info.subtext,
          badge: info.badge
        });
      }
    }, true); // Capture phase so it triggers reliably
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPreloader);
    } else {
      initPreloader();
    }
  }

  return Preloader;
});
