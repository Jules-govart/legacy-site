/* =========================================================
   LEGACY — animations
   Aucune modification du HTML nécessaire : tout est détecté.
   Si ce script est retiré, le site revient à son état normal.
   ========================================================= */

(function () {
  'use strict';

  // Respecter les préférences d'accessibilité du système
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduit) return;

  document.documentElement.classList.add('anim-on');

  /* ---------------------------------------------------------
     1. APPARITION AU SCROLL
     --------------------------------------------------------- */
  function initReveal() {
    var cibles = document.querySelectorAll(
      'section > h1, section > h2, .section-title, .section-subtitle, ' +
      '.rentree-card, .perk, .lineup-card, .shuttle-card, ' +
      '.agenda-item, .archive-item, .next-event-banner, ' +
      '.next-event-poster, .next-event-info, .pricing, ' +
      '.banner-legacy-inner, .card, .partner-card, .legal h2'
    );

    if (!cibles.length) return;

    // Décalage progressif entre éléments voisins
    var groupes = {};
    cibles.forEach(function (el) {
      el.classList.add('reveal');
      var parent = el.parentElement;
      var cle = parent ? (parent.className || 'x') : 'x';
      groupes[cle] = groupes[cle] || 0;
      el.style.setProperty('--delai', (groupes[cle] * 70) + 'ms');
      groupes[cle]++;
    });

    if (!('IntersectionObserver' in window)) {
      cibles.forEach(function (el) { el.classList.add('vu'); });
      return;
    }

    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('vu');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    cibles.forEach(function (el) { obs.observe(el); });
  }

  /* ---------------------------------------------------------
     2. HEADER QUI SE COMPACTE AU SCROLL
     --------------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector('header');
    if (!header) return;

    var dernier = 0;
    var enCours = false;

    function maj() {
      var y = window.pageYOffset;
      if (y > 60) header.classList.add('header-compact');
      else header.classList.remove('header-compact');
      dernier = y;
      enCours = false;
    }

    window.addEventListener('scroll', function () {
      if (!enCours) {
        window.requestAnimationFrame(maj);
        enCours = true;
      }
    }, { passive: true });

    maj();
  }

  /* ---------------------------------------------------------
     3. COMPTE À REBOURS (page événements)
     --------------------------------------------------------- */
  function initCompteARebours() {
    var flag = document.querySelector('.next-event-flag');
    if (!flag) return;

    // Date cible : jeudi 10 septembre 2026, 20h00 (heure de Paris)
    var cible = new Date('2026-09-10T20:00:00+02:00').getTime();
    if (isNaN(cible)) return;

    var box = document.createElement('div');
    box.className = 'countdown';
    box.innerHTML =
      '<div class="cd-unit"><span class="cd-num" data-j>--</span><span class="cd-lab">jours</span></div>' +
      '<div class="cd-unit"><span class="cd-num" data-h>--</span><span class="cd-lab">heures</span></div>' +
      '<div class="cd-unit"><span class="cd-num" data-m>--</span><span class="cd-lab">min</span></div>' +
      '<div class="cd-unit"><span class="cd-num" data-s>--</span><span class="cd-lab">sec</span></div>';

    flag.parentNode.insertBefore(box, flag.nextSibling);

    var ej = box.querySelector('[data-j]'),
        eh = box.querySelector('[data-h]'),
        em = box.querySelector('[data-m]'),
        es = box.querySelector('[data-s]');

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function tic() {
      var reste = cible - Date.now();

      if (reste <= 0) {
        box.innerHTML = '<div class="cd-live">C\'est ce soir</div>';
        clearInterval(timer);
        return;
      }

      var s = Math.floor(reste / 1000);
      ej.textContent = Math.floor(s / 86400);
      eh.textContent = pad(Math.floor(s % 86400 / 3600));
      em.textContent = pad(Math.floor(s % 3600 / 60));
      es.textContent = pad(s % 60);
    }

    tic();
    var timer = setInterval(tic, 1000);
  }

  /* ---------------------------------------------------------
     4. BANDEAU DÉFILANT DES PARTENAIRES (accueil)
     --------------------------------------------------------- */
  function initDefilement() {
    var grille = document.querySelector('.perks-grid');
    if (!grille) return;
    if (window.innerWidth < 700) return; // sur mobile la grille reste plus lisible

    var items = Array.prototype.slice.call(grille.children);
    if (items.length < 4) return;

    var piste = document.createElement('div');
    piste.className = 'marquee-piste';

    // Deux copies pour une boucle sans couture
    items.forEach(function (el) { piste.appendChild(el.cloneNode(true)); });
    items.forEach(function (el) { piste.appendChild(el.cloneNode(true)); });

    var conteneur = document.createElement('div');
    conteneur.className = 'marquee';
    conteneur.appendChild(piste);

    grille.parentNode.replaceChild(conteneur, grille);

    // Vitesse proportionnelle au nombre de logos
    piste.style.setProperty('--duree', (items.length * 5) + 's');
  }

  /* ---------------------------------------------------------
     5. DÉFILEMENT DOUX SUR LES ANCRES
     --------------------------------------------------------- */
  function initAncres() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        var cible = document.querySelector(id);
        if (!cible) return;
        e.preventDefault();
        cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* --------------------------------------------------------- */
  function demarrer() {
    initReveal();
    initHeader();
    initCompteARebours();
    initDefilement();
    initAncres();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }

})();
