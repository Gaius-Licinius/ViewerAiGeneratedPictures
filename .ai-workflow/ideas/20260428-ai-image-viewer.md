---
title: Viewer Web d'Images Générées par IA
date: 2026-04-28
status: done
tags: [ai-images, metadata, nsfw-detection, viewer, web-app]
---

# Viewer Web d'Images Générées par IA

## Problème

Le viewer Windows est peu fiable (navigation qui bloque), ne permet pas de naviguer
à travers les sous-dossiers, et n'exploite pas les métadonnées Stable Diffusion
intégrées dans les PNG. La collection (~1268 images, 64 dossiers organisés par date
dans C:\IA\Collection) est difficile à parcourir et filtrer efficacement.

## Core Idea

Une application web légère, en lecture seule, qui scanne C:\IA\Collection, extrait les
métadonnées SD des PNG (prompt, modèle, seed, steps, etc.) et offre un viewer
multi-mode avec filtres et navigation cross-dossiers. Accès local + réseau local.

## Principes UI

- **Zéro chrome** : interfaces glass-style (transparence + flou), contrôles
  apparaissent au survol et disparaissent. L'image est toujours au centre.
- **Vue par défaut** : mur infini (toutes les images), clic → zoom instantané
  en mode plein écran + filmstrip (miniatures en bas).
- **Modes de navigation** : bascule entre mur infini, grille, et plein écran + filmstrip.

## Fonctionnalités clés

- **Filtres** : par modèle IA (extrait des métadonnées), recherche texte dans les prompts
- **Détection NSFW** : analyse automatique du prompt via une liste de mots-clés
  prédéfinie et configurable ; toggle pour afficher/masquer les images NSFW
- **Favoris** : système de marquage pour retrouver rapidement des images
- **Navigation fluide** : clavier et souris, aucun blocage entre les images

## Key Insights

- Toutes les métadonnées nécessaires sont déjà intégrées dans les PNG (chunk tEXt "parameters")
- La détection NSFW par mots-clés sur le prompt est simple et suffisante
- L'UI zéro chrome maximise l'immersion dans l'image
- Architecture lecture seule — aucune modification de la collection source

## Open Questions

- (aucune)

## Possible Directions

- Une SPA légère (type framework minimaliste) servie localement, accédant aux
  fichiers via une API backend légère
- Ou une app desktop avec webview intégrée pour éviter de lancer un serveur

## Related Documents

- .ai-workflow/plans/20260428-ai-image-viewer.md
- .ai-workflow/learnings/20260428-test-via-http.md
- .ai-workflow/learnings/20260428-css-columns-fixed-height.md
- .ai-workflow/learnings/20260428-multi-format-png-metadata.md
- .ai-workflow/learnings/20260428-shared-config-file.md
