'use strict';

class App {
  constructor() {
    this.images = [];
    this.filteredImages = [];
    this.favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
    this.currentMode = 'wall';
    this.fsIndex = -1;
    this.hideTimer = null;
    this.wallContainer = null;
    this.gridObserver = null;
    this.nsfwKeywords = [];
    this.slideshowActive = false;
    this.slideshowPaused = false;
    this.slideshowTimer = null;
    this.slideshowInterval = 5000;
    this.slideshowShuffle = false;
    this.slideshowOrder = [];
    this.slideshowPos = 0;
    this.progressStart = 0;
    this.progressRemaining = 0;
    this.progressRaf = null;
    this.kioskHideTimer = null;
    this.zoomLevel = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.panOffsetStartX = 0;
    this.panOffsetStartY = 0;
    this.zoomBadgeTimer = null;

    this.init();
  }

  /* ── Initialization ── */
  async init() {
    try {
      this.showSpinner();
      await this.loadConfig();
      await this.loadIndex();
      this.detectNsfw();
      this.populateModelFilter();
      this.applyFilters();
      this.setMode(this.currentMode);
      this.bindEvents();
      this.setupAutoHide();
    } catch (err) {
      console.error('Init failed:', err);
    } finally {
      this.hideSpinner();
    }
  }

  showSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.classList.remove('hidden');
  }

  hideSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.classList.add('hidden');
  }

  async loadConfig() {
    try {
      const res = await fetch('config.json');
      const cfg = await res.json();
      this.nsfwKeywords = cfg.nsfw_keywords || [];
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  formatDateLabel(folder) {
    if (!folder) return '';
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const parts = folder.split('-');
    if (parts.length >= 2) {
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      if (m >= 1 && m <= 12) return `${months[m - 1]} ${y}`;
    }
    return folder;
  }

  /* ── Date separator helper ── */
  makeDateSeparator(label) {
    const sep = document.createElement('div');
    sep.className = 'date-separator';
    sep.textContent = label;
    return sep;
  }

  async loadIndex() {
    try {
      const res = await fetch('index.json');
      this.images = await res.json();
      console.log(`Loaded ${this.images.length} images`);
    } catch (err) {
      console.error('Failed to load index.json:', err);
      this.images = [];
    }
  }

  safeStr(v) {
    return typeof v === 'string' ? v : '';
  }

  detectNsfw() {
    const lowerKeywords = this.nsfwKeywords.map(k => k.toLowerCase());
    for (const img of this.images) {
      const prompt = this.safeStr(img.prompt || '').toLowerCase();
      const negPrompt = this.safeStr(img.negative_prompt || '').toLowerCase();
      const combined = prompt + ' ' + negPrompt;
      img.nsfw = lowerKeywords.some(kw => combined.includes(kw));
    }
  }

  populateModelFilter() {
    const models = [...new Set(this.images.map(i => i.model).filter(Boolean))].sort();
    const select = document.getElementById('model-filter');
    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    }
  }

  /* ── Filters ── */
  applyFilters() {
    const search = (document.getElementById('search').value || '').toLowerCase();
    const model = document.getElementById('model-filter').value;
    const showNsfw = document.getElementById('nsfw-toggle').checked;
    const favOnly = document.getElementById('fav-toggle').checked;

    this.filteredImages = this.images.filter(img => {
      const promptStr = this.safeStr(img.prompt || '');
      if (search && !promptStr.toLowerCase().includes(search)) return false;
      if (model && img.model !== model) return false;
      if (!showNsfw && (img.nsfw || !promptStr.trim())) return false;
      if (favOnly && !this.favorites.has(img.id)) return false;
      return true;
    });

    document.getElementById('image-count').textContent =
      `${this.filteredImages.length} / ${this.images.length} images`;
  }

  onFilterChange() {
    this.applyFilters();
    this.resetRendering();
    this.renderCurrentMode();
  }

  resetRendering() {
    if (this.wallContainer) {
      this.wallContainer.innerHTML = '';
    }
  }

  /* ── Mode switching ── */
  renderCurrentMode() {
    this.setMode(this.currentMode);
  }

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');

    const viewer = document.getElementById('viewer');
    viewer.innerHTML = '';

    this.resetRendering();
    if (mode === 'wall') {
      this.wallContainer = document.createElement('div');
      this.wallContainer.className = 'wall-container';
      viewer.appendChild(this.wallContainer);
      this.renderWallRandom();
    } else if (mode === 'grid') {
      this.renderGrid();
    }
  }

  /* ── Wall (20 random images) ── */
  renderWallRandom() {
    const count = 20;
    const pool = this.filteredImages;
    const picked = this.shuffle([...pool]).slice(0, count);
    const frag = document.createDocumentFragment();

    for (let i = 0; i < picked.length; i++) {
      const img = picked[i];
      const item = document.createElement('div');
      item.className = 'wall-item';
      if (this.favorites.has(img.id)) item.classList.add('favorited');
      item.dataset.id = img.id;

      const promptStr = this.safeStr(img.prompt);
      const imgEl = document.createElement('img');
      imgEl.loading = 'lazy';
      imgEl.src = `/images/${img.rel_path}`;
      imgEl.alt = promptStr ? promptStr.substring(0, 100) : '';

      const favIcon = document.createElement('span');
      favIcon.className = 'fav-indicator';
      favIcon.textContent = this.favorites.has(img.id) ? '\u2665' : '\u2661';
      favIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(img.id);
        favIcon.textContent = this.favorites.has(img.id) ? '\u2665' : '\u2661';
        item.classList.toggle('favorited', this.favorites.has(img.id));
      });

      item.appendChild(imgEl);
      item.appendChild(favIcon);
      const origIndex = this.filteredImages.indexOf(img);
      item.addEventListener('click', () => this.openFullscreen(origIndex));
      frag.appendChild(item);
    }
    this.wallContainer.appendChild(frag);
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ── Grid ── */
  renderGrid() {
    const viewer = document.getElementById('viewer');
    viewer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'grid-container';
    viewer.appendChild(container);

    this.gridObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const idx = parseInt(el.dataset.index);
          const img = this.filteredImages[idx];
          if (img && !el.querySelector('img').src) {
            el.querySelector('img').src = `/images/${img.rel_path}`;
          }
          this.gridObserver.unobserve(el);
        }
      }
    }, { rootMargin: '400px' });

    let lastGroup = null;

    for (let i = 0; i < this.filteredImages.length; i++) {
      const img = this.filteredImages[i];

      const group = img.folder ? img.folder.substring(0, 7) : null;
      if (group && group !== lastGroup) {
        container.appendChild(this.makeDateSeparator(this.formatDateLabel(img.folder)));
        lastGroup = group;
      }

      const item = document.createElement('div');
      item.className = 'grid-item';
      if (this.favorites.has(img.id)) item.classList.add('favorited');
      item.dataset.id = img.id;
      item.dataset.index = i;

      const promptStr = this.safeStr(img.prompt);
      const imgEl = document.createElement('img');
      imgEl.alt = promptStr ? promptStr.substring(0, 100) : '';

      const favIcon = document.createElement('span');
      favIcon.className = 'fav-indicator';
      favIcon.textContent = this.favorites.has(img.id) ? '\u2665' : '\u2661';
      favIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(img.id);
        favIcon.textContent = this.favorites.has(img.id) ? '\u2665' : '\u2661';
        item.classList.toggle('favorited', this.favorites.has(img.id));
      });

      item.appendChild(imgEl);
      item.appendChild(favIcon);
      item.addEventListener('click', () => this.openFullscreen(i));
      container.appendChild(item);

      this.gridObserver.observe(item);
    }
  }

  /* ── Fullscreen ── */
  openFullscreen(filteredIndex) {
    if (this.slideshowActive) this.stopSlideshow();
    this.fsIndex = filteredIndex;
    const overlay = document.getElementById('fullscreen-overlay');
    overlay.classList.remove('hidden');
    this.updateFullscreen();
    this.renderFilmstrip();
    document.body.style.cursor = 'default';
  }

  closeFullscreen() {
    if (this.slideshowActive) this.stopSlideshow();
    this.resetZoom();
    document.getElementById('fullscreen-overlay').classList.add('hidden');
    this.fsIndex = -1;
  }

  /* ── Slideshow ── */
  startSlideshow() {
    if (this.fsIndex < 0 || this.filteredImages.length < 1) return;
    this.resetZoom();
    this.slideshowActive = true;
    this.slideshowPaused = false;
    this.buildSlideshowOrder();
    this.slideshowPos = this.slideshowOrder.indexOf(this.fsIndex);
    if (this.slideshowPos < 0) this.slideshowPos = 0;
    this.enterKioskMode();
    this.updateSlideshowUi();
    this.preloadNext(3);
    this.startSlideTimer();
  }

  stopSlideshow() {
    if (!this.slideshowActive) return;
    this.slideshowActive = false;
    this.slideshowPaused = false;
    this.clearSlideTimer();
    this.exitKioskMode();
    this.updateSlideshowUi();
    this.renderFilmstrip();
  }

  toggleSlideshowPause() {
    if (!this.slideshowActive) return;
    this.slideshowPaused = !this.slideshowPaused;
    if (this.slideshowPaused) {
      this.pauseSlideTimer();
    } else {
      this.resetZoom();
      this.resumeSlideTimer();
    }
    this.updateSlideshowUi();
  }

  buildSlideshowOrder() {
    const indices = this.filteredImages.map((_, i) => i);
    this.slideshowOrder = this.slideshowShuffle ? this.shuffle([...indices]) : indices;
  }

  clearSlideTimer() {
    if (this.slideshowTimer) {
      clearTimeout(this.slideshowTimer);
      this.slideshowTimer = null;
    }
    if (this.progressRaf) {
      cancelAnimationFrame(this.progressRaf);
      this.progressRaf = null;
    }
    const fill = document.getElementById('ss-progress-fill');
    if (fill) fill.style.width = '0%';
  }

  pauseSlideTimer() {
    if (this.slideshowTimer) {
      clearTimeout(this.slideshowTimer);
      this.slideshowTimer = null;
    }
    if (this.progressRaf) {
      cancelAnimationFrame(this.progressRaf);
      this.progressRaf = null;
    }
    this.progressRemaining = Math.max(0, this.progressStart + this.slideshowInterval - Date.now());
  }

  resumeSlideTimer() {
    const remaining = Math.max(0, this.progressRemaining || this.slideshowInterval);
    this.progressStart = Date.now() - (this.slideshowInterval - remaining);
    this.animateProgress();
    this.slideshowTimer = setTimeout(() => this.slideshowNext(), remaining);
  }

  startSlideTimer() {
    this.progressStart = Date.now();
    this.animateProgress();
    this.slideshowTimer = setTimeout(() => this.slideshowNext(), this.slideshowInterval);
  }

  animateProgress() {
    const update = () => {
      const elapsed = Date.now() - this.progressStart;
      const pct = Math.min((elapsed / this.slideshowInterval) * 100, 100);
      const fill = document.getElementById('ss-progress-fill');
      if (fill) fill.style.width = pct + '%';
      if (pct < 100 && this.slideshowActive && !this.slideshowPaused) {
        this.progressRaf = requestAnimationFrame(update);
      }
    };
    this.progressRaf = requestAnimationFrame(update);
  }

  slideshowNext() {
    if (!this.slideshowActive || this.slideshowPaused) return;
    this.slideshowPos = (this.slideshowPos + 1) % this.slideshowOrder.length;
    this.fsIndex = this.slideshowOrder[this.slideshowPos];
    this.updateFullscreen();
    this.preloadNext(3);
    this.startSlideTimer();
  }

  preloadNext(count) {
    for (let i = 1; i <= count; i++) {
      const idx = (this.slideshowPos + i) % this.slideshowOrder.length;
      const imgIdx = this.slideshowOrder[idx];
      const img = this.filteredImages[imgIdx];
      if (img) {
        const preload = new Image();
        preload.src = `/images/${img.rel_path}`;
      }
    }
  }

  enterKioskMode() {
    const overlay = document.getElementById('fullscreen-overlay');
    overlay.classList.add('kiosk-mode');
    document.getElementById('kiosk-controls').classList.remove('hidden');
    this.showKioskControls();
    this.kioskHideTimer = setTimeout(() => this.hideKioskControls(), 3000);
  }

  exitKioskMode() {
    const overlay = document.getElementById('fullscreen-overlay');
    overlay.classList.remove('kiosk-mode');
    document.getElementById('kiosk-controls').classList.add('hidden');
    if (this.kioskHideTimer) {
      clearTimeout(this.kioskHideTimer);
      this.kioskHideTimer = null;
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

  updateSlideshowUi() {
    const btn = document.getElementById('fs-slideshow');
    if (this.slideshowActive) {
      btn.classList.add('active');
      btn.innerHTML = '&#9632;';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '&#9654;';
    }
    const pauseBtn = document.getElementById('ss-pause');
    if (pauseBtn) {
      pauseBtn.innerHTML = this.slideshowPaused ? '&#9654;' : '&#9208;';
    }
    const shuffleBtn = document.getElementById('fs-shuffle');
    if (shuffleBtn) {
      shuffleBtn.classList.toggle('active', this.slideshowShuffle);
    }
  }

  /* ── Zoom ── */
  resetZoom() {
    const img = document.getElementById('fs-image');
    img.classList.add('smooth-zoom');
    this.zoomLevel = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.applyZoomTransform();
    setTimeout(() => img.classList.remove('smooth-zoom'), 310);
  }

  applyZoomTransform() {
    const img = document.getElementById('fs-image');
    const container = document.getElementById('fs-zoom-container');
    if (!img || !container) return;
    const isZoomed = this.zoomLevel > 1.01 || Math.abs(this.offsetX) > 1 || Math.abs(this.offsetY) > 1;
    if (isZoomed) {
      img.style.transform = `translate(calc(-50% + ${this.offsetX}px), calc(-50% + ${this.offsetY}px)) scale(${this.zoomLevel})`;
      container.classList.add('zoomed');
      if (this.isPanning) container.classList.add('panning');
    } else {
      img.style.transform = 'translate(-50%, -50%) scale(1)';
      this.zoomLevel = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      container.classList.remove('zoomed', 'panning');
    }
  }

  showZoomBadge() {
    let badge = document.getElementById('zoom-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'zoom-badge';
      badge.className = 'zoom-badge';
      document.getElementById('fullscreen-overlay').appendChild(badge);
    }
    badge.textContent = Math.round(this.zoomLevel * 100) + '%';
    badge.classList.add('visible');
    if (this.zoomBadgeTimer) clearTimeout(this.zoomBadgeTimer);
    this.zoomBadgeTimer = setTimeout(() => badge.classList.remove('visible'), 1200);
  }

  handleZoomWheel(e) {
    if (this.fsIndex < 0) return;
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.15;
    let newZoom = this.zoomLevel + delta;
    newZoom = Math.min(5, Math.max(1, newZoom));
    if (newZoom === this.zoomLevel) return;

    const img = document.getElementById('fs-image');
    const container = document.getElementById('fs-zoom-container');
    if (!img || !container) return;

    const cRect = container.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    const dx = e.clientX - (iRect.left + iRect.width / 2);
    const dy = e.clientY - (iRect.top + iRect.height / 2);
    const ratio = newZoom / this.zoomLevel;

    this.offsetX = this.offsetX - dx * (ratio - 1) / newZoom;
    this.offsetY = this.offsetY - dy * (ratio - 1) / newZoom;
    this.zoomLevel = newZoom;

    if (newZoom <= 1.01) {
      this.offsetX = 0;
      this.offsetY = 0;
    }

    this.applyZoomTransform();
    this.showZoomBadge();

    if (this.slideshowActive && !this.slideshowPaused) {
      this.toggleSlideshowPause();
    }
  }

  handleZoomDblClick(e) {
    if (this.fsIndex < 0) return;
    e.preventDefault();
    if (this.zoomLevel > 1.01) {
      this.resetZoom();
    } else {
      const img = document.getElementById('fs-image');
      img.classList.add('smooth-zoom');
      this.zoomLevel = 2;
      this.offsetX = 0;
      this.offsetY = 0;
      this.applyZoomTransform();
      setTimeout(() => img.classList.remove('smooth-zoom'), 310);
      this.showZoomBadge();
    }
    if (this.slideshowActive && !this.slideshowPaused) {
      this.toggleSlideshowPause();
    }
  }

  handleZoomMouseDown(e) {
    if (this.fsIndex < 0 || this.zoomLevel <= 1.01) return;
    if (e.button !== 0) return;
    e.preventDefault();
    this.isPanning = true;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.panOffsetStartX = this.offsetX;
    this.panOffsetStartY = this.offsetY;
    this.applyZoomTransform();
    document.body.style.cursor = '';
  }

  handleZoomMouseMove(e) {
    if (!this.isPanning) return;
    const dx = (e.clientX - this.panStartX) / this.zoomLevel;
    const dy = (e.clientY - this.panStartY) / this.zoomLevel;
    this.offsetX = this.panOffsetStartX + dx;
    this.offsetY = this.panOffsetStartY + dy;
    this.applyZoomTransform();
  }

  handleZoomMouseUp() {
    if (!this.isPanning) return;
    this.isPanning = false;
    this.applyZoomTransform();
    document.body.style.cursor = '';
  }

  updateFullscreen() {
    const img = this.filteredImages[this.fsIndex];
    if (!img) return;

    const fsImg = document.getElementById('fs-image');
    fsImg.style.opacity = '0';
    setTimeout(() => {
      fsImg.src = `/images/${img.rel_path}`;
      fsImg.onload = () => {
        fsImg.style.opacity = '1';
        this.resetZoom();
      };
    }, 150);

    const favBtn = document.getElementById('fs-fav');
    favBtn.classList.toggle('active', this.favorites.has(img.id));

    if (!this.slideshowActive) {
      this.renderFilmstrip();
    }
  }

  openInfoPopup(img) {
    const popup = document.getElementById('details-popup');
    const content = document.getElementById('details-content');
    if (!popup || !content) return;

    const info = img || this.filteredImages[this.fsIndex];
    if (!info) return;

    const fields = [
      ['Model', info.model],
      ['Steps', info.steps],
      ['Sampler', info.sampler],
      ['CFG Scale', info.cfg_scale],
      ['Seed', info.seed],
      ['Size', info.size],
      ['Model Hash', info.model_hash],
      ['Version', info.version],
      ['File', info.rel_path],
      ['Folder', info.folder],
    ].filter(([, v]) => v);

    let html = '<h3>Positive Prompt</h3>';
    html += `<div class="prompt-block"><div class="detail-prompt">${this.escHtml(this.safeStr(info.prompt) || '\u2014')}</div>`;
    html += '<button class="copy-btn" title="Copy">Copy</button></div>';

    html += '<h3>Negative Prompt</h3>';
    html += `<div class="prompt-block"><div class="detail-neg">${this.escHtml(this.safeStr(info.negative_prompt) || '\u2014')}</div>`;
    html += '<button class="copy-btn" title="Copy">Copy</button></div>';

    html += '<h3>Parameters</h3><div class="detail-grid">';
    for (const [key, val] of fields) {
      html += `<span class="key">${key}</span>`;
      if (key === 'Seed') {
        html += `<span class="val">${this.escHtml(val)} <button class="copy-btn-inline" data-copy="${this.escHtml(val)}" title="Copy">Copy</button></span>`;
      } else {
        html += `<span class="val">${this.escHtml(val)}</span>`;
      }
    }
    html += '</div>';

    content.innerHTML = html;
    popup.classList.remove('hidden');

    const copyBtns = content.querySelectorAll('.copy-btn');
    const prompts = [this.safeStr(info.prompt), this.safeStr(info.negative_prompt)];
    copyBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => this.copyToClipboard(prompts[i], btn));
    });

    content.querySelectorAll('.copy-btn-inline').forEach((btn) => {
      btn.addEventListener('click', () => this.copyToClipboard(btn.dataset.copy, btn));
    });
  }

  copyToClipboard(text, btn) {
    const done = () => {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 1500);
    };
    navigator.clipboard.writeText(text).then(done).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    });
  }

  closeInfoPopup() {
    const popup = document.getElementById('details-popup');
    if (popup) popup.classList.add('hidden');
  }

  escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  renderFilmstrip() {
    const inner = document.getElementById('filmstrip-inner');
    inner.innerHTML = '';

    const start = Math.max(0, this.fsIndex - 10);
    const end = Math.min(this.filteredImages.length, this.fsIndex + 11);

    for (let i = start; i < end; i++) {
      const img = this.filteredImages[i];
      const thumb = document.createElement('img');
      thumb.className = 'filmstrip-thumb';
      if (i === this.fsIndex) thumb.classList.add('active');
      thumb.src = `/images/${img.rel_path}`;
      const promptStr = this.safeStr(img.prompt);
      thumb.title = promptStr ? promptStr.substring(0, 60) : '';
      thumb.addEventListener('click', () => {
        this.fsIndex = i;
        this.updateFullscreen();
        this.renderFilmstrip();
      });
      inner.appendChild(thumb);
    }

    // scroll active thumb into view
    const active = inner.querySelector('.filmstrip-thumb.active');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  navigateFullscreen(direction) {
    const newIdx = this.fsIndex + direction;
    if (newIdx < 0 || newIdx >= this.filteredImages.length) return;
    this.fsIndex = newIdx;
    this.resetZoom();
    this.updateFullscreen();
    if (!this.slideshowActive) {
      this.renderFilmstrip();
    }
    if (this.slideshowActive) {
      this.slideshowPos = this.slideshowOrder.indexOf(this.fsIndex);
      if (this.slideshowPos < 0) this.slideshowPos = 0;
      this.preloadNext(3);
      if (!this.slideshowPaused) {
        this.clearSlideTimer();
        this.startSlideTimer();
      }
    }
  }

  /* ── Browser fullscreen ── */
  toggleBrowserFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  /* ── Favorites ── */
  toggleFavorite(id) {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
    localStorage.setItem('favorites', JSON.stringify([...this.favorites]));
  }

  /* ── Auto-hide controls ── */
  setupAutoHide() {
    const controls = document.getElementById('controls');
    const showControls = () => {
      controls.classList.remove('hidden');
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        controls.classList.add('hidden');
      }, 3000);
    };

    document.addEventListener('mousemove', showControls);
    document.addEventListener('click', showControls);
    document.addEventListener('keydown', showControls);
    showControls();
  }

  /* ── Events ── */
  bindEvents() {
    document.getElementById('search').addEventListener('input', () => this.onFilterChange());
    document.getElementById('model-filter').addEventListener('change', () => this.onFilterChange());
    document.getElementById('nsfw-toggle').addEventListener('change', () => this.onFilterChange());
    document.getElementById('fav-toggle').addEventListener('change', () => this.onFilterChange());

    document.getElementById('btn-wall').addEventListener('click', () => this.setMode('wall'));
    document.getElementById('btn-grid').addEventListener('click', () => this.setMode('grid'));
    document.getElementById('btn-fullscreen').addEventListener('click', () => this.toggleBrowserFullscreen());

    document.getElementById('fs-close').addEventListener('click', () => this.closeFullscreen());
    document.getElementById('fs-info').addEventListener('click', () => this.openInfoPopup());
    document.getElementById('fs-fav').addEventListener('click', () => {
      const img = this.filteredImages[this.fsIndex];
      if (img) {
        this.toggleFavorite(img.id);
        document.getElementById('fs-fav').classList.toggle('active', this.favorites.has(img.id));
      }
    });

    document.getElementById('details-close').addEventListener('click', () => this.closeInfoPopup());
    document.getElementById('details-popup').addEventListener('click', (e) => {
      if (e.target === document.getElementById('details-popup')) this.closeInfoPopup();
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
      if (this.fsIndex >= 0) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.navigateFullscreen(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.navigateFullscreen(1); }
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          if (this.slideshowActive) {
            this.toggleSlideshowPause();
          } else {
            this.startSlideshow();
          }
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          if (this.zoomLevel > 1.01) {
            this.resetZoom();
          } else if (this.slideshowActive) {
            this.stopSlideshow();
          } else {
            this.closeFullscreen();
          }
        }
      }
    });

    // Click on fullscreen background to close
    document.getElementById('fullscreen-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('fullscreen-overlay')) {
        this.closeFullscreen();
      }
    });

    // Slideshow controls
    document.getElementById('fs-slideshow').addEventListener('click', () => {
      if (this.slideshowActive) {
        this.stopSlideshow();
      } else {
        this.startSlideshow();
      }
    });

    document.getElementById('fs-speed').addEventListener('change', (e) => {
      this.slideshowInterval = parseInt(e.target.value) * 1000;
      if (this.slideshowActive && !this.slideshowPaused) {
        this.clearSlideTimer();
        this.startSlideTimer();
      }
    });

    document.getElementById('fs-shuffle').addEventListener('click', () => {
      this.slideshowShuffle = !this.slideshowShuffle;
      if (this.slideshowActive) {
        this.buildSlideshowOrder();
        this.slideshowPos = this.slideshowOrder.indexOf(this.fsIndex);
        if (this.slideshowPos < 0) this.slideshowPos = 0;
        this.preloadNext(3);
      }
      this.updateSlideshowUi();
    });

    document.getElementById('ss-pause').addEventListener('click', () => {
      this.toggleSlideshowPause();
    });

    // Mouse move in kiosk mode shows controls
    document.getElementById('fullscreen-overlay').addEventListener('mousemove', () => {
      if (this.slideshowActive) {
        this.showKioskControls();
        clearTimeout(this.kioskHideTimer);
        this.kioskHideTimer = setTimeout(() => this.hideKioskControls(), 3000);
      }
    });

    // Zoom events
    const zoomContainer = document.getElementById('fs-zoom-container');
    zoomContainer.addEventListener('wheel', (e) => this.handleZoomWheel(e), { passive: false });
    zoomContainer.addEventListener('dblclick', (e) => this.handleZoomDblClick(e));
    zoomContainer.addEventListener('mousedown', (e) => this.handleZoomMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleZoomMouseMove(e));
    document.addEventListener('mouseup', () => this.handleZoomMouseUp());
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
