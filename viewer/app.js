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

    this.nsfwKeywords = [
      'nsfw', 'nude', 'naked', 'explicit', 'porn', 'hentai',
      'erotic', 'lewd', 'adult', 'nsfw,', 'xxx', 'sex',
      'uncensored', 'topless', 'lingerie', 'bikini', 'nsfw-art',
      'penis', 'fellatio', 'rape', 'cum', 'precum', 'cock'
    ];

    this.init();
  }

  /* ── Initialization ── */
  async init() {
    try {
      this.showSpinner();
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

  detectNsfw() {
    const lowerKeywords = this.nsfwKeywords.map(k => k.toLowerCase());
    for (const img of this.images) {
      const prompt = (img.prompt || '').toLowerCase();
      const negPrompt = (img.negative_prompt || '').toLowerCase();
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
      if (search && !(img.prompt || '').toLowerCase().includes(search)) return false;
      if (model && img.model !== model) return false;
      if (!showNsfw && img.nsfw) return false;
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

      const imgEl = document.createElement('img');
      imgEl.loading = 'lazy';
      imgEl.src = `/images/${img.rel_path}`;
      imgEl.alt = img.prompt ? img.prompt.substring(0, 100) : '';

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
      // Find the original index for fullscreen navigation
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

      const imgEl = document.createElement('img');
      imgEl.alt = img.prompt ? img.prompt.substring(0, 100) : '';

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
    this.fsIndex = filteredIndex;
    const overlay = document.getElementById('fullscreen-overlay');
    overlay.classList.remove('hidden');
    this.updateFullscreen();
    this.renderFilmstrip();
    document.body.style.cursor = 'default';
  }

  closeFullscreen() {
    document.getElementById('fullscreen-overlay').classList.add('hidden');
    this.fsIndex = -1;
  }

  updateFullscreen() {
    const img = this.filteredImages[this.fsIndex];
    if (!img) return;

    const fsImg = document.getElementById('fs-image');
    fsImg.style.opacity = '0';
    setTimeout(() => {
      fsImg.src = `/images/${img.rel_path}`;
      fsImg.onload = () => { fsImg.style.opacity = '1'; };
    }, 150);

    const favBtn = document.getElementById('fs-fav');
    favBtn.classList.toggle('active', this.favorites.has(img.id));
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
    html += `<div class="detail-prompt">${this.escHtml(info.prompt || '—')}</div>`;

    html += '<h3>Negative Prompt</h3>';
    html += `<div class="detail-neg">${this.escHtml(info.negative_prompt || '—')}</div>`;

    html += '<h3>Parameters</h3><div class="detail-grid">';
    for (const [key, val] of fields) {
      html += `<span class="key">${key}</span><span class="val">${this.escHtml(val)}</span>`;
    }
    html += '</div>';

    content.innerHTML = html;
    popup.classList.remove('hidden');
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
      thumb.title = img.prompt ? img.prompt.substring(0, 60) : '';
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
    this.updateFullscreen();
    this.renderFilmstrip();
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
      if (this.fsIndex >= 0) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.navigateFullscreen(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.navigateFullscreen(1); }
        if (e.key === 'Escape') { e.preventDefault(); this.closeFullscreen(); }
      }
    });

    // Click on fullscreen background to close
    document.getElementById('fullscreen-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('fullscreen-overlay')) {
        this.closeFullscreen();
      }
    });
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
