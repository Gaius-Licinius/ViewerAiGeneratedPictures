# AI Image Viewer

A local web-based viewer for AI-generated images with metadata extraction and zero-chrome glass-style UI.

## Features

- Multi-format PNG metadata extraction (A1111, ComfyUI, NovelAI, Anima)
- LORA extraction and display in details pop-in (LoraLoader, rgthree Lora Loader Stack, A1111 inline tags)
- Three view modes: random wall, grid with date separators, fullscreen with filmstrip
- Slideshow mode with kiosk view, shuffle, adjustable speed, and progress bar
- Zoom (scroll wheel) and pan (click-drag) in fullscreen
- Filters: prompt search, model selection, NSFW toggle, favorites
- Copy buttons for positive prompt, negative prompt, and seed
- Glass-morphism zero-chrome interface with auto-hiding controls
- Browser fullscreen toggle (F key or toolbar button)
- Accessible on local network

## Mobile access

The viewer is responsive and works on phones and tablets. Connect a device on the same local network:

1. Launch the server on your PC as usual
2. Check the console output for the network URL (e.g. `http://192.168.1.42:8080`)
3. Open that URL in your phone's browser

**Touch gestures:**
- **Tap** — toggle controls visibility
- **Double-tap** — zoom in/out
- **Pinch** — zoom in/out
- **Swipe left/right** — navigate between images in fullscreen
- On Android, use "Add to home screen" for an app-like experience

## Usage

### Quick launch (Windows)

Double-click `launch.bat` at the project root. Starts the server and opens the viewer automatically.

### Manual launch

```bash
cd viewer
python server.py
```

Open `http://localhost:8080` in your browser.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `F` | Toggle browser fullscreen |
| `ArrowLeft` / `ArrowRight` | Previous / next image (fullscreen) |
| `Space` | Slideshow play/pause |
| `Escape` | Reset zoom → stop slideshow → close fullscreen |

## Configuration

Edit `viewer/config.json` to change the collection path and NSFW keywords.
