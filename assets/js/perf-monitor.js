/**
 * Lightweight 60 FPS & Long-Task Performance Monitor HUD
 * Zero-overhead frame audit tool for front-end performance validation.
 * Toggle with Shift+P or via query param ?perf=true
 */
(function() {
  'use strict';
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  let isEnabled = urlParams.get('perf') === 'true' || localStorage.getItem('perf-hud-enabled') === 'true';

  let fpsEl = null;
  let msEl = null;
  let statusEl = null;
  let hudContainer = null;

  let frames = 0;
  let lastTime = performance.now();
  let longTasksCount = 0;
  let rafId = null;

  function createHUD() {
    hudContainer = document.createElement('div');
    hudContainer.id = 'perf-hud-root';
    hudContainer.style.cssText = `
      position: fixed;
      bottom: 14px;
      left: 14px;
      z-index: 99999;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 11px;
      background: rgba(10, 14, 12, 0.88);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      user-select: none;
      pointer-events: auto;
      cursor: pointer;
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;

    hudContainer.title = "Performance Monitor: 60fps Target. Press Shift+P to toggle.";
    hudContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <span id="perf-dot" style="width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
        <span id="perf-fps" style="font-weight: 700; color: #10b981;">60 FPS</span>
      </div>
      <span style="opacity: 0.35;">|</span>
      <span id="perf-ms" style="color: #94a3b8;">16.6ms</span>
      <span style="opacity: 0.35;">|</span>
      <span id="perf-tasks" style="color: #94a3b8;" title="Tasks > 50ms">0 drops</span>
    `;

    document.body.appendChild(hudContainer);

    fpsEl = document.getElementById('perf-fps');
    msEl = document.getElementById('perf-ms');
    statusEl = document.getElementById('perf-dot');
    const tasksEl = document.getElementById('perf-tasks');

    hudContainer.addEventListener('click', () => {
      // Toggle minimized badge view
      hudContainer.style.opacity = hudContainer.style.opacity === '0.2' ? '1' : '0.2';
    });

    // Observe Long Tasks (> 50ms)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              longTasksCount++;
              if (tasksEl) {
                tasksEl.textContent = `${longTasksCount} lag${longTasksCount > 1 ? 's' : ''}`;
                tasksEl.style.color = '#f59e0b';
              }
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {}
    }

    startLoop();
  }

  function startLoop() {
    let lastSecond = performance.now();
    let frameDurations = [];

    function tick(now) {
      frames++;
      const frameDelta = now - lastTime;
      lastTime = now;
      frameDurations.push(frameDelta);

      if (now - lastSecond >= 1000) {
        const fps = Math.round((frames * 1000) / (now - lastSecond));
        const avgFrameMs = (frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length).toFixed(1);

        if (fpsEl) {
          fpsEl.textContent = `${fps} FPS`;
          if (fps >= 57) {
            fpsEl.style.color = '#10b981';
            statusEl.style.background = '#10b981';
          } else if (fps >= 45) {
            fpsEl.style.color = '#f59e0b';
            statusEl.style.background = '#f59e0b';
          } else {
            fpsEl.style.color = '#ef4444';
            statusEl.style.background = '#ef4444';
          }
        }
        if (msEl) {
          msEl.textContent = `${avgFrameMs}ms`;
        }

        frames = 0;
        lastSecond = now;
        frameDurations = [];
      }

      if (isEnabled) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function toggleHUD() {
    isEnabled = !isEnabled;
    try {
      localStorage.setItem('perf-hud-enabled', isEnabled ? 'true' : 'false');
    } catch (e) {}

    if (isEnabled) {
      if (!hudContainer) createHUD();
      else {
        hudContainer.style.display = 'flex';
        lastTime = performance.now();
        startLoop();
      }
    } else {
      if (hudContainer) hudContainer.style.display = 'none';
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Keyboard shortcut: Shift + P (or Shift + F)
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'P' || e.key === 'p' || e.key === 'F' || e.key === 'f')) {
      toggleHUD();
    }
  });

  if (isEnabled) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createHUD);
    } else {
      createHUD();
    }
  }
})();
