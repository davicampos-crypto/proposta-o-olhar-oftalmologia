/* ═══════════════════════════════════════════════════════════
   O Olhar Oftalmologia — interações L2
   Sem dependências. Tudo com IntersectionObserver + rAF.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced   = matchMedia('(prefers-reduced-motion: reduce)');
  var fineHover = matchMedia('(hover: hover) and (pointer: fine)');
  var desktop   = matchMedia('(min-width: 900px)');

  /* ─── 1. Reveal no scroll ─── */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduced.matches) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var delay = Number(e.target.dataset.revealDelay || 0);
        setTimeout(function () { e.target.classList.add('is-in'); }, delay);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ─── 2. Header reativo ao scroll ─── */
  var nav = document.querySelector('.nav');
  if (nav) {
    var navTicking = false;
    addEventListener('scroll', function () {
      if (navTicking) return;
      navTicking = true;
      requestAnimationFrame(function () {
        nav.dataset.scrolled = String(scrollY > 24);
        navTicking = false;
      });
    }, { passive: true });
  }

  /* ─── 3. Menu mobile ─── */
  var toggle = document.querySelector('.nav__toggle');
  var menu   = document.getElementById('menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
      menu.dataset.open = String(!open);
    });
    menu.addEventListener('click', function (ev) {
      if (ev.target.closest('.nav__link')) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu');
        menu.dataset.open = 'false';
      }
    });
    addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && menu.dataset.open === 'true') {
        toggle.setAttribute('aria-expanded', 'false');
        menu.dataset.open = 'false';
        toggle.focus();
      }
    });
  }

  /* ─── 4. Parallax do hero (só desktop) ─── */
  var parallax = document.querySelector('[data-parallax]');
  if (parallax && desktop.matches && !reduced.matches) {
    var pTicking = false;
    addEventListener('scroll', function () {
      if (pTicking) return;
      pTicking = true;
      requestAnimationFrame(function () {
        var y = Math.min(scrollY, 700) * 0.11;
        parallax.style.transform = 'translate3d(0,' + y + 'px,0)';
        pTicking = false;
      });
    }, { passive: true });
  }

  /* ─── 5. Luz que segue o cursor nos cards ─── */
  if (fineHover.matches && !reduced.matches) {
    document.querySelectorAll('.card').forEach(function (card) {
      var raf = false;
      card.addEventListener('pointermove', function (ev) {
        if (raf) return;
        raf = true;
        requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
          card.style.setProperty('--my', (ev.clientY - r.top) + 'px');
          raf = false;
        });
      }, { passive: true });
    });
  }

  /* ─── 6. CTA magnético ─── */
  if (fineHover.matches && !reduced.matches) {
    document.querySelectorAll('[data-magnet]').forEach(function (el) {
      var raf = false;
      el.addEventListener('pointermove', function (ev) {
        if (raf) return;
        raf = true;
        requestAnimationFrame(function () {
          var r = el.getBoundingClientRect();
          var dx = (ev.clientX - r.left - r.width  / 2) * 0.16;
          var dy = (ev.clientY - r.top  - r.height / 2) * 0.16;
          el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
          raf = false;
        });
      }, { passive: true });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ─── 7. Contagem de números ─── */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        el.textContent = Number(el.dataset.count).toLocaleString('pt-BR');
      });
    } else {
      var cIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target, target = Number(el.dataset.count);
          if (reduced.matches) {
            el.textContent = target.toLocaleString('pt-BR');
          } else {
            var t0 = performance.now(), dur = 1500;
            var tick = function (now) {
              var p = Math.min((now - t0) / dur, 1);
              var eased = 1 - Math.pow(1 - p, 3);
              el.textContent = Math.round(target * eased).toLocaleString('pt-BR');
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
          cIO.unobserve(el);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cIO.observe(el); });
    }
  }

  /* ─── 8a. Link ativo pela página atual ─── */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link[href$=".html"]').forEach(function (l) {
    if (l.getAttribute('href') === here) {
      l.classList.add('is-active');
      l.setAttribute('aria-current', 'page');
    }
  });

  /* ─── 8b. Link ativo conforme a seção visível (só em páginas com âncoras) ─── */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link[href^="#"]'));
  var sections = links
    .map(function (l) { return document.querySelector(l.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var visible = new Set();

    var paint = function () {
      // primeira seção visível na ordem do documento; nenhuma → nenhum link ativo
      var current = null;
      for (var i = 0; i < sections.length; i++) {
        if (visible.has(sections[i])) { current = sections[i].id; break; }
      }
      links.forEach(function (l) {
        var on = current !== null && l.getAttribute('href') === '#' + current;
        l.classList.toggle('is-active', on);
        if (on) { l.setAttribute('aria-current', 'true'); }
        else    { l.removeAttribute('aria-current'); }
      });
    };

    var sIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      });
      paint();
    }, { threshold: 0, rootMargin: '-25% 0px -60% 0px' });

    sections.forEach(function (s) { sIO.observe(s); });
  }

  /* ─── 9. Filtro de exames por categoria ─── */
  var filterBtns = document.querySelectorAll('[data-filter]');
  var filterHost = document.querySelector('[data-filter-target]');
  if (filterBtns.length && filterHost) {
    var cards  = Array.prototype.slice.call(filterHost.querySelectorAll('[data-cat]'));
    var status = document.querySelector('[data-filter-status]');
    var empty  = document.querySelector('[data-filter-empty]');

    var applyFilter = function (cat) {
      var shown = 0;
      cards.forEach(function (c) {
        var on = cat === 'all' || c.dataset.cat === cat;
        c.hidden = !on;
        if (on) { shown++; c.classList.add('is-in'); }   // já revelado ao reaparecer
      });
      if (empty) empty.hidden = shown > 0;
      if (status) {
        status.textContent = cat === 'all'
          ? shown + ' exames disponíveis'
          : shown + (shown === 1 ? ' exame' : ' exames') + ' nesta área';
      }
    };

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        applyFilter(btn.dataset.filter);
      });
    });

    applyFilter('all');
  }

  /* ─── 10. Acordeão ─── */
  document.querySelectorAll('.acc__trigger').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var open  = trigger.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      trigger.setAttribute('aria-expanded', String(!open));
      if (panel) panel.dataset.open = String(!open);
    });
  });

  /* ─── 11. Ano do rodapé ─── */
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = String(new Date().getFullYear());

})();
