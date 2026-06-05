'use strict';

export class ZoomHandler {
  constructor(app) {
    this.app = app;
  }

  reset() {
    const img = document.getElementById('fs-image');
    img.classList.add('smooth-zoom');
    this.app.zoomLevel = 1;
    this.app.offsetX = 0;
    this.app.offsetY = 0;
    this.applyTransform();
    setTimeout(() => img.classList.remove('smooth-zoom'), 310);
  }

  applyTransform() {
    const img = document.getElementById('fs-image');
    const container = document.getElementById('fs-zoom-container');
    if (!img || !container) return;
    const z = this.app.zoomLevel;
    const isZoomed = z > 1.01 || Math.abs(this.app.offsetX) > 1 || Math.abs(this.app.offsetY) > 1;
    if (isZoomed) {
      img.style.transform = `translate(calc(-50% + ${this.app.offsetX}px), calc(-50% + ${this.app.offsetY}px)) scale(${z})`;
      container.classList.add('zoomed');
      if (this.app.isPanning) container.classList.add('panning');
    } else {
      img.style.transform = 'translate(-50%, -50%) scale(1)';
      this.app.zoomLevel = 1;
      this.app.offsetX = 0;
      this.app.offsetY = 0;
      container.classList.remove('zoomed', 'panning');
    }
  }

  showBadge() {
    let badge = document.getElementById('zoom-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'zoom-badge';
      badge.className = 'zoom-badge';
      document.getElementById('fullscreen-overlay').appendChild(badge);
    }
    badge.textContent = Math.round(this.app.zoomLevel * 100) + '%';
    badge.classList.add('visible');
    if (this.app._zoomBadgeTimer) clearTimeout(this.app._zoomBadgeTimer);
    this.app._zoomBadgeTimer = setTimeout(() => badge.classList.remove('visible'), 1200);
  }

  handleWheel(e) {
    if (this.app.fsIndex < 0) return;
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.15;
    let newZoom = this.app.zoomLevel + delta;
    newZoom = Math.min(5, Math.max(1, newZoom));
    if (newZoom === this.app.zoomLevel) return;

    const img = document.getElementById('fs-image');
    const container = document.getElementById('fs-zoom-container');
    if (!img || !container) return;

    const iRect = img.getBoundingClientRect();
    const dx = e.clientX - (iRect.left + iRect.width / 2);
    const dy = e.clientY - (iRect.top + iRect.height / 2);
    const ratio = newZoom / this.app.zoomLevel;

    this.app.offsetX = this.app.offsetX - dx * (ratio - 1) / newZoom;
    this.app.offsetY = this.app.offsetY - dy * (ratio - 1) / newZoom;
    this.app.zoomLevel = newZoom;

    if (newZoom <= 1.01) {
      this.app.offsetX = 0;
      this.app.offsetY = 0;
    }

    this.applyTransform();
    this.showBadge();

    if (this.app.slideshowActive && !this.app.slideshowPaused) {
      this.app.slideshow.togglePause();
    }
  }

  handleDblClick(e) {
    if (this.app.fsIndex < 0) return;
    e.preventDefault();
    if (this.app.zoomLevel > 1.01) {
      this.reset();
    } else {
      const img = document.getElementById('fs-image');
      img.classList.add('smooth-zoom');
      this.app.zoomLevel = 2;
      this.app.offsetX = 0;
      this.app.offsetY = 0;
      this.applyTransform();
      setTimeout(() => img.classList.remove('smooth-zoom'), 310);
      this.showBadge();
    }
    if (this.app.slideshowActive && !this.app.slideshowPaused) {
      this.app.slideshow.togglePause();
    }
  }

  handleMouseDown(e) {
    if (this.app.fsIndex < 0 || this.app.zoomLevel <= 1.01) return;
    if (e.button !== 0) return;
    e.preventDefault();
    this.app.isPanning = true;
    this.app.panStartX = e.clientX;
    this.app.panStartY = e.clientY;
    this.app.panOffsetStartX = this.app.offsetX;
    this.app.panOffsetStartY = this.app.offsetY;
    this.applyTransform();
    document.body.style.cursor = '';
  }

  handleMouseMove(e) {
    if (!this.app.isPanning) return;
    const dx = (e.clientX - this.app.panStartX) / this.app.zoomLevel;
    const dy = (e.clientY - this.app.panStartY) / this.app.zoomLevel;
    this.app.offsetX = this.app.panOffsetStartX + dx;
    this.app.offsetY = this.app.panOffsetStartY + dy;
    this.applyTransform();
  }

  handleMouseUp() {
    if (!this.app.isPanning) return;
    this.app.isPanning = false;
    this.applyTransform();
    document.body.style.cursor = '';
  }
}
