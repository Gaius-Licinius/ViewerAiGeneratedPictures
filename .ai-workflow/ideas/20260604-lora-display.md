---
title: Affichage des LORAs dans la pop-in détails
date: 2026-06-04
status: planning
tags: [ai-images, lora, metadata, viewer]
---

# Affichage des LORAs dans la pop-in détails

## Problème

La pop-in détails (bouton "i" en plein écran) affiche les paramètres de
génération (Model, Steps, Sampler, CFG, Seed, etc.) mais n'indique pas quels
LORAs ont été utilisés. Sur la collection de juin 2026, 9 images sur 16
utilisent des LORAs. Pour comprendre comment une image a été générée, il
faut connaître les LORA appliqués et leur force.

## Core Idea

Extraire les informations LORA depuis les métadonnées PNG (ComfyUI `LoraLoader`,
`Lora Loader Stack (rgthree)`, et A1111 inline `<lora:name:weight>`) et les
afficher dans la pop-in détails existante, avec distinction visuelle des
LORAs désactivés (force = 0).

## Key Insights

- Trois formats de LORA coexistent dans les métadonnées PNG :
  1. ComfyUI `LoraLoader` : `lora_name`, `strength_model`, `strength_clip`
  2. ComfyUI `Lora Loader Stack (rgthree)` : 4 slots `lora_01`..`lora_04`
  3. A1111 inline : `<lora:name:weight>` dans le prompt
- Certains LORAs ont une force nulle (0.0) — ils sont assignés mais désactivés
- Le champ `workflow` ComfyUI peut être un objet dict ou un array list
- Modification nécessaire sur tout le pipeline : parsing → data model → UI

## Open Questions

- (aucune)

## Possible Directions

- Extraction unique côté backend, champ `loras` dans `index.json`
- Affichage en badges/puces dans la pop-in, grisés si force = 0

## Related Documents

- .ai-workflow/plans/20260604-lora-display.md
