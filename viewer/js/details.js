'use strict';
import { safeStr, escHtml, copyToClipboard } from './utils.js';

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
      ['Size', info.size],
      ['Model Hash', info.model_hash],
      ['Version', info.version],
      ['File', info.rel_path],
    ].filter(([, v]) => v);

    let html = '<h3>Positive Prompt <span class="copy-btn" title="Copy">&#128203;</span></h3>';
    html += `<div class="detail-prompt">${escHtml(safeStr(info.prompt) || '\u2014')}</div>`;

    html += '<h3>Negative Prompt <span class="copy-btn" title="Copy">&#128203;</span></h3>';
    html += `<div class="detail-neg">${escHtml(safeStr(info.negative_prompt) || '\u2014')}</div>`;

    html += '<h3>Parameters</h3><div class="detail-grid">';
    for (const [key, val] of fields) {
      html += `<span class="key">${key}</span>`;
      if (key === 'Seed') {
        html += `<span class="val">${escHtml(val)} <span class="copy-btn-inline" data-copy="${escHtml(val)}" title="Copy">&#128203;</span></span>`;
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
        html += `<span class="${cls}"><span class="lora-name">${escHtml(displayName)}</span> <span class="lora-strength">${escHtml(strengthText)}</span></span>`;
      }
      html += '</div>';
    }

    if (!('ontouchstart' in window)) {
      html += `<div class="explorer-link"><button class="explorer-btn" data-path="${escHtml(info.rel_path)}">&#128194; Show in folder</button></div>`;
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
        fetch(`/open-folder/${relPath}`);
        explorerBtn.textContent = '\u2705 Opened';
        setTimeout(() => {
          explorerBtn.innerHTML = '&#128194; Show in folder';
        }, 2000);
      });
    }
  }

  close() {
    const popup = document.getElementById('details-popup');
    if (popup) popup.classList.add('hidden');
  }
}
