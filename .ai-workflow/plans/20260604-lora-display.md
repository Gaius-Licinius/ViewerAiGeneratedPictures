---
title: Affichage des LORAs dans la pop-in détails
date: 2026-06-04
status: ready
ideas:
  - .ai-workflow/ideas/20260604-lora-display.md
group: ai-image-viewer
phase: 2
tags: [ai-images, lora, metadata, viewer]
---

# Affichage des LORAs dans la pop-in détails

## Goal

La pop-in détails (bouton "i" en mode plein écran) affiche désormais la liste
des LORAs utilisés pour générer l'image : nom du fichier, force modèle, force clip.
Le champ `loras` est ajouté au pipeline complet backend → index.json → frontend.

## Background

Contexte complet dans `.ai-workflow/ideas/20260428-ai-image-viewer.md` (Core).
Actuellement seuls Model, Steps, Sampler, CFG, Seed, Size, Model Hash, Version,
File et Folder sont affichés. Les LORAs sont présents dans les métadonnées PNG
(ComfyUI `LoraLoader`, `Lora Loader Stack (rgthree)`) mais ignorés.

## Research Summary

- **3 formats de LORA identifiés** dans la collection et les standards :
  1. **ComfyUI `LoraLoader`** : node avec `lora_name` (str), `strength_model` (float), `strength_clip` (float)
  2. **ComfyUI `Lora Loader Stack (rgthree)`** : node custom avec 4 slots `lora_01`-`lora_04` + `strength_01`-`strength_04`
  3. **A1111 inline** : balises `<lora:name:weight>` dans le prompt (non trouvé dans la collection actuelle mais à supporter)
- Le `workflow` chunk ComfyUI peut être un objet dict OU un array list — le parser doit gérer les deux.
- La pop-in détails est dans `app.js:662-712` (`openInfoPopup`), le parsing dans `server.py:151-199` (A1111) et `server.py:202-314` (ComfyUI).

## Steps

### 1. Ajouter l'extraction LORA dans le parser ComfyUI

**Fichier** : `viewer/server.py` lignes 202-275 (`parse_comfyui_json`)

- Après l'extraction du model (après la boucle CheckpointLoaderSimple, ligne 283-291), ajouter une boucle de détection des nodes LORA
- Détecter les nodes dont `class_type` contient `LoraLoader` (incluant `LoraLoaderModelOnly`)
- Pour chaque `LoraLoader` : extraire `lora_name`, `strength_model`, `strength_clip`
- Détecter les nodes dont `class_type` contient `Lora Loader Stack`
- Pour rgthree : itérer `lora_01` à `lora_04`, extraire nom + `strength_0X`
- Ignorer les valeurs `None` ou chaînes vides
- Gérer le cas où `wf` est un array (workflow brut) en tentant `json.loads` et en vérifiant si c'est un dict ou une liste de dicts
- Ajouter le champ `"loras"` dans le dict retourné : `[{name, model_strength, clip_strength}]`

### 2. Ajouter l'extraction LORA dans le parser A1111

**Fichier** : `viewer/server.py` lignes 151-199 (`parse_parameters_a1111`)

- Dans la fonction, scanner `prompt` (le prompt original) avec une regex pour `<lora:([^:>]+):([^>]+)>`
- Extraire nom et poids pour chaque correspondance
- Pour les LORAs inline A1111 : `model_strength` = `clip_strength` = weight
- Ajouter le champ `"loras"` dans le dict retourné

### 3. Mettre à jour le modèle de données

**Fichier** : `viewer/server.py`

- `empty_metadata()` (lignes 431-436) : ajouter `"loras": []`
- `scan_collection()` (lignes 463-478) : inclure `"loras": parsed.get("loras", [])` dans chaque entrée
- `parse_novelai()` (lignes 355-394) : pas d'extraction LORA, le champ par défaut est déjà via `empty_metadata()`
- Fallback (lignes 418-426) : idem

### 4. Afficher les LORAs dans la pop-in détails

**Fichier** : `viewer/app.js` lignes 662-712 (`openInfoPopup`)

- Après la section Parameters (ligne 698), ajouter une section "LORAs"
- Si `info.loras` existe et n'est pas vide, construire le HTML :
  - Titre "LORAs"
  - Pour chaque LORA : badge avec nom tronqué (sans `.safetensors`) + force
  - Si `model_strength` != `clip_strength`, afficher les deux (ex. `0.5 / 1.0`)
  - Si `model_strength` == `clip_strength`, afficher une seule valeur
  - Si `model_strength` == 0 et `clip_strength` == 0, ajouter classe `.disabled`

### 5. Ajouter les styles CSS pour les badges LORA

**Fichier** : `viewer/style.css` après les styles `.detail-grid` (ligne ~628)

- `.detail-loras` : conteneur flex, gap 6px, margin-top 12px
- `.detail-lora-badge` : inline-flex, padding, border-radius 6px, fond rgba transparent, font-size 13px
- `.detail-lora-badge .lora-name` : max-width 200px, overflow ellipsis, white-space nowrap
- `.detail-lora-badge .lora-strength` : opacity 0.7, font-size 11px
- `.detail-lora-badge.disabled` : opacity 0.4, text-decoration line-through

## Acceptance Criteria

- [ ] Les images ComfyUI avec `LoraLoader` affichent leurs LORAs dans la pop-in (ex. images juin-01)
- [ ] Les images ComfyUI avec `Lora Loader Stack (rgthree)` affichent leurs LORAs (ex. images juin-04)
- [ ] Les LORAs avec force = 0 sont visuellement distincts (grisés/atténués)
- [ ] Les images sans LORA n'affichent pas de section LORA vide
- [ ] Le parsing A1111 inline `<lora:name:weight>` fonctionne
- [ ] L'index.json regénéré contient le champ `loras` pour chaque entrée
- [ ] Aucune régression sur les images sans métadonnées

## Dependencies

- Phase 1 (Core) en état `done`

## Related Documents

- .ai-workflow/ideas/20260428-ai-image-viewer.md
- .ai-workflow/plans/20260428-ai-image-viewer.md
- .ai-workflow/ideas/20260604-lora-display.md
