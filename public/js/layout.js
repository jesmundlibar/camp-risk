export function brandHeader({
  logoSrc = '/xu-logo.png',
  title = 'CAMP-RISK',
  subtitle = 'Risk Management System',
  logoClass = 'h-12',
} = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'flex items-center gap-4';
  const img = document.createElement('img');
  img.src = logoSrc;
  img.alt = 'XU Logo';
  img.className = logoClass;
  const text = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.className = 'text-xl text-[var(--xu-blue)]';
  h1.textContent = title;
  const p = document.createElement('p');
  p.className = 'text-sm text-slate-600';
  p.textContent = subtitle;
  text.append(h1, p);
  wrap.append(img, text);
  return wrap;
}

export function btnPrimary(label, onClick, extraClass = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `px-4 py-2 text-sm bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors ${extraClass}`.trim();
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

export function btnOutline(label, onClick, extraClass = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors ${extraClass}`.trim();
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
