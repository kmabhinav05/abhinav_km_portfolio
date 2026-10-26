/**
 * Gyroscope Cursor - React Bits Pro Component
 * Dynamic Directional Arrow with Gyroscopic Spring Physics
 * 
 * Props:
 * - color: string (Default: "#00d1ff")
 * - outlineColor: string (Default: "#00fff4")
 * - size: number (Default: 24)
 * - outlineWidth: number (Default: 3)
 * - shadow: number (Default: 0.5)
 * - turn: number (Default: 1)
 * - turnSpeed: number (Default: 1)
 * - overshoot: number (Default: 0.4)
 * - stretch: number (Default: 0.4)
 * - settle: number (Default: 0.45)
 * - restAngle: number (Default: -45)
 * - ripple: boolean (Default: true)
 * 
 * Docs: https://pro.reactbits.dev/docs/components/gyroscope-cursor
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GyroscopeCursor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Normalize angle to [-180, 180]
  function normalizeAngle(deg) {
    let a = deg % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return a;
  }

  function shortestAngleDiff(target, current) {
    let diff = (target - current) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  }

  class GyroscopeCursor {
    constructor(options = {}) {
      // Touch/mobile detection: skip custom cursor
      if (typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches) {
        return;
      }

      this.color = options.color || '#00d1ff';
      this.outlineColor = options.outlineColor || '#00fff4';
      this.size = options.size !== undefined ? Number(options.size) : 24;
      this.outlineWidth = options.outlineWidth !== undefined ? Number(options.outlineWidth) : 3;
      this.shadow = options.shadow !== undefined ? Number(options.shadow) : 0.5;
      this.turn = options.turn !== undefined ? Number(options.turn) : 1;
      this.turnSpeed = options.turnSpeed !== undefined ? Number(options.turnSpeed) : 1;
      this.overshoot = options.overshoot !== undefined ? Number(options.overshoot) : 0.4;
      this.stretch = options.stretch !== undefined ? Number(options.stretch) : 0.4;
      this.settle = options.settle !== undefined ? Number(options.settle) : 0.45;
      this.restAngle = options.restAngle !== undefined ? Number(options.restAngle) : -45;
      this.ripple = options.ripple !== undefined ? Boolean(options.ripple) : true;

      // Position state
      this.pos = { x: -100, y: -100 };
      this.targetPos = { x: -100, y: -100 };
      this.lastPos = { x: -100, y: -100 };

      // Physics state
      this.currentAngle = this.restAngle;
      this.targetAngle = this.restAngle;
      this.angleVelocity = 0;
      this.speed = 0;
      this.lastMoveTime = performance.now();
      this.isMoving = false;
      this.isHovering = false;
      this.isPressed = false;
      this.hasPointerMoved = false;

      this.buildDOM();
      this.bindEvents();
      this.startLoop();
    }

    buildDOM() {
      // Remove any existing cursor element if re-instantiated
      const existing = document.getElementById('gyroscope-cursor');
      if (existing) existing.remove();

      const container = document.createElement('div');
      container.id = 'gyroscope-cursor';
      container.className = 'gyroscope-cursor';
      container.style.setProperty('--gc-color', this.color);
      container.style.setProperty('--gc-outline', this.outlineColor);

      const wrapper = document.createElement('div');
      wrapper.className = 'gyroscope-cursor__wrapper';

      const s = this.size;
      const w = s * 0.4;
      const notch = s * 0.72;

      // Arrowhead vector pointing along positive X axis with tip at (0, 0)
      const pathData = `M 0,0 L -${s},-${w} C -${s * 0.85},-${w * 0.4} -${notch},-${w * 0.1} -${notch},0 C -${notch},${w * 0.1} -${s * 0.85},${w * 0.4} -${s},${w} Z`;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'gyroscope-cursor__svg');
      svg.setAttribute('width', String(s * 2));
      svg.setAttribute('height', String(s * 2));
      svg.setAttribute('viewBox', `-${s * 1.5} -${s} ${s * 2} ${s * 2}`);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'gyroscope-cursor__arrow');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', this.color);
      path.setAttribute('stroke', this.outlineColor);
      path.setAttribute('stroke-width', String(this.outlineWidth));
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-linecap', 'round');

      svg.appendChild(path);
      wrapper.appendChild(svg);
      container.appendChild(wrapper);
      document.body.appendChild(container);

      this.container = container;
      this.wrapper = wrapper;
      this.svg = svg;
    }

    bindEvents() {
      this.onMouseMove = (e) => {
        if (!this.hasPointerMoved) {
          this.hasPointerMoved = true;
          this.pos.x = e.clientX;
          this.pos.y = e.clientY;
          this.lastPos.x = e.clientX;
          this.lastPos.y = e.clientY;
          this.container.classList.add('is-ready');
        }
        this.targetPos.x = e.clientX;
        this.targetPos.y = e.clientY;
        this.lastMoveTime = performance.now();
      };

      this.onMouseDown = (e) => {
        this.isPressed = true;
        this.container.classList.add('is-pressed');
        if (this.ripple) {
          this.spawnRipple(e.clientX, e.clientY);
        }
      };

      this.onMouseUp = () => {
        this.isPressed = false;
        this.container.classList.remove('is-pressed');
      };

      this.onMouseOver = (e) => {
        const target = e.target;
        if (!target) return;
        const isInteractive = target.closest(
          'a, button, input, textarea, select, [role="button"], .folder-float, .folder-float__trigger, .bento-card, .process-step-card, .hover-trigger'
        );
        if (isInteractive) {
          this.isHovering = true;
          this.container.classList.add('is-hovering');
        }
      };

      this.onMouseOut = (e) => {
        const target = e.target;
        if (!target) return;
        const isInteractive = target.closest(
          'a, button, input, textarea, select, [role="button"], .folder-float, .folder-float__trigger, .bento-card, .process-step-card, .hover-trigger'
        );
        if (isInteractive) {
          this.isHovering = false;
          this.container.classList.remove('is-hovering');
        }
      };

      this.onMouseLeave = () => {
        this.container.classList.remove('is-ready');
      };

      this.onMouseEnter = () => {
        if (this.hasPointerMoved) {
          this.container.classList.add('is-ready');
        }
      };

      window.addEventListener('mousemove', this.onMouseMove, { passive: true });
      window.addEventListener('mousedown', this.onMouseDown, { passive: true });
      window.addEventListener('mouseup', this.onMouseUp, { passive: true });
      document.addEventListener('mouseover', this.onMouseOver, { passive: true });
      document.addEventListener('mouseout', this.onMouseOut, { passive: true });
      document.documentElement.addEventListener('mouseleave', this.onMouseLeave, { passive: true });
      document.documentElement.addEventListener('mouseenter', this.onMouseEnter, { passive: true });
    }

    spawnRipple(x, y) {
      const ripple = document.createElement('div');
      ripple.className = 'gyroscope-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = `${this.size * 2.2}px`;
      ripple.style.height = `${this.size * 2.2}px`;
      document.body.appendChild(ripple);

      setTimeout(() => {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      }, 480);
    }

    startLoop() {
      let lastTime = performance.now();

      const loop = (now) => {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        if (this.hasPointerMoved) {
          // Responsive pointer tracking (95% immediate for zero input lag)
          this.pos.x += (this.targetPos.x - this.pos.x) * 0.95;
          this.pos.y += (this.targetPos.y - this.pos.y) * 0.95;

          const dx = this.targetPos.x - this.lastPos.x;
          const dy = this.targetPos.y - this.lastPos.y;
          this.speed = Math.sqrt(dx * dx + dy * dy);

          this.lastPos.x = this.targetPos.x;
          this.lastPos.y = this.targetPos.y;

          const timeSinceMove = now - this.lastMoveTime;

          if (this.speed > 1.2 && this.turn > 0) {
            // Moving: target direction is the vector of travel
            const moveAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            // Blend between restAngle and moveAngle based on turn prop
            this.targetAngle = moveAngle * this.turn + this.restAngle * (1 - this.turn);
            this.isMoving = true;
          } else if (timeSinceMove > 140) {
            // Idle: spring back to restAngle (-45 degrees)
            this.targetAngle = this.restAngle;
            this.isMoving = false;
          }

          // Gyroscopic angular spring physics with overshoot
          const angleDiff = shortestAngleDiff(this.targetAngle, this.currentAngle);
          const stiffness = 220 * this.turnSpeed;
          const damping = 22 * (1.1 - this.overshoot * 0.5);

          const springAcc = angleDiff * stiffness - this.angleVelocity * damping;
          this.angleVelocity += springAcc * dt;
          this.currentAngle += this.angleVelocity * dt;
          this.currentAngle = normalizeAngle(this.currentAngle);

          // Squash and stretch along direction of travel
          const stretchFactor = this.isMoving
            ? Math.min(this.speed * 0.012 * this.stretch, 0.45)
            : 0;
          const scaleX = 1.0 + stretchFactor;
          const scaleY = 1.0 / (1.0 + stretchFactor * 0.5);

          // Render: translate outer container directly to mouse tip
          this.container.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;

          // Rotate and stretch inner wrapper around tip (0, 0)
          this.wrapper.style.transform = `rotate(${this.currentAngle.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
        }

        this.animId = requestAnimationFrame(loop);
      };

      this.animId = requestAnimationFrame(loop);
    }

    destroy() {
      if (this.animId) cancelAnimationFrame(this.animId);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mouseup', this.onMouseUp);
      document.removeEventListener('mouseover', this.onMouseOver);
      document.removeEventListener('mouseout', this.onMouseOut);
      document.documentElement.removeEventListener('mouseleave', this.onMouseLeave);
      document.documentElement.removeEventListener('mouseenter', this.onMouseEnter);
      if (this.container) this.container.remove();
    }
  }

  // Auto-init with React Bits exact configuration: color="#00d1ff", outlineColor="#00fff4"
  if (typeof document !== 'undefined') {
    const init = () => {
      if (!window.__gyroscopeCursorInstance) {
        window.__gyroscopeCursorInstance = new GyroscopeCursor({
          color: '#00d1ff',
          outlineColor: '#00fff4',
          size: 24,
          outlineWidth: 3,
          turn: 1,
          turnSpeed: 1,
          overshoot: 0.4,
          stretch: 0.4,
          ripple: true
        });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return GyroscopeCursor;
});
