'use strict';
import { shuffle } from './utils.js';

export class Slideshow {
  constructor(app) {
    this.app = app;
    this._kioskHideTimer = null;
  }

  start() {
    if (this.app.fsIndex < 0 || this.app.filteredImages.length < 1) return;
    this.app.zoom.reset();
    this.app.slideshowActive = true;
    this.app.slideshowPaused = false;
    this._buildOrder();
    this.app.slideshowPos = this.app.slideshowOrder.indexOf(this.app.fsIndex);
    if (this.app.slideshowPos < 0) this.app.slideshowPos = 0;
    this._enterKioskMode();
    this.updateUi();
    this._preloadNext(3);
    this._startTimer();
  }

  stop() {
    if (!this.app.slideshowActive) return;
    this.app.slideshowActive = false;
    this.app.slideshowPaused = false;
    this._clearTimer();
    this._exitKioskMode();
    this.updateUi();
    this.app.fullscreen.renderFilmstrip();
  }

  togglePause() {
    if (!this.app.slideshowActive) return;
    this.app.slideshowPaused = !this.app.slideshowPaused;
    if (this.app.slideshowPaused) {
      this._pauseTimer();
      this._exitKioskMode();
    } else {
      this.app.zoom.reset();
      this._enterKioskMode();
      this._resumeTimer();
    }
    this.updateUi();
  }

  _buildOrder() {
    const indices = this.app.filteredImages.map((_, i) => i);
    this.app.slideshowOrder = this.app.slideshowShuffle ? shuffle([...indices]) : indices;
  }

  _clearTimer() {
    if (this.app._slideshowTimer) {
      clearTimeout(this.app._slideshowTimer);
      this.app._slideshowTimer = null;
    }
    if (this.app._progressRaf) {
      cancelAnimationFrame(this.app._progressRaf);
      this.app._progressRaf = null;
    }
    const fill = document.getElementById('ss-progress-fill');
    if (fill) fill.style.width = '0%';
  }

  _pauseTimer() {
    if (this.app._slideshowTimer) {
      clearTimeout(this.app._slideshowTimer);
      this.app._slideshowTimer = null;
    }
    if (this.app._progressRaf) {
      cancelAnimationFrame(this.app._progressRaf);
      this.app._progressRaf = null;
    }
    this.app._progressRemaining = Math.max(0, this.app._progressStart + this.app.slideshowInterval - Date.now());
  }

  _resumeTimer() {
    const remaining = Math.max(0, this.app._progressRemaining || this.app.slideshowInterval);
    this.app._progressStart = Date.now() - (this.app.slideshowInterval - remaining);
    this._animateProgress();
    this.app._slideshowTimer = setTimeout(() => this._next(), remaining);
  }

  _startTimer() {
    this.app._progressStart = Date.now();
    this._animateProgress();
    this.app._slideshowTimer = setTimeout(() => this._next(), this.app.slideshowInterval);
  }

  _animateProgress() {
    const update = () => {
      const elapsed = Date.now() - this.app._progressStart;
      const pct = Math.min((elapsed / this.app.slideshowInterval) * 100, 100);
      const fill = document.getElementById('ss-progress-fill');
      if (fill) fill.style.width = pct + '%';
      if (pct < 100 && this.app.slideshowActive && !this.app.slideshowPaused) {
        this.app._progressRaf = requestAnimationFrame(update);
      }
    };
    this.app._progressRaf = requestAnimationFrame(update);
  }

  _next() {
    if (!this.app.slideshowActive || this.app.slideshowPaused) return;
    this.app.slideshowPos = (this.app.slideshowPos + 1) % this.app.slideshowOrder.length;
    this.app.fsIndex = this.app.slideshowOrder[this.app.slideshowPos];
    this.app.fullscreen.update();
    this._preloadNext(3);
    this._startTimer();
  }

  _preloadNext(count) {
    for (let i = 1; i <= count; i++) {
      const idx = (this.app.slideshowPos + i) % this.app.slideshowOrder.length;
      const imgIdx = this.app.slideshowOrder[idx];
      const img = this.app.filteredImages[imgIdx];
      if (img) {
        const preload = new Image();
        preload.src = `/images/${img.rel_path}`;
      }
    }
  }

  _enterKioskMode() {
    const overlay = document.getElementById('fullscreen-overlay');
    overlay.classList.add('kiosk-mode');
    document.getElementById('kiosk-controls').classList.remove('hidden');
    this.showKioskControls();
    this._kioskHideTimer = setTimeout(() => this.hideKioskControls(), 3000);
  }

  _exitKioskMode() {
    const overlay = document.getElementById('fullscreen-overlay');
    overlay.classList.remove('kiosk-mode');
    document.getElementById('kiosk-controls').classList.add('hidden');
    if (this._kioskHideTimer) {
      clearTimeout(this._kioskHideTimer);
      this._kioskHideTimer = null;
    }
    const fill = document.getElementById('ss-progress-fill');
    if (fill) fill.style.width = '0%';
  }

  showKioskControls() {
    const ctrl = document.getElementById('kiosk-controls');
    ctrl.classList.add('visible');
    ctrl.classList.remove('fading');
  }

  hideKioskControls() {
    const ctrl = document.getElementById('kiosk-controls');
    ctrl.classList.add('fading');
    ctrl.classList.remove('visible');
  }

  updateUi() {
    const btn = document.getElementById('fs-slideshow');
    if (this.app.slideshowActive && !this.app.slideshowPaused) {
      btn.classList.add('active');
      btn.innerHTML = '&#9632;';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<img src="icons/play.svg" width="18" height="18" alt="Play">';
    }
    const pauseBtn = document.getElementById('ss-pause');
    if (pauseBtn) {
      pauseBtn.innerHTML = this.app.slideshowPaused
        ? '<img src="icons/play.svg" width="24" height="24" alt="Play">'
        : '<img src="icons/pause.svg" width="24" height="24" alt="Pause">';
    }
    const shuffleBtn = document.getElementById('fs-shuffle');
    if (shuffleBtn) {
      shuffleBtn.classList.toggle('active', this.app.slideshowShuffle);
    }
  }
}
