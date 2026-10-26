/**
 * Main Interactive Logic for Abhinav K M - Data Analyst Portfolio
 * Unique Visual Theme: "From Raw Data -> Insight"
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileMenu();
  initActiveNavObserver();
  initHeroCanvas();
  initDataProcessFlow();
  initSkillsInteractivity();
  initProjectModal();
  initContactForm();
  initCVDownload();
  initScrollAnimations();
});

/* -------------------------------------------------------------------------- */
/* 0. Dark Mode / Light Mode Theme Switcher                                   */
/* -------------------------------------------------------------------------- */
function initThemeToggle() {
  const themeBtns = document.querySelectorAll('.theme-toggle-btn');
  
  const savedTheme = localStorage.getItem('portfolio-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  updateToggleIcons();

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('portfolio-theme', isDark ? 'dark' : 'light');
      updateToggleIcons();
    });
  });

  function updateToggleIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    themeBtns.forEach(btn => {
      const sunIcon = btn.querySelector('.sun-icon');
      const moonIcon = btn.querySelector('.moon-icon');
      if (sunIcon && moonIcon) {
        if (isDark) {
          sunIcon.classList.remove('hidden');
          moonIcon.classList.add('hidden');
        } else {
          sunIcon.classList.add('hidden');
          moonIcon.classList.remove('hidden');
        }
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* 1. Mobile Menu Toggle                                                      */
/* -------------------------------------------------------------------------- */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (!menuBtn || !mobileMenu) return;

  menuBtn.addEventListener('click', () => {
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', !isExpanded);
    mobileMenu.classList.toggle('hidden');
    
    // Toggle hamburger icon animation
    const iconPath = menuBtn.querySelector('svg path');
    if (!isExpanded) {
      iconPath.setAttribute('d', 'M6 18L18 6M6 6l12 12'); // X icon
    } else {
      iconPath.setAttribute('d', 'M4 6h16M4 12h16M4 18h16'); // Hamburger icon
    }
  });

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
      const iconPath = menuBtn.querySelector('svg path');
      if (iconPath) {
        iconPath.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
      }
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Active Section Scroll Highlighting                                     */
/* -------------------------------------------------------------------------- */
function initActiveNavObserver() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const header = document.querySelector('header');

  if (!sections.length || !navLinks.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -50% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        
        // Automatic dark section background detection for header
        if (id === 'contact') {
          if (header) header.classList.add('header-dark-mode');
        } else {
          if (header && !document.documentElement.classList.contains('dark')) {
            header.classList.remove('header-dark-mode');
          }
        }

        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));
}

/* -------------------------------------------------------------------------- */
/* 3. Hero Interactive Abstract Data Network Canvas                           */
/* -------------------------------------------------------------------------- */
function initHeroCanvas() {
  const canvas = document.getElementById('hero-data-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animationFrameId;
  let width, height;

  function resize() {
    const container = canvas.parentElement;
    width = canvas.width = container.clientWidth;
    height = canvas.height = Math.max(380, container.clientHeight);
  }

  window.addEventListener('resize', resize);
  resize();

  // Nodes representing analytical data pipeline
  const nodes = [
    { x: 0.15, y: 0.25, label: 'RAW_EXCEL', type: 'source', value: '4.8k rows' },
    { x: 0.20, y: 0.70, label: 'MYSQL_DB', type: 'source', value: 'Attendance' },
    { x: 0.50, y: 0.35, label: 'ETL_PROCESS', type: 'transform', value: 'SQL / Pandas' },
    { x: 0.50, y: 0.75, label: 'MODELING', type: 'transform', value: 'DAX Engine' },
    { x: 0.82, y: 0.25, label: 'PROGRESS_CARDS', type: 'output', value: 'Automated' },
    { x: 0.82, y: 0.70, label: 'KPI_DASHBOARD', type: 'output', value: 'Insights' }
  ];

  // Particle streams moving along connections
  const connections = [
    { from: 0, to: 2 },
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 3, to: 5 }
  ];

  const particles = [];
  for (let i = 0; i < 14; i++) {
    const conn = connections[i % connections.length];
    particles.push({
      connIndex: i % connections.length,
      progress: Math.random(),
      speed: 0.003 + Math.random() * 0.004
    });
  }

  // Code snippets drifting in background
  const snippets = [
    'SELECT student_id, AVG(marks) FROM internal_assessment GROUP BY student_id;',
    'df.fillna(df.mean(), inplace=True)',
    'DAX: Score_Rank = RANKX(ALL(Students), [AvgMark])',
    'INDEX(Match(Lookup_Val, Range, 0))'
  ];
  let snippetIndex = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw grid background subtle lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.06)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw connection lines
    connections.forEach(conn => {
      const startNode = nodes[conn.from];
      const endNode = nodes[conn.to];
      const x1 = startNode.x * width;
      const y1 = startNode.y * height;
      const x2 = endNode.x * width;
      const y2 = endNode.y * height;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw animated moving particles (Data packets)
    particles.forEach(p => {
      p.progress += p.speed;
      if (p.progress >= 1) p.progress = 0;

      const conn = connections[p.connIndex];
      const startNode = nodes[conn.from];
      const endNode = nodes[conn.to];

      const px = (startNode.x + (endNode.x - startNode.x) * p.progress) * width;
      const py = (startNode.y + (endNode.y - startNode.y) * p.progress) * height;

      // Glow pulse
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#14B8A6'; // Electric Teal
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 184, 166, 0.25)';
      ctx.fill();
    });

    // Draw nodes
    nodes.forEach(node => {
      const nx = node.x * width;
      const ny = node.y * height;

      // Outer ring
      ctx.beginPath();
      ctx.arc(nx, ny, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#0B1220';
      ctx.fill();
      ctx.strokeStyle = node.type === 'transform' ? '#14B8A6' : (node.type === 'output' ? '#A3E635' : '#334155');
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(nx, ny, 5, 0, Math.PI * 2);
      ctx.fillStyle = node.type === 'transform' ? '#14B8A6' : (node.type === 'output' ? '#A3E635' : '#94A3B8');
      ctx.fill();

      // Label background card
      ctx.font = '10px "IBM Plex Mono", monospace';
      const labelText = node.label;
      const valText = node.value;
      const textWidth = Math.max(ctx.measureText(labelText).width, ctx.measureText(valText).width) + 12;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(nx - textWidth / 2, ny + 22, textWidth, 28, 4);
      ctx.fill();
      ctx.stroke();

      // Text inside badge
      ctx.fillStyle = '#0B1220';
      ctx.textAlign = 'center';
      ctx.fillText(labelText, nx, ny + 34);

      ctx.fillStyle = '#14B8A6';
      ctx.font = '9px "IBM Plex Mono", monospace';
      ctx.fillText(valText, nx, ny + 45);
    });

    // Draw subtle mini chart overlay at bottom right
    const chartX = width * 0.72;
    const chartY = height * 0.82;
    const barWidths = [18, 32, 25, 45, 38];
    ctx.fillStyle = 'rgba(20, 184, 166, 0.15)';
    barWidths.forEach((bw, idx) => {
      ctx.fillRect(chartX + idx * 10, chartY - bw, 6, bw);
    });

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();
}

/* -------------------------------------------------------------------------- */
/* 4. "How I Work With Data" Process Flow Section                             */
/* -------------------------------------------------------------------------- */
const dataStepsData = [
  {
    step: '01',
    title: 'Collect',
    sub: 'Gathering Raw Sources',
    desc: 'Extracting data from structured databases (MySQL), Excel spreadsheets, CSVs, and API feeds while maintaining schema integrity.',
    tags: ['MySQL', 'Excel Sheets', 'Raw CSVs', 'Data Sources'],
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21 3.582 4 8 4s8-1.79 8-4'
  },
  {
    step: '02',
    title: 'Clean',
    sub: 'Wrangling & Validation',
    desc: 'Handling missing values, deduplication, standardizing data types, filtering anomalies, and verifying source-to-target integrity.',
    tags: ['Power Query', 'Python Pandas', 'SQL Filtering', 'Data Wrangling'],
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.605 15.13a2 2 0 00-1.783.57l-1.53 1.53a1 1 0 000 1.414l3.182 3.182a1 1 0 001.414 0l1.53-1.53a2 2 0 00.57-1.783l-.477-2.387a6 6 0 01.517-3.86l.158-.318a6 6 0 00.517-3.86L9.58 6.173a2 2 0 00-.547-1.022L7.6 3.72a1 1 0 00-1.414 0L3 6.906'
  },
  {
    step: '03',
    title: 'Analyze',
    sub: 'Exploratory & Modeling',
    desc: 'Executing SQL aggregations, window functions, CTEs, and Python analytical models to detect patterns, trends, and key metrics.',
    tags: ['SQL Joins/CTEs', 'Exploratory Data Analysis', 'Python NumPy', 'DAX Measures'],
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
  {
    step: '04',
    title: 'Visualize',
    sub: 'Dashboards & Reports',
    desc: 'Designing intuitive Power BI dashboards, dynamic Excel reports, Seaborn/Plotly charts focused on clarity and executive readability.',
    tags: ['Power BI Dashboards', 'Excel Pivot Charts', 'Matplotlib / Seaborn', 'Data Storytelling'],
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
  },
  {
    step: '05',
    title: 'Generate Insights',
    sub: 'Actionable Business Value',
    desc: 'Translating complex numerical outputs into actionable recommendations, performance improvement tips, and decision support.',
    tags: ['Performance Optimization', 'Automated Progress Cards', 'KPI Tracking', 'Decision Support'],
    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
  }
];

function initDataProcessFlow() {
  const container = document.getElementById('process-flow-container');
  if (!container) return;

  let activeIndex = 0;

  function renderSteps() {
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
        ${dataStepsData.map((s, idx) => `
          <div 
            class="process-step-card cursor-pointer p-5 rounded-xl border transition-all duration-300 ${
              idx === activeIndex 
                ? 'bg-midnight text-white border-teal-500 shadow-xl scale-[1.02]' 
                : 'bg-white text-slate-800 border-slate-200 hover:border-teal-300 hover:bg-slate-50'
            }"
            onclick="selectProcessStep(${idx})"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="font-mono text-xs font-bold px-2 py-1 rounded ${
                idx === activeIndex ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-slate-100 text-slate-600'
              }">
                STEP ${s.step}
              </span>
              <svg class="w-5 h-5 ${idx === activeIndex ? 'text-lime-400' : 'text-teal-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${s.icon}"></path>
              </svg>
            </div>
            <h4 class="font-heading font-bold text-lg mb-1 ${idx === activeIndex ? 'text-white' : 'text-midnight'}">
              ${s.title}
            </h4>
            <p class="text-xs font-mono mb-3 ${idx === activeIndex ? 'text-teal-400' : 'text-slate-500'}">
              ${s.sub}
            </p>
            <div class="w-full h-1 rounded-full ${idx === activeIndex ? 'bg-gradient-to-r from-teal-500 to-lime-400' : 'bg-slate-100'}"></div>
          </div>
        `).join('')}
      </div>

      <!-- Active Step Detail Panel -->
      <div class="mt-6 p-6 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="space-y-2 max-w-2xl">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs text-teal-600 font-semibold uppercase tracking-wider">Phase Detail</span>
            <span class="text-slate-300">•</span>
            <span class="font-heading font-bold text-midnight text-xl">${dataStepsData[activeIndex].title}</span>
          </div>
          <p class="text-slate-600 text-sm leading-relaxed">
            ${dataStepsData[activeIndex].desc}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${dataStepsData[activeIndex].tags.map(t => `
            <span class="font-mono text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
              # ${t}
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  window.selectProcessStep = function(idx) {
    activeIndex = idx;
    renderSteps();
  };

  renderSteps();
}

/* -------------------------------------------------------------------------- */
/* 5. Skills Section Categorization & Tags                                     */
/* -------------------------------------------------------------------------- */
function initSkillsInteractivity() {
  const skillCards = document.querySelectorAll('.skill-tag');
  skillCards.forEach(tag => {
    tag.addEventListener('mouseenter', () => {
      tag.classList.add('border-teal-500', 'bg-teal-50/50', 'text-midnight');
    });
    tag.addEventListener('mouseleave', () => {
      tag.classList.remove('border-teal-500', 'bg-teal-50/50', 'text-midnight');
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 6. Project Details Modal                                                   */
/* -------------------------------------------------------------------------- */
function initProjectModal() {
  const modal = document.getElementById('project-modal');
  const openBtns = document.querySelectorAll('.open-project-modal-btn');
  const closeBtn = document.getElementById('close-project-modal');

  if (!modal || !closeBtn) return;

  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.style.overflow = 'hidden';
    });
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
}

/* -------------------------------------------------------------------------- */
/* 7. Contact Form Handling                                                   */
/* -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const statusMsg = document.getElementById('contact-status-msg');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const message = form.querySelector('[name="message"]').value.trim();

    if (!name || !email || !message) {
      showStatus('Please fill in all fields before sending.', 'error');
      return;
    }

    // Direct mailto link preparation & feedback
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg> Opening Email Client...
    `;

    setTimeout(() => {
      const mailtoUrl = `mailto:kmabhinav25@gmail.com?subject=Portfolio Contact from ${encodeURIComponent(name)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
      window.location.href = mailtoUrl;

      showStatus('Thank you! Opening your email client to complete sending.', 'success');
      form.reset();
      submitBtn.innerHTML = originalText;
    }, 800);
  });

  function showStatus(msg, type) {
    if (!statusMsg) return;
    statusMsg.classList.remove('hidden', 'text-green-600', 'text-red-600', 'bg-green-50', 'bg-red-50');
    if (type === 'success') {
      statusMsg.classList.add('text-green-700', 'bg-green-50', 'border', 'border-green-200');
    } else {
      statusMsg.classList.add('text-red-700', 'bg-red-50', 'border', 'border-red-200');
    }
    statusMsg.textContent = msg;
  }
}

/* -------------------------------------------------------------------------- */
/* 8. CV Download & Viewer Logic                                              */
/* -------------------------------------------------------------------------- */
const GOOGLE_DRIVE_CV_URL = 'https://drive.google.com/file/d/1OkKjk7z9MdCexpCY57LlAkbwtGp0alJ0/view?usp=sharing';

function initCVDownload() {
  const cvButtons = document.querySelectorAll('.download-cv-btn');

  cvButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Direct opening to user's Google Drive CV document
      window.open(GOOGLE_DRIVE_CV_URL, '_blank', 'noopener,noreferrer');
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 9. Scroll Animations                                                       */
/* -------------------------------------------------------------------------- */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('opacity-100', 'translate-y-0');
        entry.target.classList.remove('opacity-0', 'translate-y-6');
      }
    });
  }, { threshold: 0.1 });

  revealElements.forEach(el => {
    el.classList.add('transition-all', 'duration-700', 'ease-out', 'opacity-0', 'translate-y-6');
    observer.observe(el);
  });
}
