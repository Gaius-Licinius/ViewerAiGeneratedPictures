'use strict';
import { shuffle, revealTile, HEART_SVG } from './utils.js';

export class WallView {
  constructor(app) {
    this.app = app;
  }

  render() {
    const viewer = document.getElementById('viewer');
    viewer.innerHTML = '';
    this.container = document.createElement('div');
    this.container.className = 'wall-container';
    viewer.appendChild(this.container);

    const count = 20;
    const pool = this.app.filteredImages;
    const picked = shuffle([...pool]).slice(0, count);
    const frag = document.createDocumentFragment();

    for (let i = 0; i < picked.length; i++) {
      const img = picked[i];
      const item = document.createElement('div');
      item.className = 'wall-item';
      if (this.app.favorites.has(img.id)) item.classList.add('favorited');
      item.dataset.id = img.id;

      const promptStr = typeof img.prompt === 'string' ? img.prompt : '';
      const imgEl = document.createElement('img');
      imgEl.loading = 'lazy';
      imgEl.src = `/images/${img.rel_path}`;
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
      revealTile(item, imgEl);
      const origIndex = this.app.filteredImages.indexOf(img);
      item.addEventListener('click', () => this.app.fullscreen.open(origIndex));
      frag.appendChild(item);
    }
    this.container.appendChild(frag);
  }
}
