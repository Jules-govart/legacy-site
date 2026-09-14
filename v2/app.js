/* =========================================================
   LEGACY v2 — moteur d'interactions
   Tout est détecté depuis le DOM. Sans JS, la page reste lisible.
   ========================================================= */

(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var isMobile = window.innerWidth < 760;

  root.classList.add('js');
  root.classList.add('is-locked');

  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------------------------------------------------------
     Boucle d'animation partagée (un seul requestAnimationFrame)
     --------------------------------------------------------- */
  var tickers = [];
  var last = performance.now();
  var running = true;

  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (var i = 0; i < tickers.length; i++) tickers[i](dt, now);
    requestAnimationFrame(loop);
  }
  function onTick(fn) { tickers.push(fn); }

  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) { running = false; }
    else if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  });
  requestAnimationFrame(loop);

  /* ---------------------------------------------------------
     1. Écran d'ouverture
     --------------------------------------------------------- */
  function initLoader() {
    var loader = $('#loader');
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      root.classList.remove('is-locked');
      if (loader) loader.classList.add('is-done');
      $$('.hero [data-split]').forEach(function (el) { el.classList.add('is-in'); });
      $$('.hero .reveal').forEach(function (el, i) {
        el.style.setProperty('--delay', (300 + i * 110) + 'ms');
        el.classList.add('is-in');
      });
      setTimeout(function () { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 900);
    }
    if (reduced) { finish(); return; }
    window.addEventListener('load', function () { setTimeout(finish, 350); });
    setTimeout(finish, 2600); // filet de sécurité
  }

  /* ---------------------------------------------------------
     2. Braises (canvas plein écran)
     --------------------------------------------------------- */
  function initEmbers() {
    var canvas = $('#embers');
    if (!canvas || reduced) return;
    var ctx = canvas.getContext('2d');
    var W, H, dpr, particles = [];
    var mouse = { x: -9999, y: -9999, active: false };
    var COUNT = isMobile ? 45 : 110;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.width = Math.floor(window.innerWidth * dpr);
      H = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    }

    function spawn(p, fromBottom) {
      p.x = Math.random() * W;
      p.y = fromBottom ? H + 20 * dpr : Math.random() * H;
      p.r = (0.6 + Math.random() * 1.9) * dpr;
      p.vy = -(6 + Math.random() * 22) * dpr;
      p.vx = (Math.random() - 0.5) * 8 * dpr;
      p.life = 0;
      p.max = 8 + Math.random() * 12;
      p.hue = Math.random() < 0.8 ? 43 : 350;
      p.wob = Math.random() * Math.PI * 2;
      p.wobSpeed = 0.6 + Math.random() * 1.4;
      return p;
    }

    resize();
    for (var i = 0; i < COUNT; i++) particles.push(spawn({}, false));
    window.addEventListener('resize', resize);

    if (finePointer) {
      window.addEventListener('pointermove', function (e) {
        mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; mouse.active = true;
      }, { passive: true });
      window.addEventListener('pointerleave', function () { mouse.active = false; });
    }

    onTick(function (dt, now) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.life += dt;
        p.wob += dt * p.wobSpeed;
        p.x += (p.vx + Math.sin(p.wob) * 10 * dpr) * dt;
        p.y += p.vy * dt;

        if (mouse.active) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var d2 = dx * dx + dy * dy;
          var R = 160 * dpr;
          if (d2 < R * R) {
            var d = Math.sqrt(d2) || 1;
            var f = (1 - d / R) * 90 * dpr * dt;
            p.x += dx / d * f; p.y += dy / d * f;
          }
        }

        var a = Math.sin(Math.PI * clamp(p.life / p.max, 0, 1));
        if (p.life > p.max || p.y < -20 * dpr) { spawn(p, true); continue; }

        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, 'hsla(' + p.hue + ', 85%, 72%, ' + (0.9 * a) + ')');
        g.addColorStop(0.4, 'hsla(' + p.hue + ', 85%, 60%, ' + (0.35 * a) + ')');
        g.addColorStop(1, 'hsla(' + p.hue + ', 85%, 55%, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  /* ---------------------------------------------------------
     3. Curseur personnalisé (desktop seulement)
     --------------------------------------------------------- */
  function initCursor() {
    if (!finePointer || reduced) return;
    var dot = $('.cursor-dot'), ring = $('.cursor-ring');
    if (!dot || !ring) return;
    var tx = -100, ty = -100, rx = -100, ry = -100, shown = false;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { rx = tx; ry = ty; shown = true; }
    }, { passive: true });
    window.addEventListener('pointerdown', function () { body.classList.add('cursor-down'); });
    window.addEventListener('pointerup', function () { body.classList.remove('cursor-down'); });

    doc.addEventListener('pointerover', function (e) {
      if (e.target.closest('a, button, .tilt, input, textarea, .chip-btn')) body.classList.add('cursor-hover');
    });
    doc.addEventListener('pointerout', function (e) {
      if (e.target.closest('a, button, .tilt, input, textarea, .chip-btn')) body.classList.remove('cursor-hover');
    });

    onTick(function () {
      rx = lerp(rx, tx, 0.18); ry = lerp(ry, ty, 0.18);
      dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
    });
  }

  /* ---------------------------------------------------------
     4. Défilement : progression, header, retour en haut, nav active
     --------------------------------------------------------- */
  function initScroll() {
    var bar = $('.progress span');
    var header = $('.site-header');
    var toTop = $('#toTop');
    var ring = toTop ? $('.to-top-bar', toTop) : null;
    var navLinks = $$('[data-nav]');
    var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    var ticking = false;

    function update() {
      var y = window.pageYOffset;
      var max = root.scrollHeight - window.innerHeight;
      var p = max > 0 ? y / max : 0;
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (header) header.classList.toggle('is-scrolled', y > 24);
      if (toTop) {
        toTop.classList.toggle('is-visible', y > 500);
        if (ring) ring.style.strokeDashoffset = 100.5 * (1 - p);
      }
      var mid = y + window.innerHeight * 0.4;
      var current = null;
      sections.forEach(function (s) { if (s.offsetTop <= mid) current = s; });
      navLinks.forEach(function (a) {
        a.classList.toggle('is-active', !!current && a.getAttribute('href') === '#' + current.id);
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (toTop) toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     5. Menu mobile
     --------------------------------------------------------- */
  function initMenu() {
    var burger = $('#burger'), menu = $('#mobile-menu');
    if (!burger || !menu) return;
    function set(open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.classList.toggle('is-open', open);
      root.classList.toggle('is-locked', open);
    }
    burger.addEventListener('click', function () { set(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) set(false); });
  }

  /* ---------------------------------------------------------
     6. Texte découpé lettre par lettre
     --------------------------------------------------------- */
  function initSplit() {
    $$('[data-split]').forEach(function (el) {
      var text = el.textContent;
      el.setAttribute('aria-label', text);
      el.classList.add('split');
      el.textContent = '';
      var i = 0;
      Array.prototype.forEach.call(text, function (ch) {
        var s = doc.createElement('span');
        s.className = 'chr';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = ch === ' ' ? ' ' : ch;
        s.style.setProperty('--i', i++);
        el.appendChild(s);
      });
    });
  }

  /* ---------------------------------------------------------
     7. Apparition au scroll (hors hero, géré par le loader)
     --------------------------------------------------------- */
  function initReveal() {
    var targets = $$('.reveal, [data-split]').filter(function (el) { return !el.closest('.hero'); });
    if (!targets.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var groups = {};
    targets.forEach(function (el) {
      if (!el.classList.contains('reveal')) return;
      var key = el.parentElement ? el.parentElement.className : 'x';
      groups[key] = groups[key] || 0;
      el.style.setProperty('--delay', (groups[key] * 90) + 'ms');
      groups[key]++;
    });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { obs.observe(el); });
  }

  /* ---------------------------------------------------------
     8. Mots qui tournent dans le hero
     --------------------------------------------------------- */
  function initRotator() {
    var box = $('.rotator');
    if (!box) return;
    var words = (box.getAttribute('data-words') || '').split('|').filter(Boolean);
    if (words.length < 2) return;
    var idx = 0;
    var current = $('.rotator-word', box);
    box.style.minWidth = '';

    // Réserve la largeur du mot le plus long pour éviter les sauts de ligne.
    var probe = current.cloneNode(true);
    probe.style.position = 'absolute'; probe.style.visibility = 'hidden';
    box.appendChild(probe);
    var maxW = 0;
    words.forEach(function (w) { probe.textContent = w; maxW = Math.max(maxW, probe.offsetWidth); });
    box.removeChild(probe);
    if (maxW && maxW < window.innerWidth * 0.8) box.style.minWidth = Math.ceil(maxW) + 'px';

    if (reduced) return;
    setInterval(function () {
      idx = (idx + 1) % words.length;
      var next = doc.createElement('span');
      next.className = 'rotator-word is-in';
      next.textContent = words[idx];
      current.classList.add('is-out');
      var old = current;
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 500);
      box.appendChild(next);
      current = next;
    }, 2600);
  }

  /* ---------------------------------------------------------
     9. Comptes à rebours (hero + pastille du header)
     --------------------------------------------------------- */
  function initCountdown() {
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var hero = $('[data-countdown-target]');
    var pill = $('[data-countdown]');
    var heroT = hero ? new Date(hero.getAttribute('data-countdown-target')).getTime() : NaN;
    var pillT = pill ? new Date(pill.getAttribute('data-countdown')).getTime() : NaN;
    var pillLabel = pill ? (pill.getAttribute('data-label') || '') : '';
    var pillText = pill ? $('.live-text', pill) : null;
    var els = hero ? { d: $('[data-d]', hero), h: $('[data-h]', hero), m: $('[data-m]', hero), s: $('[data-s]', hero) } : null;
    var lastS = null;

    function setNum(el, v) {
      if (!el || el.textContent === v) return;
      el.textContent = v;
      if (!reduced) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
    }

    function tick() {
      var now = Date.now();
      if (hero && !isNaN(heroT)) {
        var r = heroT - now;
        if (r <= 0) {
          hero.classList.add('is-live');
        } else {
          var s = Math.floor(r / 1000);
          setNum(els.d, pad(Math.floor(s / 86400)));
          setNum(els.h, pad(Math.floor(s % 86400 / 3600)));
          setNum(els.m, pad(Math.floor(s % 3600 / 60)));
          setNum(els.s, pad(s % 60));
        }
      }
      if (pill && pillText && !isNaN(pillT)) {
        var rr = pillT - now;
        var txt;
        if (rr <= 0 && rr > -6 * 3600 * 1000) txt = pillLabel + ' · c’est ce soir';
        else if (rr <= 0) txt = pillLabel + ' · terminé';
        else {
          var ss = Math.floor(rr / 1000);
          var d = Math.floor(ss / 86400), h = Math.floor(ss % 86400 / 3600), m = Math.floor(ss % 3600 / 60), sec = ss % 60;
          txt = pillLabel + ' · ' + (d > 0 ? 'J-' + d + ' ' : '') + pad(h) + ':' + pad(m) + ':' + pad(sec);
        }
        if (txt !== lastS) { pillText.textContent = txt; lastS = txt; }
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------
     10. Moteur de défilement continu (bandeaux, logos, affiches)
     --------------------------------------------------------- */
  function marquee(track, speed, opts) {
    opts = opts || {};
    if (!track || reduced) return;
    var originals = Array.prototype.slice.call(track.children);
    if (!originals.length) return;
    var setWidth = 0, x = 0, factor = 1, target = 1;
    var container = track.parentElement;

    function build() {
      Array.prototype.slice.call(track.children).forEach(function (c, i) { if (i >= originals.length) track.removeChild(c); });
      var gap = parseFloat(getComputedStyle(track).gap) || 0;
      setWidth = 0;
      originals.forEach(function (c) { setWidth += c.getBoundingClientRect().width + gap; });
      if (setWidth <= 0) return;
      var need = Math.ceil((container.clientWidth * 2) / setWidth) + 1;
      for (var k = 0; k < need; k++) {
        originals.forEach(function (c) {
          var clone = c.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.setAttribute('tabindex', '-1');
          track.appendChild(clone);
        });
      }
      x = speed < 0 ? -setWidth : 0;
    }
    build();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); });

    if (opts.pauseOnHover) {
      container.addEventListener('pointerenter', function () { target = opts.hoverFactor != null ? opts.hoverFactor : 0; });
      container.addEventListener('pointerleave', function () { target = 1; });
    }

    onTick(function (dt) {
      if (!setWidth) return;
      factor = lerp(factor, target, 0.08);
      x -= speed * factor * dt;
      if (speed > 0 && x <= -setWidth) x += setWidth;
      if (speed < 0 && x >= 0) x -= setWidth;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });

    return { setSpeed: function (s) { speed = s; } };
  }

  function initMarquees() {
    $$('.band-track').forEach(function (t) {
      marquee(t, parseFloat(t.getAttribute('data-speed')) || 60);
    });
    $$('.logos-row').forEach(function (t, i) {
      var dir = parseFloat(t.getAttribute('data-dir')) || 1;
      marquee(t, dir * (isMobile ? 28 : 38), { pauseOnHover: true, hoverFactor: 0.25 });
    });
    var strip = $('.strip-track');
    if (strip) {
      var api = marquee(strip, isMobile ? 30 : 42, { pauseOnHover: true, hoverFactor: 0 });
      var wrap = strip.parentElement;
      var touching = false;
      wrap.addEventListener('touchstart', function () { touching = true; }, { passive: true });
      wrap.addEventListener('touchend', function () { touching = false; }, { passive: true });
      void api;
    }
  }

  /* ---------------------------------------------------------
     11. Compteurs animés
     --------------------------------------------------------- */
  function initCounters() {
    var els = $$('[data-count]');
    if (!els.length) return;
    function run(el) {
      var to = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var prefix = el.getAttribute('data-prefix') || '';
      if (reduced) { el.textContent = prefix + to + suffix; return; }
      var start = performance.now(), dur = 1600 + Math.min(1400, to * 4);
      function step(now) {
        var t = clamp((now - start) / dur, 0, 1);
        var e = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + Math.round(to * e) + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.5 });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ---------------------------------------------------------
     12. Cartes 3D (tilt) + reflet
     --------------------------------------------------------- */
  function initTilt() {
    if (!finePointer || reduced) return;
    $$('.tilt').forEach(function (card) {
      var shine = doc.createElement('span');
      shine.className = 'tilt-shine';
      card.appendChild(shine);
      var rect = null;
      card.addEventListener('pointerenter', function () { rect = card.getBoundingClientRect(); card.classList.add('is-tilting'); });
      card.addEventListener('pointermove', function (e) {
        if (!rect) rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
        var rx = (0.5 - py) * 12, ry = (px - 0.5) * 14;
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-6px)';
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        rect = null; card.classList.remove('is-tilting'); card.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------
     13. Boutons magnétiques + onde au clic
     --------------------------------------------------------- */
  function initButtons() {
    $$('.btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (reduced) return;
        var r = btn.getBoundingClientRect();
        var s = doc.createElement('span');
        s.className = 'ripple';
        var size = Math.max(r.width, r.height);
        s.style.width = s.style.height = size + 'px';
        s.style.left = (e.clientX - r.left - size / 2) + 'px';
        s.style.top = (e.clientY - r.top - size / 2) + 'px';
        btn.appendChild(s);
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
      });
    });
    if (!finePointer || reduced) return;
    $$('.magnetic').forEach(function (el) {
      var strength = 0.35;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * strength).toFixed(1) + 'px,' + (dy * strength).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     14. Parallaxe : souris (hero) et défilement (manifeste)
     --------------------------------------------------------- */
  function initParallax() {
    if (reduced) return;
    var items = $$('[data-parallax]');
    if (items.length && finePointer) {
      var hero = $('.hero');
      var tx = 0, ty = 0, cx = 0, cy = 0;
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
      });
      hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
      onTick(function () {
        cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
        items.forEach(function (el) {
          var k = parseFloat(el.getAttribute('data-parallax')) || 0;
          el.style.transform = 'translate3d(' + (cx * k).toFixed(2) + 'px,' + (cy * k).toFixed(2) + 'px,0)';
        });
      });
    }
    var scrollers = $$('[data-parallax-scroll]');
    if (scrollers.length) {
      onTick(function () {
        scrollers.forEach(function (el) {
          var k = parseFloat(el.getAttribute('data-parallax-scroll')) || 0.1;
          var parent = el.parentElement.getBoundingClientRect();
          var off = (parent.top + parent.height / 2 - window.innerHeight / 2) * k;
          el.style.transform = 'translateY(calc(-50% + ' + off.toFixed(1) + 'px)) rotate(' + (off * 0.04).toFixed(2) + 'deg)';
        });
      });
    }
  }

  /* ---------------------------------------------------------
     15. Filtre des avantages
     --------------------------------------------------------- */
  function initPerks() {
    var grid = $('[data-perks]');
    var btns = $$('.chip-btn');
    if (!grid || !btns.length) return;
    var empty = $('[data-perks-empty]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filter');
        btns.forEach(function (o) { var on = o === b; o.classList.toggle('is-active', on); o.setAttribute('aria-selected', on ? 'true' : 'false'); });
        var shown = 0;
        $$('.perk', grid).forEach(function (p, i) {
          var ok = f === 'all' || p.getAttribute('data-cat') === f;
          p.classList.toggle('is-hidden', !ok);
          p.classList.add('is-in');
          if (ok) {
            shown++;
            p.classList.remove('pop'); void p.offsetWidth;
            p.style.animationDelay = (shown * 35) + 'ms';
            p.classList.add('pop');
          }
        });
        if (empty) empty.hidden = shown > 0;
      });
    });
  }

  /* ---------------------------------------------------------
     16. Formulaire de contact (envoi sans rechargement)
     --------------------------------------------------------- */
  function initForm() {
    var form = $('[data-form]');
    if (!form || !window.fetch) return;
    var status = $('[data-form-status]', form);
    var btn = $('button[type="submit"]', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.textContent = 'Envoi en cours…';
      if (btn) btn.disabled = true;
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) {
          if (r.ok) { form.reset(); if (status) status.textContent = 'Message envoyé. On vous répond vite.'; }
          else { throw new Error('bad status'); }
        })
        .catch(function () {
          if (status) status.textContent = 'Envoi impossible pour le moment. Écrivez-nous à bde.legacy.mbs7@gmail.com.';
        })
        .then(function () { if (btn) btn.disabled = false; });
    });
  }

  /* ---------------------------------------------------------
     17. Visionneuse d'affiches
     --------------------------------------------------------- */
  function initLightbox() {
    var lb = $('#lightbox');
    if (!lb) return;
    var img = $('img', lb), cap = $('figcaption b', lb), sub = $('figcaption i', lb), close = $('.lightbox-close', lb);
    var lastFocus = null;
    function open(a) {
      lastFocus = a;
      img.src = a.getAttribute('href');
      img.alt = a.getAttribute('data-title') || '';
      cap.textContent = a.getAttribute('data-title') || '';
      sub.textContent = a.getAttribute('data-sub') || '';
      lb.hidden = false; root.classList.add('is-locked');
      close.focus();
    }
    function shut() {
      lb.hidden = true; root.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('.poster');
      if (a) { e.preventDefault(); open(a); }
    });
    close.addEventListener('click', shut);
    lb.addEventListener('click', function (e) { if (e.target === lb) shut(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) shut(); });
  }

  /* ---------------------------------------------------------
     18. Divers
     --------------------------------------------------------- */
  function initMisc() {
    var y = $('[data-year]');
    if (y) y.textContent = new Date().getFullYear();

    // Décalage du header pour les ancres
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = $(id);
        if (!t) return;
        e.preventDefault();
        var top = t.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
        try { history.replaceState(null, '', id); } catch (err) { /* contexte isolé : ignoré */ }
      });
    });
  }

  /* --------------------------------------------------------- */
  function start() {
    initSplit();
    initLoader();
    initEmbers();
    initCursor();
    initScroll();
    initMenu();
    initReveal();
    initRotator();
    initCountdown();
    initMarquees();
    initCounters();
    initTilt();
    initButtons();
    initParallax();
    initPerks();
    initForm();
    initLightbox();
    initMisc();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})();
