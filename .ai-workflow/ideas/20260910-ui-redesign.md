---
title: Refonte UI Aurora Glass 2.0
date: 2026-09-10
status: in-progress
tags: [css, ui, viewer, web-app]
---

# Refonte UI Aurora Glass 2.0

## Problème

L'interface du viewer est fonctionnelle et cohérente (dark + glassmorphism,
accent indigo `#6366f1`) mais visuellement datée : profondeur limitée, effets
de survol basiques (mise à l'échelle de la tuile entière), typographie
générique, aucun aperçu du prompt ni des métadonnées sur les vignettes, et
des composants natifs (checkboxes, modal centré) qui détonnent avec l'esprit
glass. L'objectif est de rendre l'expérience plus moderne et agréable sans
sacrifier la lisibilité ni la performance.

## Core Idea

Faire évoluer l'ADN glassmorphism vers « Aurora Glass 2.0 » : fond aurora
dégradé subtil (violet → rose, cyan en tertiaire), ombres multi-couches,
micro-interactions soignées, overlay d'informations au survol des vignettes,
drawer latéral pour les détails, et migration des icônes Unicode vers des
SVG locaux. Aucune dépendance réseau : police système et icônes embarquées.

## Key Insights

- Direction retenue : **Aurora Glass 2.0** (vs Editorial Minimal, Immersive,
  Neo-brutalist). Accent dégradé `#8b5cf6 → #ec4899`, cyan `#22d3ee`.
- Périmètre : CSS + DOM/JS léger. Pas de refonte fonctionnelle.
- Police système uniquement (app locale, potentiellement hors ligne).
- Le repo documente déjà deux pièges à respecter :
  - `20260605-unicode-vs-svg-icons` : préférer les SVG aux caractères Unicode.
  - `20260603-cache-busting-masks-css-fixes` : itérer sur le CSS avec un
    cache navigateur agressif ; vérifier via HTTP et bumper les URLs.
- `backdrop-filter` doit rester limité au chrome (contrôles, overlays) pour
  préserver la performance sur les grandes collections.
- `prefers-reduced-motion` doit couper toutes les animations décoratives.

## Open Questions

- (aucune)

## Possible Directions

- **Aurora Glass 2.0** (retenue) — évolution du glass existant, dégradés et
  halos lumineux, overlay prompt, drawer détails.
- Editorial Minimal — monochrome, typographie display, sans glass.
- Immersive / Photos — chrome quasi invisible, dock flottant.
- Neo-brutalist — bordures marquées, couleurs vives.

## Related Documents

- .ai-workflow/plans/20260910-ui-redesign.md
