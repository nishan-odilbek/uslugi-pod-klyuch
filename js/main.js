(() => {
  'use strict';

  /* ---------- Аналитика ----------
     Когда появится счётчик Яндекс Метрики, впишите его номер сюда.
     Цели отправляются по клику на любой элемент с data-goal. */
  const YM_ID = null; // например: 98765432

  function reachGoal(name) {
    try {
      if (YM_ID && typeof window.ym === 'function') window.ym(YM_ID, 'reachGoal', name);
      if (typeof window.gtag === 'function') window.gtag('event', name);
    } catch (e) { /* аналитика не должна ломать сайт */ }
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-goal]');
    if (el) reachGoal(el.dataset.goal);
  });

  /* ---------- Шапка: фон при прокрутке, тёмная над тёмными секциями,
     прячется при прокрутке вниз и появляется при прокрутке вверх ---------- */
  const header = document.querySelector('.header');
  const hero = document.querySelector('.hero');
  let lastY = window.scrollY;
  let ticking = false;

  function updateHeader() {
    const y = window.scrollY;
    // на страницах без светлого первого экрана (кейсы) шапка всегда тёмная
    const heroBottom = hero ? hero.offsetTop + hero.offsetHeight - header.offsetHeight : -1;

    header.classList.toggle('is-scrolled', y > 8);
    header.classList.toggle('is-dark', y > heroBottom);

    if (!document.body.classList.contains('menu-open')) {
      const goingDown = y > lastY;
      header.classList.toggle('is-hidden', goingDown && y > 400);
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });
  updateHeader();

  /* ---------- Мобильное меню ---------- */
  const menu = document.getElementById('menu');
  const burger = document.querySelector('.burger');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    if (open) menu.querySelector('.menu__close').focus();
    else burger.focus({ preventScroll: true });
  }

  burger.addEventListener('click', () => setMenu(true));
  menu.querySelectorAll('[data-menu-close]').forEach((el) => {
    el.addEventListener('click', () => setMenu(false));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
  window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
    if (e.matches && menu.classList.contains('is-open')) setMenu(false);
  });

  /* ---------- FAQ: открыт один вопрос за раз ---------- */
  const items = document.querySelectorAll('.faq__item');
  items.forEach((item) => {
    item.querySelector('.faq__q').addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      items.forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        item.classList.add('is-open');
        item.querySelector('.faq__q').setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- Бегущие строки: бесконечная петля на экране любой ширины ----------
     Набор элементов повторяем, пока он не станет шире экрана, затем удваиваем —
     анимация сдвигает ленту ровно на половину, поэтому стык не виден. */
  function setupMarquee(track, speed) {
    const items = Array.from(track.children).map((n) => n.cloneNode(true));
    let builtFor = 0;

    function build() {
      const vw = window.innerWidth;
      if (vw === builtFor) return;
      builtFor = vw;

      track.replaceChildren(...items.map((n) => n.cloneNode(true)));
      const unit = Array.from(track.children).reduce((sum, el) => {
        return sum + el.getBoundingClientRect().width + parseFloat(getComputedStyle(el).marginRight);
      }, 0);
      if (!unit) return;

      const reps = Math.max(1, Math.ceil(vw / unit));
      const frag = document.createDocumentFragment();
      for (let i = 1; i < reps * 2; i++) {
        items.forEach((n) => {
          const clone = n.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          frag.appendChild(clone);
        });
      }
      track.appendChild(frag);
      track.style.setProperty('--marquee-duration', `${(unit * reps) / speed}s`);
      track.dataset.ready = '';
    }

    build();
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(build, 200);
    });
    // шрифт подгружается позже и меняет ширину текста
    if (document.fonts) document.fonts.ready.then(() => { builtFor = 0; build(); });
  }

  document.querySelectorAll('.hero__track').forEach((track) => setupMarquee(track, 36));
  document.querySelectorAll('.footer__track').forEach((track) => setupMarquee(track, 110));

  /* ---------- Полоски в «Как работаю»: появляются строго по очереди ----------
     Карточки, попавшие в экран, встают в очередь; следующая полоска
     начинается, когда закончилась предыдущая. */
  const LINE_MS = 700;
  const lineQueue = [];
  let linePlaying = false;

  function playNextLine() {
    const step = lineQueue.shift();
    if (!step) { linePlaying = false; return; }
    linePlaying = true;
    step.classList.add('line-on');
    setTimeout(playNextLine, LINE_MS);
  }

  function queueLine(step) {
    lineQueue.push(step);
    if (!linePlaying) {
      linePlaying = true;
      setTimeout(playNextLine, 400); // даём карточке появиться
    }
  }

  /* ---------- «Ещё проекты»: стрелки и перетаскивание мышью ----------
     На телефоне лента листается пальцем, на компьютере — стрелками или мышью. */
  const moreTrack = document.querySelector('.more__track');
  if (moreTrack) {
    const btns = document.querySelectorAll('.more__btn');
    const step = () => {
      const card = moreTrack.firstElementChild;
      const gap = parseFloat(getComputedStyle(moreTrack).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : moreTrack.clientWidth;
    };
    const updateBtns = () => {
      const max = moreTrack.scrollWidth - moreTrack.clientWidth - 2;
      btns.forEach((b) => {
        b.disabled = b.dataset.dir === '-1' ? moreTrack.scrollLeft <= 2 : moreTrack.scrollLeft >= max;
      });
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      moreTrack.scrollBy({ left: step() * Number(b.dataset.dir), behavior: 'smooth' });
    }));
    moreTrack.addEventListener('scroll', updateBtns, { passive: true });
    window.addEventListener('resize', updateBtns);
    updateBtns();

    let startX = 0, startLeft = 0, dragging = false, moved = false;
    moreTrack.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; moved = false;
      startX = e.clientX; startLeft = moreTrack.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; moreTrack.classList.add('is-dragging'); }
      if (moved) moreTrack.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        moreTrack.classList.remove('is-dragging');
        // доводим до ближайшей карточки
        const s = step();
        moreTrack.scrollTo({ left: Math.round(moreTrack.scrollLeft / s) * s, behavior: 'smooth' });
      }
    });
    moreTrack.addEventListener('dragstart', (e) => e.preventDefault());
  }

  /* ---------- Появление блоков при прокрутке ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          if (entry.target.classList.contains('step')) queueLine(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revealEls.forEach((el) => {
      // Карточки в одном ряду появляются по очереди
      const siblings = Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-reveal'));
      const index = siblings.indexOf(el);
      if (siblings.length > 1 && index > 0) {
        el.style.transitionDelay = `${Math.min(index, 3) * 80}ms`;
        // после появления убираем задержку, чтобы hover срабатывал сразу
        el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
      }
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible', 'line-on'));
  }
})();
