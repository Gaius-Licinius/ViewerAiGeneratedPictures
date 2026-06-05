'use strict';

export class TouchHandler {
  constructor(app) {
    this.app = app;
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.moved = false;
    this.pinchStartDist = 0;
    this.pinchStartZoom = 1;
    this.lastTapTime = 0;
    this.csVisible = true;
  }

  handleStart(e) {
    if (this.app.fsIndex < 0) return;
    const touches = e.touches;
    if (touches.length === 1) {
      this.startX = touches[0].clientX;
      this.startY = touches[0].clientY;
      this.startTime = Date.now();
      this.moved = false;
      this.app.panOffsetStartX = this.app.offsetX;
      this.app.panOffsetStartY = this.app.offsetY;
    }
    if (touches.length === 2) {
      this.pinchStartDist = this._getDistance(touches);
      this.pinchStartZoom = this.app.zoomLevel;
      this.startX = (touches[0].clientX + touches[1].clientX) / 2;
      this.startY = (touches[0].clientY + touches[1].clientY) / 2;
    }
  }

  handleMove(e) {
    if (this.app.fsIndex < 0) return;
    const touches = e.touches;
    const zoom = this.app.zoom;

    if (touches.length === 1 && this.app.zoomLevel > 1.01) {
      const dx = (touches[0].clientX - this.startX) / this.app.zoomLevel;
      const dy = (touches[0].clientY - this.startY) / this.app.zoomLevel;
      this.app.offsetX = this.app.panOffsetStartX + dx;
      this.app.offsetY = this.app.panOffsetStartY + dy;
      zoom.applyTransform();
      if (Math.abs(touches[0].clientX - this.startX) > 10 ||
          Math.abs(touches[0].clientY - this.startY) > 10) {
        this.moved = true;
      }
      return;
    }

    if (touches.length === 1 && this.app.zoomLevel <= 1.01) {
      if (Math.abs(touches[0].clientX - this.startX) > 5 ||
          Math.abs(touches[0].clientY - this.startY) > 5) {
        this.moved = true;
      }
      return;
    }

    if (touches.length === 2) {
      e.preventDefault();
      this.moved = true;
      const dist = this._getDistance(touches);
      const ratio = dist / this.pinchStartDist;
      let newZoom = this.pinchStartZoom * ratio;
      newZoom = Math.min(5, Math.max(1, newZoom));

      const cx = (touches[0].clientX + touches[1].clientX) / 2;
      const cy = (touches[0].clientY + touches[1].clientY) / 2;
      const img = document.getElementById('fs-image');
      const container = document.getElementById('fs-zoom-container');
      if (img && container) {
        const iRect = img.getBoundingClientRect();
        const dx = cx - (iRect.left + iRect.width / 2);
        const dy = cy - (iRect.top + iRect.height / 2);
        const r = newZoom / this.app.zoomLevel;
        this.app.offsetX = this.app.offsetX - dx * (r - 1) / newZoom;
        this.app.offsetY = this.app.offsetY - dy * (r - 1) / newZoom;
      }

      this.app.zoomLevel = newZoom;
      if (newZoom <= 1.01) {
        this.app.offsetX = 0;
        this.app.offsetY = 0;
      }
      zoom.applyTransform();
      zoom.showBadge();
    }
  }

  handleEnd(e) {
    if (this.app.fsIndex < 0) return;

    if (!this.moved && e.changedTouches.length === 1) {
      const now = Date.now();
      if (now - this.lastTapTime < 300) {
        this._doubleTap(e.changedTouches[0]);
        this.lastTapTime = 0;
        return;
      }
      this.lastTapTime = now;
      this._singleTap(e.changedTouches[0]);
      return;
    }

    if (this.moved && e.touches.length === 0 && this.app.zoomLevel <= 1.01) {
      const dx = e.changedTouches[0].clientX - this.startX;
      const dy = e.changedTouches[0].clientY - this.startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) this.app.fullscreen.navigate(1);
        else this.app.fullscreen.navigate(-1);
      }
    }

    if (this.app.zoomLevel > 1.01 && e.touches.length === 0) {
      this.app.panOffsetStartX = this.app.offsetX;
      this.app.panOffsetStartY = this.app.offsetY;
    }
  }

  _doubleTap(touch) {
    const zoom = this.app.zoom;
    if (this.app.zoomLevel > 1.01) {
      zoom.reset();
    } else {
      const img = document.getElementById('fs-image');
      img.classList.add('smooth-zoom');
      this.app.zoomLevel = 2;
      this.app.offsetX = 0;
      this.app.offsetY = 0;
      zoom.applyTransform();
      setTimeout(() => img.classList.remove('smooth-zoom'), 310);
      zoom.showBadge();
    }
    if (this.app.slideshowActive && !this.app.slideshowPaused) {
      this.app.slideshow.togglePause();
    }
  }

  _singleTap(touch) {
    const overlay = document.getElementById('fullscreen-overlay');
    const popup = document.getElementById('details-popup');
    if (popup && !popup.classList.contains('hidden')) return;
    if (this.app.slideshowActive) {
      const ss = this.app.slideshow;
      ss.showKioskControls();
      clearTimeout(ss._kioskHideTimer);
      ss._kioskHideTimer = setTimeout(() => ss.hideKioskControls(), 3000);
    } else {
      this.csVisible = !this.csVisible;
      const top = overlay.querySelector('.fullscreen-top');
      const filmstrip = document.getElementById('filmstrip');
      if (top) top.style.opacity = this.csVisible ? '' : '0';
      if (filmstrip) filmstrip.style.opacity = this.csVisible ? '' : '0';
    }
  }

  _getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
