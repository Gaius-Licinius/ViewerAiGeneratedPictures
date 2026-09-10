'use strict';

import { ImageStore } from './store.js';
import { Controls } from './controls.js';
import { WallView } from './wall.js';
import { GridView } from './grid.js';
import { FullscreenView } from './fullscreen.js';
import { Slideshow } from './slideshow.js';
import { ZoomHandler } from './zoom.js';
import { TouchHandler } from './touch.js';
import { DetailsPopup } from './details.js';

export class App {
  constructor() {
    this.images = [];
    this.filteredImages = [];
    this.favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
    this.currentMode = 'wall';
    this.fsIndex = -1;
    this.nsfwKeywords = [];

    this.slideshowActive = false;
    this.slideshowPaused = false;
    this.slideshowInterval = 5000;
    this.slideshowShuffle = false;
    this.slideshowOrder = [];
    this.slideshowPos = 0;
    this._slideshowTimer = null;
    this._progressStart = 0;
    this._progressRemaining = 0;
    this._progressRaf = null;

    this.zoomLevel = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.panOffsetStartX = 0;
    this.panOffsetStartY = 0;
    this._zoomBadgeTimer = null;

    this.store = new ImageStore(this);
    this.controls = new Controls(this);
    this.wall = new WallView(this);
    this.grid = new GridView(this);
    this.fullscreen = new FullscreenView(this);
    this.slideshow = new Slideshow(this);
    this.zoom = new ZoomHandler(this);
    this.touch = new TouchHandler(this);
    this.details = new DetailsPopup(this);

    this.init();
  }

  async init() {
    try {
      this.controls.showSpinner();
      await this.store.loadConfig();
      await this.store.loadIndex();
      this.store.detectNsfw();
      this.store.populateModelFilter();
      this.store.applyFilters();
      this.controls.setMode(this.currentMode, true);
      this.controls.bindEvents();
      this.controls.setupAutoHide();
    } catch (err) {
      console.error('Init failed:', err);
    } finally {
      this.controls.hideSpinner();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
