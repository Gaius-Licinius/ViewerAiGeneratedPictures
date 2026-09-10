'use strict';
import { safeStr, escHtml, copyToClipboard } from './utils.js';

const ICON_CLIPBOARD = '<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">'
  + '<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>'
  + '<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>'
  + '</svg>';

const ICON_FOLDER = '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">'
  + '<path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14zM2 6h12v-.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5a.5.5 0 0 0-.5.5zm-.367 1a.5.5 0 0 0-.496.562l.64 5.124A1.5 1.5 0 0 0 3.266 14h9.468a1.5 1.5 0 0 0 1.489-1.314l.64-5.124A.5.5 0 0 0 14.367 7z"/>'
  + '</svg>';

const ICON_CHECK = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">'
  + '<path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/>'
  + '</svg>';

export class DetailsPopup {
  constructor(app) {
    this.app = app;
  }

  open(img) {
    const popup = document.getElementById('details-popup');
    const content = document.getElementById('details-content');
    if (!popup || !content) return;

    const info = img || this.app.filteredImages[this.app.fsIndex];
    if (!info) return;

    const fields = [
      ['Model', info.model],
      ['Steps', info.steps],
      ['Sampler', info.sampler],
      ['CFG Scale', info.cfg_scale],
      ['Seed', info.seed],
      ['Width', info.width],
      ['Height', info.height],
      ['Model Hash', info.model_hash],
      ['Version', info.version],
      ['File', info.rel_path],
    ].filter(([, v]) => v);

    let html = `<h3>Positive Prompt <span class="copy-btn" title="Copy">${ICON_CLIPBOARD}</span></h3>`;
    html += `<div class="detail-prompt">${escHtml(safeStr(info.prompt) || '\u2014')}</div>`;

    html += `<h3>Negative Prompt <span class="copy-btn" title="Copy">${ICON_CLIPBOARD}</span></h3>`;
    html += `<div class="detail-neg">${escHtml(safeStr(info.negative_prompt) || '\u2014')}</div>`;

    html += '<h3>Parameters</h3><div class="detail-grid">';
    for (const [key, val] of fields) {
      html += `<span class="key">${key}</span>`;
      if (key === 'Seed') {
        html += `<span class="val">${escHtml(val)} <span class="copy-btn-inline" data-copy="${escHtml(val)}" title="Copy">${ICON_CLIPBOARD}</span></span>`;
      } else {
        html += `<span class="val">${escHtml(val)}</span>`;
      }
    }
    html += '</div>';

    const loras = info.loras || [];
    if (loras.length > 0) {
      html += '<h3>LORAs</h3><div class="detail-loras">';
      for (const lora of loras) {
        const name = lora.name || '';
        const displayName = name.replace(/\.safetensors$/i, '').replace(/\.pt$/i, '').replace(/\.ckpt$/i, '');
        const mw = parseFloat(lora.model_strength);
        const cw = parseFloat(lora.clip_strength);
        const disabled = mw === 0 && cw === 0;
        const cls = disabled ? 'detail-lora-badge disabled' : 'detail-lora-badge';
        let strengthText;
        if (mw === cw) {
          strengthText = mw.toFixed(2);
        } else {
          strengthText = `M:${mw.toFixed(2)} C:${cw.toFixed(2)}`;
        }
        const strength = Number.isFinite(mw) ? Math.min(1.5, Math.max(0, mw)) : 0;
        const pct = Math.round((strength / 1.5) * 100);
        html += `<span class="${cls}">`
          + `<span class="lora-head"><span class="lora-name">${escHtml(displayName)}</span>`
          + `<span class="lora-strength">${escHtml(strengthText)}</span></span>`
          + `<span class="lora-bar"><span class="lora-bar-fill" style="width:${pct}%"></span></span>`
          + '</span>';
      }
      html += '</div>';
    }

    if (!('ontouchstart' in window)) {
      html += `<div class="explorer-link"><button class="explorer-btn" data-path="${escHtml(info.rel_path)}">${ICON_FOLDER} Show in folder</button></div>`;
    }

    content.innerHTML = html;
    popup.classList.remove('hidden');

    const copyBtns = content.querySelectorAll('.copy-btn');
    const prompts = [safeStr(info.prompt), safeStr(info.negative_prompt)];
    copyBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => copyToClipboard(prompts[i], btn));
    });

    content.querySelectorAll('.copy-btn-inline').forEach((btn) => {
      btn.addEventListener('click', () => copyToClipboard(btn.dataset.copy, btn));
    });

    const explorerBtn = content.querySelector('.explorer-btn');
    if (explorerBtn) {
      explorerBtn.addEventListener('click', () => {
        const relPath = explorerBtn.dataset.path;
        const original = explorerBtn.innerHTML;
        fetch(`/open-folder/${relPath}`);
        explorerBtn.innerHTML = `${ICON_CHECK} Opened`;
        setTimeout(() => {
          explorerBtn.innerHTML = original;
        }, 2000);
      });
    }
  }

  close() {
    const popup = document.getElementById('details-popup');
    if (popup) popup.classList.add('hidden');
  }
}
