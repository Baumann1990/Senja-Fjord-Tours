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

/* ── Gallery rotation ────────────────────────────────────────── */
const GALLERY_POOL = [
  { src: 'images/samuele-bertoli-p_Hf6WlgKEE-unsplash.jpg',   alt: 'Segla mountain rising above the Senja fjord' },
  { src: 'images/nick-fewings-D02-UWKtv_c-unsplash.jpg',      alt: 'Small orange boat on glassy Arctic water' },
  { src: 'images/chris-stenger-fRtdVQWa0Dk-unsplash.jpg',     alt: 'Red rorbu on a snowy beach with turquoise water' },
  { src: 'images/knut-troim-tEjBzUns8SQ-unsplash.jpg',        alt: 'Boat silhouetted against a pink Arctic sky' },
  { src: 'images/knut-troim-gwbjoBpUIy8-unsplash.jpg',        alt: 'Fishing boat surrounded by seabirds at orange sunset' },
  { src: 'images/felix-bacher-Tv_gr3_oB0E-unsplash.jpg',      alt: 'Golden harbour at sunset with warm light on the water' },
  { src: 'images/federico-bottos-uWmWoH9maR4-unsplash.jpg',   alt: 'Aurora borealis illuminating the Okshornan peaks' },
  { src: 'images/lightscape-LtnPejWDSAY-unsplash.jpg',        alt: 'Purple and green northern lights over snowy landscape' },
  { src: 'images/jaanus-jagomagi-Bg1hgJEU3Es-unsplash.jpg',   alt: 'Aurora and shooting star over Senja' },
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
    if (field) field.classList.add('input--error');
    if (span)  span.textContent = message;
  };

  const clearFieldError = id => {
    const field = document.getElementById(id);
    const span  = document.getElementById('error-' + id);
    if (field) field.classList.remove('input--error');
    if (span)  span.textContent = '';
  };

  const validateForm = () => {
    let valid = true;
    ['name', 'email', 'tour', 'date', 'guests'].forEach(id => clearFieldError(id));

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

    const guests = form.querySelector('#guests');
    if (!guests.value) {
      setFieldError('guests', 'Please enter the number of guests.');
      valid = false;
    }

    return valid;
  };

  ['name', 'email', 'tour', 'date', 'guests'].forEach(id => {
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
