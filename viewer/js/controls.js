'use strict';

export class Controls {
  constructor(app) {
    this.app = app;
    this._hideTimer = null;
  }

  showSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.classList.remove('hidden');
  }

  hideSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.classList.add('hidden');
  }

  setupAutoHide() {
    const controls = document.getElementById('controls');
    const isTouch = 'ontouchstart' in window;

    const showControls = () => {
      controls.classList.remove('hidden');
      clearTimeout(this._hideTimer);
      if (!isTouch) {
        this._hideTimer = setTimeout(() => {
          controls.classList.add('hidden');
        }, 3000);
      }
    };

    document.addEventListener('mousemove', showControls);
    document.addEventListener('click', showControls);
    document.addEventListener('keydown', showControls);
    document.addEventListener('touchstart', showControls);
    showControls();
  }

  setMode(mode, instant = false) {
    const apply = () => {
      this.app.currentMode = mode;
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(`btn-${mode}`).classList.add('active');
      const modes = document.querySelector('.view-modes');
      if (modes) modes.dataset.mode = mode;

      if (mode === 'wall') {
        this.app.wall.render();
      } else if (mode === 'grid') {
        this.app.grid.render();
      }
    };

    if (!instant && document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }

  toggleBrowserFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  bindEvents() {
    document.getElementById('search').addEventListener('input', () => this.app.store.onFilterChange());
    document.getElementById('model-filter').addEventListener('change', () => this.app.store.onFilterChange());
    document.getElementById('nsfw-toggle').addEventListener('change', () => this.app.store.onFilterChange());
    document.getElementById('fav-toggle').addEventListener('change', () => this.app.store.onFilterChange());

    document.getElementById('btn-wall').addEventListener('click', () => this.setMode('wall'));
    document.getElementById('btn-grid').addEventListener('click', () => this.setMode('grid'));
    document.getElementById('btn-fullscreen').addEventListener('click', () => this.toggleBrowserFullscreen());

    document.getElementById('btn-rescan').addEventListener('click', () => {
      if (confirm('Rescan the collection? This will reload metadata for all images.')) {
        this.app.store.rescanCollection();
      }
    });

    document.getElementById('fs-close').addEventListener('click', () => this.app.fullscreen.close());
    document.getElementById('fs-info').addEventListener('click', () => this.app.details.open());
    document.getElementById('fs-fav').addEventListener('click', () => {
      const img = this.app.filteredImages[this.app.fsIndex];
      if (img) {
        this.app.store.toggleFavorite(img.id);
        document.getElementById('fs-fav').classList.toggle('active', this.app.favorites.has(img.id));
      }
    });

    document.getElementById('details-close').addEventListener('click', () => this.app.details.close());
    document.getElementById('details-popup').addEventListener('click', (e) => {
      if (e.target === document.getElementById('details-popup')) this.app.details.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        const tag = document.activeElement.tagName;
        if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          this.toggleBrowserFullscreen();
          return;
        }
      }
      if (this.app.fsIndex >= 0) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.app.fullscreen.navigate(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.app.fullscreen.navigate(1); }
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          if (this.app.slideshowActive) {
            this.app.slideshow.togglePause();
          } else {
            this.app.slideshow.start();
          }
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          if (this.app.zoomLevel > 1.01) {
            this.app.zoom.reset();
          } else if (this.app.slideshowActive) {
            this.app.slideshow.stop();
          } else {
            this.app.fullscreen.close();
          }
        }
      }
    });

    document.getElementById('fullscreen-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('fullscreen-overlay')) {
        this.app.fullscreen.close();
      }
    });

    document.getElementById('fs-slideshow').addEventListener('click', () => {
      if (this.app.slideshowActive) {
        this.app.slideshow.stop();
      } else {
        this.app.slideshow.start();
      }
    });

    document.getElementById('fs-speed').addEventListener('change', (e) => {
      this.app.slideshowInterval = parseInt(e.target.value) * 1000;
      if (this.app.slideshowActive && !this.app.slideshowPaused) {
        this.app.slideshow._clearTimer();
        this.app.slideshow._startTimer();
      }
    });

    document.getElementById('fs-shuffle').addEventListener('click', () => {
      this.app.slideshowShuffle = !this.app.slideshowShuffle;
      if (this.app.slideshowActive) {
        this.app.slideshow._buildOrder();
        this.app.slideshowPos = this.app.slideshowOrder.indexOf(this.app.fsIndex);
        if (this.app.slideshowPos < 0) this.app.slideshowPos = 0;
        this.app.slideshow._preloadNext(3);
      }
      this.app.slideshow.updateUi();
    });

    document.getElementById('ss-pause').addEventListener('click', () => {
      this.app.slideshow.togglePause();
    });

    document.getElementById('fullscreen-overlay').addEventListener('mousemove', () => {
      if (this.app.slideshowActive) {
        this.app.slideshow.showKioskControls();
        clearTimeout(this.app.slideshow._kioskHideTimer);
        this.app.slideshow._kioskHideTimer = setTimeout(() => this.app.slideshow.hideKioskControls(), 3000);
      }
    });

    const zoomContainer = document.getElementById('fs-zoom-container');
    zoomContainer.addEventListener('wheel', (e) => this.app.zoom.handleWheel(e), { passive: false });
    zoomContainer.addEventListener('dblclick', (e) => this.app.zoom.handleDblClick(e));
    zoomContainer.addEventListener('mousedown', (e) => this.app.zoom.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.app.zoom.handleMouseMove(e));
    document.addEventListener('mouseup', () => this.app.zoom.handleMouseUp());

    zoomContainer.addEventListener('touchstart', (e) => this.app.touch.handleStart(e), { passive: false });
    zoomContainer.addEventListener('touchmove', (e) => this.app.touch.handleMove(e), { passive: false });
    zoomContainer.addEventListener('touchend', (e) => this.app.touch.handleEnd(e));
    zoomContainer.addEventListener('touchcancel', (e) => this.app.touch.handleEnd(e));
  }
}
