'use strict';

export class ImageStore {
  constructor(app) {
    this.app = app;
  }

  async loadConfig() {
    try {
      const res = await fetch('config.json?t=' + Date.now());
      const cfg = await res.json();
      this.app.nsfwKeywords = cfg.nsfw_keywords || [];
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  async loadIndex() {
    try {
      const res = await fetch('index.json?t=' + Date.now());
      this.app.images = await res.json();
      console.log(`Loaded ${this.app.images.length} images`);
    } catch (err) {
      console.error('Failed to load index.json:', err);
      this.app.images = [];
    }
  }

  detectNsfw() {
    const lowerKeywords = this.app.nsfwKeywords.map(k => k.toLowerCase());
    for (const img of this.app.images) {
      const prompt = (typeof img.prompt === 'string' ? img.prompt : '').toLowerCase();
      const negPrompt = (typeof img.negative_prompt === 'string' ? img.negative_prompt : '').toLowerCase();
      const combined = prompt + ' ' + negPrompt;
      img.nsfw = lowerKeywords.some(kw => combined.includes(kw));
    }
  }

  populateModelFilter() {
    const models = [...new Set(this.app.images.map(i => i.model).filter(Boolean))].sort();
    const select = document.getElementById('model-filter');
    select.innerHTML = '<option value="">All models</option>';
    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    }
  }

  applyFilters() {
    const search = (document.getElementById('search').value || '').toLowerCase();
    const model = document.getElementById('model-filter').value;
    const showNsfw = document.getElementById('nsfw-toggle').checked;
    const favOnly = document.getElementById('fav-toggle').checked;

    this.app.filteredImages = this.app.images.filter(img => {
      const promptStr = typeof img.prompt === 'string' ? img.prompt : '';
      if (search && !promptStr.toLowerCase().includes(search)) return false;
      if (model && img.model !== model) return false;
      if (!showNsfw && (img.nsfw || !promptStr.trim())) return false;
      if (favOnly && !this.app.favorites.has(img.id)) return false;
      return true;
    });

    document.getElementById('image-count').textContent =
      `${this.app.filteredImages.length} / ${this.app.images.length} images`;
  }

  toggleFavorite(id) {
    if (this.app.favorites.has(id)) {
      this.app.favorites.delete(id);
    } else {
      this.app.favorites.add(id);
    }
    localStorage.setItem('favorites', JSON.stringify([...this.app.favorites]));
  }

  async rescanCollection() {
    if (this.app.slideshowActive) this.app.slideshow.stop();
    if (this.app.fsIndex >= 0) this.app.fullscreen.close();
    const btn = document.getElementById('btn-rescan');
    btn.disabled = true;
    btn.classList.add('spinning');
    try {
      const res = await fetch('/rescan');
      const data = await res.json();
      if (data.ok) {
        console.log(`Rescan complete: ${data.count} images indexed`);
        await this.loadIndex();
        this.detectNsfw();
        this.populateModelFilter();
        this.onFilterChange();
      }
    } catch (err) {
      console.error('Rescan failed:', err);
      alert('Rescan failed. Check the server console.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('spinning');
    }
  }

  onFilterChange() {
    this.applyFilters();
    this.app.setMode(this.app.currentMode);
  }
}
