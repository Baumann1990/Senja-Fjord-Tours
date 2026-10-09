/* ── Cookie consent ──────────────────────────────────────────── */
(function initCookieConsent() {
  const KEY    = 'cookieConsent';
  const stored = localStorage.getItem(KEY);

  if (typeof gtag === 'function') {
    gtag('consent', 'update', {
      analytics_storage: stored === 'accepted' ? 'granted' : 'denied'
    });
  }

  if (stored) return;

  const banner = document.createElement('div');
  banner.id = 'cookieBanner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML =
    '<p class="cookie__text">We use cookies to understand how visitors find and use our tours (Google Analytics). No data is shared for advertising.</p>' +
    '<div class="cookie__actions">' +
      '<button class="cookie__btn cookie__btn--decline" id="cookieDecline">Decline</button>' +
      '<button class="cookie__btn cookie__btn--accept"  id="cookieAccept">Accept</button>' +
    '</div>';
  document.body.appendChild(banner);

  const dismiss = choice => {
    localStorage.setItem(KEY, choice);
    if (choice === 'accepted' && typeof gtag === 'function') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    banner.classList.add('cookie--hidden');
    setTimeout(() => banner.remove(), 300);
  };

  document.getElementById('cookieAccept').addEventListener('click', () => dismiss('accepted'));
  document.getElementById('cookieDecline').addEventListener('click', () => dismiss('declined'));
})();

/* ── Northern lights indicator (15 Oct – 31 Mar) ─────────────── */
(function initAuroraIndicator() {
  const osloDate = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' }).format(d); // YYYY-MM-DD
  const today = osloDate(new Date());
  const [, month, day] = today.split('-').map(Number);
  const inSeason = (month === 10 && day >= 15) || month >= 11 || month <= 3;
  if (!inSeason || location.pathname.includes('thank-you')) return;

  const LEVEL = { good: 'Good chance', fair: 'Fair chance', low: 'Low chance' };
  const RANK  = { low: 0, fair: 1, good: 2 };
  const onTourPage = location.pathname.startsWith('/northern-lights-cruise');
  const cta = onTourPage
    ? '<a href="/?tour=northern-lights#book">Book a night →</a>'
    : '<a href="/northern-lights-cruise/">See the cruise →</a>';
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const tomorrow = osloDate(new Date(Date.now() + 864e5));
  const dayName = n =>
    n.date === today ? 'tonight'
    : n.date === tomorrow ? 'tomorrow'
    : new Date(n.date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });

  // Shown straight away (season message) so the page doesn't jump when the forecast arrives
  const ribbon = document.createElement('div');
  ribbon.className = 'aurora-ribbon';
  ribbon.setAttribute('role', 'status');
  ribbon.innerHTML =
    '<span class="aurora-dot"></span><span class="aurora-ribbon__text">' +
    '<span class="aurora-ribbon__long">Northern lights season — private aurora cruises from Finnsnes</span>' +
    '<span class="aurora-ribbon__short">Northern lights season</span></span>' + cta;
  document.body.prepend(ribbon);
  document.documentElement.classList.add('has-aurora-ribbon');

  fetch('/data/aurora.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(render)
    .catch(() => {});

  function render(data) {
    if (Date.now() - new Date(data.generated).getTime() > 12 * 3600e3) return; // stale: keep season message
    const nights = (data.nights || []).filter(n => LEVEL[n.level] && new Date(n.end).getTime() > Date.now());
    if (!nights.length) return;

    const first = nights[0];
    const detail = `Kp ${Number(first.kp)} · ${Number(first.cloud)}% cloud`;
    // Best later night (earliest wins a tie) when tonight isn't already good
    const better = first.level === 'good' ? null
      : nights.slice(1).reduce((best, n) => (RANK[n.level] > RANK[(best || first).level] ? n : best), null);
    const later = better
      ? `<span class="aurora-ribbon__later"><span class="sep">·</span> ${cap(dayName(better))}: <strong>${LEVEL[better.level]}</strong></span>`
      : '';

    ribbon.innerHTML =
      `<span class="aurora-dot aurora-dot--${first.level}"></span>` +
      `<span class="aurora-ribbon__text"><span class="aurora-ribbon__long">Northern lights</span>` +
      `<span class="aurora-ribbon__short">Aurora</span> ${dayName(first)}: <strong>${LEVEL[first.level]}</strong></span>` +
      `<span class="aurora-ribbon__detail"><span class="sep">·</span> ${detail}</span>` +
      later + cta;
    ribbon.title = 'Estimate for Finnsnes, 20:30–23:30, from NOAA aurora and MET Norway cloud forecasts';

    // Tour card shows tonight, or the better night if tonight looks low
    const featured = first.level === 'low' && better ? better : first;
    document.querySelectorAll('[data-aurora-chip]').forEach(chip => {
      chip.innerHTML = `<span class="aurora-dot aurora-dot--${featured.level}"></span>${cap(dayName(featured))}: ${LEVEL[featured.level]}`;
      chip.hidden = false;
    });

    document.querySelectorAll('[data-aurora-outlook]').forEach(list => {
      list.innerHTML = nights.map(n =>
        `<li><span class="aurora-dot aurora-dot--${n.level}"></span>` +
        `<span class="aurora-outlook__day">${cap(dayName(n))}</span><span>${LEVEL[n.level]}</span>` +
        `<span class="aurora-outlook__meta">Kp ${Number(n.kp)} · ${Number(n.cloud)}% cloud</span></li>`
      ).join('');
      list.hidden = false;
    });
  }
})();

/* ── Gallery rotation ────────────────────────────────────────── */
const GALLERY_POOL = [
  { src: 'images/chris-stenger-fRtdVQWa0Dk-unsplash.webp',     alt: 'Red rorbu on a snowy Senja beach with turquoise fjord water' },
  { src: 'images/samuele-bertoli-p_Hf6WlgKEE-unsplash.webp',   alt: 'Segla mountain rising above the Senja fjord' },
  { src: 'images/nick-fewings-D02-UWKtv_c-unsplash.webp',      alt: 'Small orange boat on glassy Arctic water' },
  { src: 'images/knut-troim-tEjBzUns8SQ-unsplash.webp',        alt: 'Boat silhouetted against a pink Arctic sky' },
  { src: 'images/knut-troim-gwbjoBpUIy8-unsplash.webp',        alt: 'Fishing boat surrounded by seabirds at orange sunset' },
  { src: 'images/felix-bacher-Tv_gr3_oB0E-unsplash.webp',      alt: 'Golden harbour at sunset with warm light on the water' },
  { src: 'images/federico-bottos-uWmWoH9maR4-unsplash.webp',   alt: 'Aurora borealis illuminating the Okshornan peaks' },
  { src: 'images/lightscape-LtnPejWDSAY-unsplash.webp',        alt: 'Purple and green northern lights over snowy landscape' },
  { src: 'images/jaanus-jagomagi-Bg1hgJEU3Es-unsplash.webp',   alt: 'Aurora and shooting star over Senja' },
  { src: 'images/boat-at-jetty-finnsnes-1.webp',              alt: 'Senja Fjord Tours boat moored at Finnsnes jetty with snow-capped mountains behind' },
  { src: 'images/boat-at-jetty-finnsnes-2.webp',              alt: 'Tour boat tied at the Finnsnes harbour jetty on a calm Arctic summer morning' },
];

const GALLERY_COUNT = 8;

(function buildGallery() {
  const track = document.getElementById('galleryTrack');
  if (!track) return;

  const pool = [...GALLERY_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  pool.slice(0, GALLERY_COUNT).forEach(({ src, alt }) => {
    const img = document.createElement('img');
    img.src     = src;
    img.alt     = alt;
    img.loading = 'lazy';
    track.appendChild(img);
  });
})();

/* ── Nav: scroll state ───────────────────────────────────────── */
const nav = document.getElementById('nav');

const updateNav = () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
};

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* ── Nav: mobile toggle ──────────────────────────────────────── */
const toggle = document.getElementById('navToggle');
const menu   = document.getElementById('navMenu');

toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

menu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', false);
  });
});

/* ── Tour filters ────────────────────────────────────────────── */
const filters   = document.querySelectorAll('.filter');
const tourCards = document.querySelectorAll('.tour-card');

filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const f = btn.dataset.filter;

    tourCards.forEach(card => {
      if (f === 'all') {
        card.classList.remove('hidden');
        return;
      }
      const match = card.dataset.surface === f || card.dataset.level === f;
      card.classList.toggle('hidden', !match);
    });
  });
});

/* ── Footer filter links ─────────────────────────────────────── */
document.querySelectorAll('a[data-filter]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const targetFilter = link.dataset.filter;
    document.getElementById('tours').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const btn = document.querySelector(`.filter[data-filter="${targetFilter}"]`);
      if (btn) btn.click();
    }, 500);
  });
});

/* ── Scroll fade-in ──────────────────────────────────────────── */
const fadeEls = document.querySelectorAll(
  '.tour-card, .about__grid, .book__grid, .section-header'
);

fadeEls.forEach(el => el.classList.add('fade-in'));

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);

fadeEls.forEach(el => observer.observe(el));

/* ── Modals ──────────────────────────────────────────────────── */
const openModal = id => {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal__close').focus();
};

const closeModal = modal => {
  modal.hidden = true;
  document.body.style.overflow = '';
};

document.querySelectorAll('[data-modal]').forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.dataset.modal));
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.querySelector('.modal__close').addEventListener('click', () => closeModal(modal));
  modal.querySelector('.modal__backdrop').addEventListener('click', () => closeModal(modal));
  modal.querySelectorAll('.modal__book').forEach(a => {
    a.addEventListener('click', () => closeModal(modal));
  });
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal:not([hidden])').forEach(closeModal);
});

/* ── Form: button groups ─────────────────────────────────────── */
document.querySelectorAll('[data-btn-group]').forEach(group => {
  const hidden  = document.getElementById(group.dataset.btnGroup);
  const buttons = group.querySelectorAll('[data-value]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (hidden) { hidden.value = btn.dataset.value; hidden.dispatchEvent(new Event('input')); }
    });
  });
  const pre = group.querySelector('.is-active');
  if (pre && hidden && !hidden.value) hidden.value = pre.dataset.value;
});

/* ── Form: preselect tour from ?tour=key or data-book-tour links ── */
const selectTour = key => {
  const btn = document.querySelector(`[data-btn-group="tour"] [data-key="${key}"]`);
  if (btn) btn.click();
};

const tourParam = new URLSearchParams(location.search).get('tour');
if (tourParam) selectTour(tourParam);

document.querySelectorAll('[data-book-tour]').forEach(link => {
  link.addEventListener('click', () => selectTour(link.dataset.bookTour));
});

/* ── Form: steppers ──────────────────────────────────────────── */
document.querySelectorAll('[data-stepper]').forEach(stepper => {
  const hidden  = document.getElementById(stepper.dataset.stepper);
  const display = stepper.querySelector('[data-stepper-val]');
  const min     = parseInt(stepper.dataset.min ?? '1');
  const max     = parseInt(stepper.dataset.max ?? '10');
  let   val     = parseInt(stepper.dataset.initial ?? min);

  function sync() {
    if (display) display.textContent = val;
    if (hidden)  { hidden.value = String(val); hidden.dispatchEvent(new Event('input')); }
  }

  stepper.querySelector('[data-stepper-down]').addEventListener('click', () => { if (val > min) { val--; sync(); } });
  stepper.querySelector('[data-stepper-up]'  ).addEventListener('click', () => { if (val < max) { val++; sync(); } });
  sync();
});

/* ── Booking form ────────────────────────────────────────────── */
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

const dateInput = document.getElementById('date');
if (dateInput) {
  dateInput.min = new Date().toISOString().split('T')[0];
}

const form         = document.getElementById('bookForm');
const confirmPanel = document.getElementById('formConfirm');

if (form) {
  const setFieldError = (id, message) => {
    const field = document.getElementById(id);
    const span  = document.getElementById('error-' + id);
    if (field) {
      const target = field.type === 'hidden' ? field.previousElementSibling : field;
      if (target) target.classList.add('input--error');
    }
    if (span) span.textContent = message;
  };

  const clearFieldError = id => {
    const field = document.getElementById(id);
    const span  = document.getElementById('error-' + id);
    if (field) {
      const target = field.type === 'hidden' ? field.previousElementSibling : field;
      if (target) target.classList.remove('input--error');
    }
    if (span) span.textContent = '';
  };

  const validateForm = () => {
    let valid = true;
    ['name', 'email', 'tour', 'date'].forEach(id => clearFieldError(id));

    const name = form.querySelector('#name');
    if (!name.value.trim()) {
      setFieldError('name', 'Please enter your name.');
      valid = false;
    }

    const email = form.querySelector('#email');
    if (!email.value.trim()) {
      setFieldError('email', 'Please enter your email address.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
      setFieldError('email', 'Please enter a valid email address (e.g. you@example.com).');
      valid = false;
    }

    const tour = form.querySelector('#tour');
    if (!tour.value) {
      setFieldError('tour', 'Please select a tour.');
      valid = false;
    }

    const date = form.querySelector('#date');
    if (!date.value) {
      setFieldError('date', 'Please pick a preferred date.');
      valid = false;
    }

    return valid;
  };

  ['name', 'email', 'tour', 'date'].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.addEventListener('input', () => clearFieldError(id));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!validateForm()) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Sending…';
    btn.disabled    = true;

    try {
      const res  = await fetch(WEB3FORMS_ENDPOINT, {
        method:  'POST',
        headers: { 'Accept': 'application/json' },
        body:    new FormData(form),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = '/thank-you';
      } else {
        btn.textContent = 'Something went wrong — try again';
        btn.disabled    = false;
      }
    } catch {
      btn.textContent = 'Network error — try again';
      btn.disabled    = false;
    }
  });
}
