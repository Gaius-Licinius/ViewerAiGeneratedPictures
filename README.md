# AI Image Viewer

A local web-based viewer for AI-generated images with metadata extraction and zero-chrome glass-style UI.

## Features

- Multi-format PNG metadata extraction (A1111, ComfyUI, NovelAI)
- Three view modes: random wall, grid with date separators, fullscreen with filmstrip
- Filters: prompt search, model selection, NSFW toggle, favorites
- Glass-morphism zero-chrome interface with auto-hiding controls
- Accessible on local network

## Usage

```bash
cd viewer
python server.py
```

Open `http://localhost:8080` in your browser.

Edit `viewer/config.json` to change the collection path and NSFW keywords.
