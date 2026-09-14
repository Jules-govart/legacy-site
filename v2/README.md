# LEGACY v2 — site indépendant

Ce dossier contient une **version entièrement séparée** du site LEGACY.
Il ne partage aucun fichier avec le site actuel à la racine du dépôt :
ses images sont dans `v2/assets/`, son style dans `v2/style.css`, ses
interactions dans `v2/app.js`. Modifier ou supprimer `v2/` n'a aucun effet
sur le site en ligne, et inversement.

Une fois la branche fusionnée dans `main`, la page est servie à
`https://www.bdelegacy.fr/v2/`. Le site racine reste servi à la racine.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page (une seule page, sections ancrées) |
| `style.css` | Style, animations CSS, responsive |
| `app.js` | Braises, curseur, compteurs, bandeaux, tilt, filtre, formulaire, visionneuse |
| `assets/` | Images redimensionnées (3,4 Mo au total) |

## Ce qu'il faut mettre à jour régulièrement

**Prochain événement (compte à rebours).** Deux attributs dans `index.html` :

```html
<a class="live-pill" ... data-countdown="2026-09-17T20:00:00+02:00" data-label="Voile Bleue">
<div class="hero-countdown reveal" data-countdown-target="2026-09-17T20:00:00+02:00">
```

Changer la date ISO (avec le fuseau `+02:00` ou `+01:00` en hiver) et le
texte de `data-label`. Passé l'heure, le bloc affiche « c'est ce soir »,
puis « terminé » après six heures.

**Agenda.** Section `#agenda`, trois cartes `article.card`. Copier-coller
une carte pour en ajouter une.

**Affiches des soirées.** Section `#soirees` : un lien `a.poster` par
affiche, l'image dans `assets/`. `data-title` et `data-sub` alimentent la
légende et la visionneuse.

**Partenaires.** Deux endroits : le mur de logos (`.logos-row`, deux rangées)
et la grille filtrable (`.perk`). L'attribut `data-cat` d'un `.perk` doit
valoir `sortir`, `manger`, `quotidien` ou `festival` pour le filtre.

**Chiffres.** Section `.stats`, attribut `data-count` sur chaque `span`.

**Formulaire de contact.** Même endpoint Formspree que le site actuel
(`action` du `<form>`). L'envoi se fait sans rechargement ; en cas d'échec
réseau le visiteur voit l'adresse mail.

## Notes techniques

- Polices Google Fonts (Cinzel, Inter) avec repli sur Georgia et la police système.
- `prefers-reduced-motion` respecté : braises, curseur, bandeaux et tilt désactivés.
- Une seule boucle `requestAnimationFrame` pilote tout, mise en pause quand l'onglet est caché.
- Aucune dépendance, aucun build : ouvrir `index.html` suffit.
