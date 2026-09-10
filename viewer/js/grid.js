'use strict';
import { makeDateSeparator, formatDateLabel, revealTile, HEART_SVG } from './utils.js';

export class GridView {
  constructor(app) {
    this.app = app;
    this.observer = null;
  }

  render() {
    const viewer = document.getElementById('viewer');
    viewer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'grid-container';
    viewer.appendChild(container);

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const idx = parseInt(el.dataset.index);
          const img = this.app.filteredImages[idx];
          const imgEl = el.querySelector('img');
          if (img && imgEl && !imgEl.src) {
            imgEl.src = `/thumb/${img.rel_path}`;
            revealTile(el, imgEl);
          }
          this.observer.unobserve(el);
        }
      }
    }, { rootMargin: '400px' });

    let lastGroup = null;

    for (let i = 0; i < this.app.filteredImages.length; i++) {
      const img = this.app.filteredImages[i];

      const group = img.folder ? img.folder.substring(0, 7) : null;
      if (group && group !== lastGroup) {
        container.appendChild(makeDateSeparator(formatDateLabel(img.folder)));
        lastGroup = group;
      }

      const item = document.createElement('div');
      item.className = 'grid-item';
      if (this.app.favorites.has(img.id)) item.classList.add('favorited');
      item.dataset.id = img.id;
      item.dataset.index = i;

      const promptStr = typeof img.prompt === 'string' ? img.prompt : '';
      const imgEl = document.createElement('img');
      imgEl.alt = promptStr ? promptStr.substring(0, 100) : '';

      const favIcon = document.createElement('span');
      favIcon.className = 'fav-indicator';
      favIcon.innerHTML = HEART_SVG;
      favIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.app.store.toggleFavorite(img.id);
        item.classList.toggle('favorited', this.app.favorites.has(img.id));
      });

      item.appendChild(imgEl);
      item.appendChild(favIcon);
      item.addEventListener('click', () => this.app.fullscreen.open(i));
      container.appendChild(item);

      this.observer.observe(item);
    }
  }
}
