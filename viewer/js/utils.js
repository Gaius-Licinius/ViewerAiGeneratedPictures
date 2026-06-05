'use strict';

export function safeStr(v) {
  return typeof v === 'string' ? v : '';
}

export function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function copyToClipboard(text, btn) {
  const done = () => {
    btn.innerHTML = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = '&#128203;';
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

export function formatDateLabel(folder) {
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

export function makeDateSeparator(label) {
  const sep = document.createElement('div');
  sep.className = 'date-separator';
  sep.textContent = label;
  return sep;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
