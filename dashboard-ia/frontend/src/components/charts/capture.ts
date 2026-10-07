import * as echarts from 'echarts';

/**
 * Getting charts out of the page: a PNG of what is on screen, the data behind it as CSV,
 * and every chart at once for the PDF / PPTX report. Loaded on demand (it pulls in echarts).
 */

type ChartLike = { dataset?: { dimensions?: string[]; source?: Record<string, any>[] } };

const instanceIn = (el: Element | null) => {
  const dom = el?.querySelector('.echarts-for-react') as HTMLElement | null;
  return dom ? echarts.getInstanceByDom(dom) : undefined;
};

/** PNG data URL of the chart drawn inside `el`, or null when there is none. */
export function chartPng(el: Element | null, isDark = false): string | null {
  const inst = instanceIn(el);
  if (!inst) return null;
  try {
    return inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: isDark ? '#0e0d16' : '#ffffff' });
  } catch {
    return null;
  }
}

/** Fit an image inside a fixed frame, so every chart in the report has the same shape. */
function fitPng(dataUrl: string, w: number, h: number, bg: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d');
      if (!g) return resolve(dataUrl);
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      const k = Math.min(w / img.width, h / img.height);
      const dw = img.width * k, dh = img.height * k;
      g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Every chart currently drawn under `root`, titled, for the report endpoints. */
export async function captureAll(root: ParentNode, max = 12): Promise<{ title: string; base64: string }[]> {
  const out: { title: string; base64: string }[] = [];
  const seen = new Set<string>();
  for (const el of Array.from(root.querySelectorAll('[data-chart-title]'))) {
    if (out.length >= max) break;
    const title = el.getAttribute('data-chart-title') || 'Gráfico';
    if (seen.has(title)) continue;
    // Reports are printed on white, whatever the theme on screen.
    const inst = instanceIn(el);
    if (!inst) continue;
    try {
      const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
      out.push({ title, base64: await fitPng(url, 1700, 800, '#ffffff') });
      seen.add(title);
    } catch { /* a chart that cannot be drawn is left out of the report */ }
  }
  return out;
}

const cell = (v: any): string => {
  if (v == null) return '';
  if (typeof v === 'number') return String(v).replace('.', ',');
  const s = Array.isArray(v) ? v.join(' | ') : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The data behind a chart, ready to open in Excel (semicolon separated, decimal comma). */
export function chartCsv(chart: ChartLike): string {
  const rows = chart.dataset?.source || [];
  const dims = chart.dataset?.dimensions?.length ? chart.dataset.dimensions : Object.keys(rows[0] || {});
  const cols = dims.filter((d) => !d.startsWith('_') || rows.some((r) => r[d] != null));
  return '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n');
}

export const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'grafico';

export function save(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function saveText(text: string, filename: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  save(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
