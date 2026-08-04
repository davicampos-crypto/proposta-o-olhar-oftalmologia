/* Animação de background do hero — canvas 2D, sem dependências.
   Respeita prefers-reduced-motion, pausa fora da viewport e em aba oculta. */
(function () {
  'use strict';

  /* Em apps React/Next, inserir o canvas antes da hidratação causa mismatch e o
     React descarta o nó. Espera a hidratação terminar antes de montar. */
  function ready(cb) {
    var done = false;
    function go() { if (done) return; done = true; cb(); }
    var isReactApp = !!(self.__next_f || document.querySelector('script[src*="/_next/"]'));
    if (!isReactApp) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
      else go();
      return;
    }
    var tries = 0;
    (function poll() {
      var host = document.querySelector('main') || document.body;
      var hydrated = host && Object.keys(host).some(function (k) { return k.indexOf('__react') === 0; });
      if (hydrated) { setTimeout(go, 60); return; }
      if (++tries > 120) return go();
      setTimeout(poll, 50);
    })();
  }

  function boot() {
  var HERO = document.querySelector('.hero');
  if (!HERO || HERO.querySelector('canvas[data-hero-anim]')) return;
  var ctxTest = document.createElement('canvas').getContext && true;
  if (!ctxTest) return;

  var kids = Array.prototype.slice.call(HERO.children);
  if (getComputedStyle(HERO).position === 'static') HERO.style.position = 'relative';
  kids.forEach(function (el) {
    var p = getComputedStyle(el).position;
    if (p === 'absolute' || p === 'fixed') return;
    if (p === 'static') el.style.position = 'relative';
    if (getComputedStyle(el).zIndex === 'auto') el.style.zIndex = '2';
  });

  var cv = document.createElement('canvas');
  cv.setAttribute('data-hero-anim', '');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none';
  HERO.insertBefore(cv, HERO.firstChild);

  var ctx = cv.getContext('2d');
  if (!ctx) { cv.parentNode.removeChild(cv); return; }

  var w = 1, h = 1, dpr = 1, T = 0, raf = 0, visible = true;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = HERO.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setup();
  }

  /* ---- animação ---- */

  var cx = 0, cy = 0, R = 1, BLUE = '43,92,230', DEEP = '23,59,163';

  function setup() {
    cx = w * (w > 900 ? .78 : .5);
    cy = h * (w > 900 ? .38 : .26);
    R = Math.min(Math.max(w, h) * .42, 460);
  }

  function frame() {
    var i;
    var breathe = 1 + Math.sin(T * .55) * .05;
    var ri = R * .30 * breathe;   /* pupila */
    var ro = R * breathe;         /* borda da íris */

    /* halo */
    var g = ctx.createRadialGradient(cx, cy, ri, cx, cy, ro * 1.25);
    g.addColorStop(0, 'rgba(' + BLUE + ',.10)');
    g.addColorStop(.6, 'rgba(' + BLUE + ',.05)');
    g.addColorStop(1, 'rgba(' + BLUE + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, ro * 1.25, 0, 6.2832); ctx.fill();

    /* fibras */
    var N = 170;
    ctx.lineCap = 'round';
    for (i = 0; i < N; i++) {
      var ang = i / N * 6.2831853 + T * .03;
      var seed = Math.sin(i * 12.9898) * .5 + .5;
      var r1 = ri + (ro - ri) * (.45 + seed * .55);
      var al = .05 + .11 * (Math.sin(T * 1.2 + i * .55) * .5 + .5);
      ctx.lineWidth = .6 + seed * 1.1;
      ctx.strokeStyle = 'rgba(' + (i % 3 ? BLUE : DEEP) + ',' + al.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * ri, cy + Math.sin(ang) * ri);
      var mx = cx + Math.cos(ang + .08) * (ri + r1) / 2, my = cy + Math.sin(ang + .08) * (ri + r1) / 2;
      ctx.quadraticCurveTo(mx, my, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.stroke();
    }

    /* limbo e pupila */
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(' + DEEP + ',.20)';
    ctx.beginPath(); ctx.arc(cx, cy, ro, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = 'rgba(' + DEEP + ',.26)';
    ctx.beginPath(); ctx.arc(cx, cy, ri, 0, 6.2832); ctx.stroke();

    /* ondas concêntricas saindo */
    for (i = 0; i < 3; i++) {
      var p = ((T * .1) + i / 3) % 1;
      var rr = ro * (1 + p * .6);
      ctx.strokeStyle = 'rgba(' + BLUE + ',' + (Math.sin(p * Math.PI) * .14).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.stroke();
    }
  }

  /* ---- /animação ---- */

  var last = 0;
  function loop(ts) {
    /* se o React re-renderizou o hero e descartou este canvas, encerra o laço */
    if (!cv.isConnected) { stop(); return; }
    raf = requestAnimationFrame(loop);
    var dt = ts - last;
    if (!last || dt > 100) dt = 16;
    last = ts;
    T += dt / 1000;
    ctx.clearRect(0, 0, w, h);
    frame(dt / 1000);
  }
  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  try { resize(); } catch (e) { cv.parentNode.removeChild(cv); return; }

  if (window.ResizeObserver) { new ResizeObserver(function () { resize(); }).observe(HERO); }
  else { window.addEventListener('resize', resize); }

  if (reduce) {
    ctx.clearRect(0, 0, w, h);
    try { frame(0); } catch (e) {}
    return;
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !document.hidden) start(); else stop();
    }, { threshold: 0 }).observe(HERO);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (visible) start();
  });
  start();
  }

  /* Remonta se o canvas for descartado por um re-render do React. */
  ready(function () {
    boot();
    var checks = 0;
    var iv = setInterval(function () {
      if (++checks > 30) { clearInterval(iv); return; }
      if (!document.querySelector('.hero canvas[data-hero-anim]')) boot();
    }, 500);
  });
})();
