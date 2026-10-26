/**
 * React Bits FolderFloat Vanilla JS Implementation with Matter.js Physics
 * Recreates the zero-gravity interactive floating folder component
 */
(function() {
  'use strict';

  const PAD = 28;
  const CHAR = 6.8;
  const GAP = 12;
  const ROW = 52;
  const DRAG_MIN = 4;
  const ZONE_PAD = 8;

  const jitter = i => {
    const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
    return x - Math.floor(x);
  };

  const layout = (list, spread, lift, tilt, sizes) => {
    const rows = [];
    let row = [];
    let width = 0;
    list.forEach((item, i) => {
      const pw = sizes[i]?.w ?? PAD + item.label.length * CHAR;
      if (row.length && width + GAP + pw > spread * 2) {
        rows.push({ items: row, width });
        row = [];
        width = 0;
      }
      row.push({ i, pw });
      width += (row.length > 1 ? GAP : 0) + pw;
    });
    if (row.length) rows.push({ items: row, width });
    const pos = [];
    rows.forEach((r, ri) => {
      let x = -r.width / 2;
      const shift = (ri % 2 ? 1 : -1) * Math.min(16, spread * 0.1);
      r.items.forEach(({ i, pw }) => {
        const j = jitter(i);
        pos[i] = {
          x: x + pw / 2 + shift + (j - 0.5) * 6,
          y: -lift - ri * ROW - j * 6,
          r: tilt * (j * 2 - 1)
        };
        x += pw + GAP;
      });
    });
    return pos;
  };

  // Skill definitions for the 4 interactive folders
  const SKILLS_DATA = {
    excel: {
      label: 'Microsoft Excel',
      sublabel: '6 analytical tools',
      items: [
        'Advanced Excel',
        'Pivot Tables',
        'VLOOKUP / XLOOKUP',
        'Power Query',
        'DAX Measures',
        'Charts & Slicers'
      ]
    },
    sql: {
      label: 'SQL Databases',
      sublabel: '6 query capabilities',
      items: [
        'PostgreSQL',
        'MySQL',
        'Multi-table Joins',
        'CTEs & Subqueries',
        'Window Functions',
        'Data Aggregations'
      ]
    },
    python: {
      label: 'Python Stack',
      sublabel: '5 analytics libraries',
      items: [
        'Pandas',
        'NumPy',
        'Matplotlib',
        'Seaborn',
        'Exploratory Data Analysis'
      ]
    },
    powerbi: {
      label: 'Power BI & BI',
      sublabel: '5 dashboard methods',
      items: [
        'Data Modeling',
        'DAX Measures',
        'Interactive Dashboards',
        'KPI Scorecards',
        'Star Schema'
      ]
    }
  };

  // Registry of all active folders for exclusive accordion opening
  const allFolders = [];

  function initFolder(folderEl) {
    const folderId = folderEl.getAttribute('data-folder-id');
    const config = SKILLS_DATA[folderId];
    if (!config) return;

    const items = config.items.map(item => (typeof item === 'string' ? { label: item, value: item } : item));
    const n = items.length;
    const itemsContainer = folderEl.querySelector('.folder-float__items');
    const triggerBtn = folderEl.querySelector('.folder-float__trigger');
    if (!itemsContainer) return;

    const spread = parseFloat(getComputedStyle(folderEl).getPropertyValue('--ff-spread')) || 180;
    const lift = parseFloat(getComputedStyle(folderEl).getPropertyValue('--ff-lift')) || 28;
    const tilt = 8;
    const openDuration = parseFloat(getComputedStyle(folderEl).getPropertyValue('--ff-open')) || 520;
    const stagger = parseFloat(getComputedStyle(folderEl).getPropertyValue('--ff-stagger')) || 45;
    const drift = 0.5;

    let sizes = items.map(() => ({ w: 120, h: 36 }));
    let pos = layout(items, spread, lift, tilt, sizes);
    let isOpen = false;
    let liveTimer = null;
    let popTimer = null;
    let isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Matter.js physics state
    const world = {
      engine: null,
      bodies: [],
      sizes: [],
      raf: 0,
      last: 0,
      t0: 0,
      drag: null,
      zone: null,
      live: false
    };

    // Render pills into container
    itemsContainer.innerHTML = '';
    const pillEls = [];

    items.forEach((item, i) => {
      const p = pos[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'folder-float__item';
      btn.tabIndex = -1;
      btn.setAttribute('aria-hidden', 'true');
      btn.style.setProperty('--i', i);
      btn.style.setProperty('--x', `${p.x.toFixed(1)}px`);
      btn.style.setProperty('--y', `${p.y.toFixed(1)}px`);
      btn.style.setProperty('--r', `${p.r.toFixed(2)}deg`);

      const driftSpan = document.createElement('span');
      driftSpan.className = 'folder-float__drift';
      driftSpan.textContent = item.label;
      btn.appendChild(driftSpan);

      // Pointer event handlers for physics dragging
      btn.addEventListener('pointerdown', e => onPointerDown(e, i));
      btn.addEventListener('pointermove', e => onPointerMove(e, i));
      btn.addEventListener('pointerup', e => onPointerUp(e, i, item));
      btn.addEventListener('pointercancel', e => onPointerUp(e, i, item));
      btn.addEventListener('click', e => {
        if (!world.live || e.detail === 0) pickItem(item, i, btn);
      });

      itemsContainer.appendChild(btn);
      pillEls.push(btn);
    });

    // Measure exact rendered sizes after font loading
    const measure = () => {
      sizes = pillEls.map(el => ({ w: el.offsetWidth || 120, h: el.offsetHeight || 36 }));
      pos = layout(items, spread, lift, tilt, sizes);
      pillEls.forEach((el, i) => {
        if (!world.live) {
          el.style.setProperty('--x', `${pos[i].x.toFixed(1)}px`);
          el.style.setProperty('--y', `${pos[i].y.toFixed(1)}px`);
          el.style.setProperty('--r', `${pos[i].r.toFixed(2)}deg`);
        }
      });
    };

    requestAnimationFrame(measure);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }

    function pointerAt(e) {
      const r = itemsContainer.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function pickItem(item, i, el) {
      clearTimeout(popTimer);
      pillEls.forEach(p => p.removeAttribute('data-pop'));
      el.setAttribute('data-pop', '');
      popTimer = setTimeout(() => {
        el.removeAttribute('data-pop');
      }, 320);
    }

    function onPointerDown(e, i) {
      if (!world.live || e.button !== 0) return;
      const b = world.bodies[i];
      if (!b) return;
      const p = pointerAt(e);
      world.drag = {
        i,
        id: e.pointerId,
        dx: b.position.x - p.x,
        dy: b.position.y - p.y,
        sx: e.clientX,
        sy: e.clientY,
        moved: false
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    function onPointerMove(e, i) {
      const d = world.drag;
      if (!d || d.i !== i || d.id !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) >= DRAG_MIN) {
        d.moved = true;
        e.currentTarget.setAttribute('data-drag', '');
      }
      if (!d.moved) return;

      const Matter = window.Matter;
      if (!Matter) return;

      const b = world.bodies[i];
      const { w: bw, h: bh } = world.sizes[i];
      const z = world.zone;
      const p = pointerAt(e);
      const x = Math.min(z.right - bw / 2, Math.max(z.left + bw / 2, p.x + d.dx));
      const y = Math.min(z.bottom - bh / 2, Math.max(z.top + bh / 2, p.y + d.dy));
      Matter.Body.setVelocity(b, { x: (x - b.position.x) * 0.6, y: (y - b.position.y) * 0.6 });
      Matter.Body.setPosition(b, { x, y });
    }

    function onPointerUp(e, i, item) {
      const d = world.drag;
      if (!d || d.i !== i || d.id !== e.pointerId) return;
      world.drag = null;
      e.currentTarget.removeAttribute('data-drag');
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (!d.moved && e.type === 'pointerup') {
        pickItem(item, i, e.currentTarget);
      }
    }

    function stopPhysics() {
      clearTimeout(liveTimer);
      cancelAnimationFrame(world.raf);
      world.raf = 0;

      const Matter = window.Matter;
      if (world.engine && Matter) {
        world.bodies.forEach((b, i) => {
          const el = pillEls[i];
          if (!el) return;
          el.style.setProperty('--x', `${b.position.x.toFixed(1)}px`);
          el.style.setProperty('--y', `${(b.position.y - world.sizes[i].h / 2).toFixed(1)}px`);
        });
        Matter.Composite.clear(world.engine.world, false, true);
        Matter.Engine.clear(world.engine);
        world.engine = null;
      }
      world.bodies = [];
      world.drag = null;
      world.live = false;
      folderEl.removeAttribute('data-live');
    }

    function startPhysics() {
      if (world.engine) return;
      const Matter = window.Matter;
      if (!Matter) return;
      const { Bodies, Body, Composite, Engine } = Matter;

      measure();
      const engine = Engine.create({ gravity: { x: 0, y: 0 } });
      engine.enableSleeping = false;
      world.engine = engine;
      world.sizes = pillEls.map(el => ({ w: el.offsetWidth || 120, h: el.offsetHeight || 36 }));

      const ys = pos.map(p => p.y);
      const zone = {
        left: -spread - ZONE_PAD,
        right: spread + ZONE_PAD,
        top: Math.min(...ys) - ZONE_PAD,
        bottom: -lift + Math.max(...world.sizes.map(s => s.h))
      };
      world.zone = zone;

      world.bodies = pillEls.map((el, i) => {
        const { w: bw, h: bh } = world.sizes[i];
        const b = Bodies.rectangle(pos[i].x, pos[i].y + bh / 2, bw, bh, {
          chamfer: { radius: Math.min(bh / 2 - 1, 16) },
          restitution: 0.55,
          friction: 0,
          frictionAir: 0.08,
          inertia: Infinity
        });
        b.plugin = { phase: jitter(i) * Math.PI * 2 };
        return b;
      });

      const T = 80;
      const walls = [
        Bodies.rectangle((zone.left + zone.right) / 2, zone.top - T / 2, zone.right - zone.left + 2 * T, T, {
          isStatic: true
        }),
        Bodies.rectangle((zone.left + zone.right) / 2, zone.bottom + T / 2, zone.right - zone.left + 2 * T, T, {
          isStatic: true
        }),
        Bodies.rectangle(zone.left - T / 2, (zone.top + zone.bottom) / 2, T, zone.bottom - zone.top + 2 * T, {
          isStatic: true
        }),
        Bodies.rectangle(zone.right + T / 2, (zone.top + zone.bottom) / 2, T, zone.bottom - zone.top + 2 * T, {
          isStatic: true
        })
      ];

      Composite.add(engine.world, [...world.bodies, ...walls]);
      world.live = true;
      world.last = 0;
      world.t0 = performance.now();
      folderEl.setAttribute('data-live', '');

      function tick(now) {
        if (!world.engine) return;
        const dt = world.last ? Math.min(32, now - world.last) : 16;
        world.last = now;
        const t = (now - world.t0) / 1000;
        const k = drift * 0.00005 * Math.min(1, t / 2);

        world.bodies.forEach((b, i) => {
          if (world.drag && world.drag.i === i) return;
          const ph = b.plugin.phase;
          Body.applyForce(b, b.position, {
            x: Math.sin(t * 0.9 + ph) * k * b.mass,
            y: Math.cos(t * 1.3 + ph * 1.7) * k * b.mass
          });
        });

        Engine.update(world.engine, dt);
        world.bodies.forEach((b, i) => {
          const el = pillEls[i];
          if (!el) return;
          el.style.setProperty('--x', `${b.position.x.toFixed(1)}px`);
          el.style.setProperty('--y', `${(b.position.y - world.sizes[i].h / 2).toFixed(1)}px`);
        });

        world.raf = requestAnimationFrame(tick);
      }

      world.raf = requestAnimationFrame(tick);
    }

    function setOpen(open) {
      if (isOpen === open) return;
      isOpen = open;

      if (isOpen) {
        // Automatically close all other open skill folders (accordion behavior)
        allFolders.forEach(other => {
          if (other.el !== folderEl && other.isOpen()) {
            other.setOpen(false);
          }
        });

        folderEl.setAttribute('data-open', '');
        pillEls.forEach(el => {
          el.tabIndex = 0;
          el.removeAttribute('aria-hidden');
        });
        if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'true');

        clearTimeout(liveTimer);
        if (!isReducedMotion) {
          liveTimer = setTimeout(startPhysics, openDuration + (n - 1) * stagger + 80);
        }
      } else {
        folderEl.removeAttribute('data-open');
        pillEls.forEach(el => {
          el.tabIndex = -1;
          el.setAttribute('aria-hidden', 'true');
        });
        if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
        stopPhysics();
      }
    }

    // Hover trigger logic
    folderEl.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse') {
        setOpen(true);
      }
    });

    folderEl.addEventListener('pointerleave', e => {
      if (e.pointerType === 'mouse' && !world.drag) {
        setOpen(false);
      }
    });

    // Click trigger on flap/button
    if (triggerBtn) {
      triggerBtn.addEventListener('click', e => {
        e.preventDefault();
        setOpen(!isOpen);
      });
    }

    // Keyboard support
    folderEl.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation();
        setOpen(false);
      }
    });

    // Register folder controller
    allFolders.push({
      el: folderEl,
      setOpen: val => setOpen(val),
      isOpen: () => isOpen
    });
  }

  // Close any open folder when tapping outside any skill folder
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest('.folder-float')) {
        allFolders.forEach(f => {
          if (f.isOpen()) f.setOpen(false);
        });
      }
    });
  }

  // Initialize all FolderFloat components when DOM is ready
  function initAllFolders() {
    const folders = document.querySelectorAll('.folder-float');
    folders.forEach(initFolder);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAllFolders);
    } else {
      initAllFolders();
    }
  }
})();
