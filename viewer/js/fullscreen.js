'use strict';

export class FullscreenView {
  constructor(app) {
    this.app = app;
  }

  open(filteredIndex) {
    if (this.app.slideshowActive) this.app.slideshow.stop();
    this.app.fsIndex = filteredIndex;
    const overlay = document.getElementById('fullscreen-overlay');
    overlay.classList.remove('hidden');
    this.update();
    this.renderFilmstrip();
    document.body.style.cursor = 'default';
  }

  close() {
    if (this.app.slideshowActive) this.app.slideshow.stop();
    this.app.zoom.reset();
    document.getElementById('fullscreen-overlay').classList.add('hidden');
    this.app.fsIndex = -1;
  }

  update() {
    const img = this.app.filteredImages[this.app.fsIndex];
    if (!img) return;

    const fsImg = document.getElementById('fs-image');
    fsImg.style.opacity = '0';
    setTimeout(() => {
      fsImg.src = `/images/${img.rel_path}`;
      fsImg.onload = () => {
        fsImg.style.opacity = '1';
        this.app.zoom.reset();
      };
    }, 150);

    const favBtn = document.getElementById('fs-fav');
    favBtn.classList.toggle('active', this.app.favorites.has(img.id));

    if (!this.app.slideshowActive) {
      this.renderFilmstrip();
    }
  }

  navigate(direction) {
    const newIdx = this.app.fsIndex + direction;
    if (newIdx < 0 || newIdx >= this.app.filteredImages.length) return;
    this.app.fsIndex = newIdx;
    this.app.zoom.reset();
    this.update();
    if (!this.app.slideshowActive) {
      this.renderFilmstrip();
    }
    if (this.app.slideshowActive) {
      this.app.slideshowPos = this.app.slideshowOrder.indexOf(this.app.fsIndex);
      if (this.app.slideshowPos < 0) this.app.slideshowPos = 0;
      this.app.slideshow._preloadNext(3);
      if (!this.app.slideshowPaused) {
        this.app.slideshow._clearTimer();
        this.app.slideshow._startTimer();
      }
    }
  }

  renderFilmstrip() {
    const inner = document.getElementById('filmstrip-inner');
    inner.innerHTML = '';

    const start = Math.max(0, this.app.fsIndex - 10);
    const end = Math.min(this.app.filteredImages.length, this.app.fsIndex + 11);

    for (let i = start; i < end; i++) {
      const img = this.app.filteredImages[i];
      const thumb = document.createElement('img');
      thumb.className = 'filmstrip-thumb';
      if (i === this.app.fsIndex) thumb.classList.add('active');
      thumb.src = `/thumb/${img.rel_path}`;
      const promptStr = typeof img.prompt === 'string' ? img.prompt : '';
      thumb.title = promptStr ? promptStr.substring(0, 60) : '';
      thumb.addEventListener('click', () => {
        this.app.fsIndex = i;
        this.update();
        this.renderFilmstrip();
      });
      inner.appendChild(thumb);
    }

    const active = inner.querySelector('.filmstrip-thumb.active');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
}
