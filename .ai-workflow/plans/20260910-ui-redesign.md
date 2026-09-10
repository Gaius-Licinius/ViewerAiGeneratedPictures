---
title: Refonte UI Aurora Glass 2.0
date: 2026-09-10
status: in-progress
ideas:
  - .ai-workflow/ideas/20260910-ui-redesign.md
group: ui-redesign
phase: 1
tags: [css, ui, viewer, web-app]
---

# Refonte UI Aurora Glass 2.0

## Goal

Le viewer adopte une identité visuelle « Aurora Glass 2.0 » : fond aurora
dégradé, accent violet → rose, composants custom (switchs, segmented control,
drawer détails), aperçu du prompt au survol des vignettes, et micro-
interactions soignées. Toutes les fonctionnalités existantes restent
identiques, sans aucune dépendance réseau nouvelle.

## Background

L'UI actuelle est décrite dans `.ai-workflow/ideas/20260910-ui-redesign.md`.
Le frontend est découpé en CSS par composant (`viewer/css/`), HTML statique
(`viewer/index.html`) et modules ES (`viewer/js/`). Le serveur envoie
`Cache-Control: no-cache` pour les assets statiques (`viewer/server.py:38-42`),
mais les URLs n'ont pas de query de version.

## Research Summary

- **Tokens actuels** : `viewer/css/base.css:1-12` — fond `#0a0a0a`, accent
  `#6366f1`, rayon 12px, glass rgba(18,18,18,.75).
- **Contrôles** : markup `viewer/index.html:23-47`, styles
  `viewer/css/controls.css`, mode piloté par `.active` dans
  `viewer/js/controls.js:40-50`.
- **Vignettes** : `viewer/js/wall.js:21-50` et `viewer/js/grid.js:42-67`
  créent les tuiles ; champs disponibles : `prompt`, `model`, `steps`, `seed`.
  Le mur affiche 20 images aléatoires, la grille charge ses miniatures via
  IntersectionObserver (`grid.js:17-29`).
- **Plein écran** : `viewer/css/fullscreen.css` (barre top-right, filmstrip)
  et `viewer/css/slideshow.css` (kiosque, progression).
- **Détails** : contenu généré dans `viewer/js/details.js:30-72`, modal centré
  stylé dans `viewer/css/details.css`.
- **Apprentissages repo** :
  - `20260605-unicode-vs-svg-icons` — remplacer ℹ ♥ × 📋 📁 par des SVG.
  - `20260603-cache-busting-masks-css-fixes` — vérifier via HTTP et versionner
    les assets.
  - `20260603-windows-select-dropdown-css-failures` — ne pas forcer `color`
    sur `.glass-input` (options illisibles sous Windows).
- **Compatibilité** : cible Chrome/Edge récents. `:has()` évité au profit
  d'un attribut `data-mode` piloté en JS. View Transitions API utilisée avec
  feature detection.

## Steps

### 1. Design tokens — `viewer/css/base.css` (lignes 1-74)

- Remplacer le bloc `:root` (1-12) par la palette Aurora :
  `--bg: #07070b`, `--accent: #8b5cf6`, `--accent-2: #ec4899`,
  `--accent-3: #22d3ee`, `--accent-gradient: linear-gradient(135deg, ...)`,
  `--glass-bg: rgba(16,16,24,0.62)`, `--glass-highlight` (liseré interne),
  échelle de rayons (`--radius-sm/md/lg/pill`), ombres
  (`--shadow-sm/md/lg`), `--glow`.
- Ajouter un fond aurora : `body::before` fixe, plein écran, trois
  `radial-gradient` flous (violet, rose, cyan) en faible opacité, avec une
  dérive lente (`@keyframes aurora-drift`, 30s+) et `pointer-events: none`.
- Typographie : conserver la pile système, ajouter `-webkit-font-smoothing:
  antialiased`, `text-rendering: optimizeLegibility`, couleur de sélection et
  anneau `:focus-visible` global.
- Redessiner le spinner (63-70) en anneau conique dégradé.
- Ajouter en fin de fichier un bloc `@media (prefers-reduced-motion: reduce)`
  qui coupe animations et transitions décoratives.

### 2. Barre de contrôles — `viewer/index.html` (23-47), `viewer/css/controls.css`, `viewer/css/mobile.css`

- `index.html` :
  - Envelopper la recherche dans `.search-field` avec une icône loupe SVG
    inline (`fill="currentColor"`), garder l'`id="search"`.
  - Remplacer les `<label class="toggle-label">` NSFW/Favoris par des switchs
    custom : `.switch` > `input[type=checkbox]` (ids inchangés) +
    `.switch-track` > `.switch-thumb` + `.switch-label`.
  - Ajouter `data-mode="wall"` sur `.view-modes`.
- `controls.css` :
  - Capsule glass : rayon `--radius-lg`, liseré interne via
    `box-shadow: var(--glass-highlight)`, ombre `--shadow-lg`.
  - `.glass-input` : supprimer tout `color` forcé (cf. apprentissage Windows),
    ajouter anneau de focus dégradé (`box-shadow` accent + glow).
  - `.search-field` : conteneur relatif, icône positionnée, input sans bord.
  - Styles `.switch` complets (piste 34×20, pouce 16px, transition, état
    `:checked` en dégradé accent).
  - Segmented control : indicateur glissant en pseudo-élément positionné via
    `.view-modes[data-mode="grid"]`, boutons au-dessus (`z-index`), état actif
    sans bordure (l'indicateur porte le fond).
  - Compteur `#image-count` en pill discrète.
- `controls.js` (40-50) : dans `setMode()`, poser
  `document.querySelector('.view-modes').dataset.mode = mode`.
- `mobile.css` : adapter tailles des switchs et du segmented control,
  conserver les règles existantes de repli.

### 3. Mur & grille — `viewer/js/wall.js` (21-50), `viewer/js/grid.js` (42-67), `viewer/css/viewer.css`

- JS : conserver la tuile telle quelle (image + bouton favori glass). Aucun
  overlay d'informations au survol : le prompt et les métadonnées ne
  s'affichent que dans la pop-in détails.
- JS : fade-in au chargement — ajouter la classe `loaded` sur la tuile dans
  `imgEl.onload` (mur) et dans le callback IntersectionObserver (grille).
- `viewer.css` :
  - `.wall-item` / `.grid-item` : rayon `--radius`, liseré glass, ombre
    `--shadow-sm`, transition `translateY` au survol.
  - Image : `transform: scale(1.06)` **interne** au survol (plus la tuile).
  - `.fav-indicator` : bouton circulaire glass en haut à droite, cœur plein
    en accent quand `.favorited`.
  - `.date-separator` : `position: sticky; top: 0`, fond glass flouté, taille
    réduite, barre d'accent dégradée à gauche.
  - Skeleton shimmer sur les tuiles non chargées, coupé par
    `prefers-reduced-motion`.
- `mobile.css` : overlay toujours visible sur tactile (déjà le cas pour le
  favori), ajustements de tailles.

### 4. Plein écran & diaporama — `viewer/css/fullscreen.css`, `viewer/css/slideshow.css`

- Barre d'outils : capsule glass avec ombre, boutons ronds 36px, hover glass,
  état actif en dégradé (`#fs-slideshow.active`, `#fs-shuffle.active`,
  `#fs-fav.active`).
- Filmstrip : `mask-image` linéaire pour fondre les bords, vignettes rayon
  10px, active bordure dégradée + halo + `scale(1.06)`.
- Badge zoom en pill glass, barre de progression en dégradé accent avec glow.
- Bouton pause kiosque : glass + halo.
- Migration des icônes Unicode vers SVG dans `index.html` (57-69) :
  créer `viewer/icons/info-circle.svg`, `heart.svg`, `heart-fill.svg`,
  `x-lg.svg`, `clipboard.svg`, `folder2-open.svg` (paths Bootstrap Icons,
  couleur via `filter`), remplacer les caractères `&#9432;`, `&#9829;`,
  `&times;`, `&#128203;`, `&#128194;`.

### 5. Détails en pop-in centrée — `viewer/index.html` (88-93), `viewer/js/details.js`, `viewer/css/details.css`

- Conserver le markup `.details-popup` > `.details-card` (aucun changement
  structurel requis).
- `details.css` : pop-in centrée (comme l'original), largeur max 560px,
  `max-height: 82vh`, rayon complet, entrée par
  `transform: translateY(14px) scale(0.97)` → `scale(1)` + fondu de l'overlay.
- En-tête `.details-header` : titre « Image Details » à gauche, bouton fermer
  aligné dans le même bandeau à droite (plus de positionnement absolu, donc
  plus de chevauchement possible avec les boutons copier).
- `details.js` (47-66) : ajouter une barre de force sous chaque badge LORA
  (`<span class="lora-bar"><span class="lora-bar-fill" style="width:X%">`),
  largeur calculée depuis `model_strength` (clamp 0 → 1.5).
- Retravailler les boutons copier (taille, état `copied` en accent) et le
  bouton « Show in folder » (outline dégradé).
- `mobile.css` : pop-in à 94% de largeur, `max-height: 86vh`, rayon conservé.

### 6. Finitions

- `viewer/js/controls.js` : envelopper le changement de vue dans
  `document.startViewTransition` si disponible (feature detection, fallback
  synchrone) pour Wall ↔ Grille.
- `viewer/manifest.json` : `background_color` et `theme_color` → `#07070b`.
- `viewer/index.html` : ajouter `?v=3` aux liens CSS et au script module
  (cache-busting, cf. apprentissage).
- Vérifier `prefers-reduced-motion` sur toutes les animations ajoutées.

## Acceptance Criteria

- [ ] Le fond aurora et l'accent violet → rose sont visibles sur les trois
      vues (mur, grille, plein écran)
- [ ] Les switchs NSFW/Favoris et le segmented control fonctionnent comme
      avant (filtres et bascule de vue inchangés)
- [ ] Aucun overlay au survol des vignettes (ni prompt ni métadonnées) ;
      seul le bouton favori reste accessible
- [ ] Les images apparaissent en fade-in ; le shimmer est coupé si
      `prefers-reduced-motion: reduce`
- [ ] Le filmstrip a des bords fondus et une vignette active mise en valeur
- [ ] Les détails s'ouvrent en pop-in centrée sur desktop comme avant ;
      les LORAs ont une barre de force
- [ ] Plus aucun caractère Unicode utilisé comme icône fonctionnelle
- [ ] Aucune erreur console sur les parcours : filtres, favoris, wall,
      grille, plein écran, zoom, diaporama, détails
- [ ] Rendu vérifié desktop 1440px et mobile 375px sans débordement
- [ ] Assets servis à jour vérifiés via HTTP (`Invoke-WebRequest`)
- [ ] Aucune nouvelle dépendance réseau (police système, SVG locaux)

## Dependencies

- Aucune. Branche `implement/ui-redesign` créée depuis `master`.

## Related Documents

- .ai-workflow/ideas/20260910-ui-redesign.md
