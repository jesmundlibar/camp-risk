import { brandHeader, btnOutline } from '../layout.js';
import { hazardOptions } from '../data/mockData.js';

export function mount(container, { navigate }) {
  const root = document.createElement('div');
  root.className = 'min-h-screen bg-slate-50';

  const header = document.createElement('header');
  header.className = 'bg-white shadow-sm border-b border-slate-200';
  const hi = document.createElement('div');
  hi.className = 'max-w-7xl mx-auto px-6 py-4 flex items-center justify-between';
  hi.append(brandHeader({}), btnOutline('Dashboard', () => navigate('/guard/dashboard')));
  header.appendChild(hi);

  const main = document.createElement('main');
  main.className = 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8';

  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg shadow-lg p-6 sm:p-8 lg:p-10';

  const head = document.createElement('div');
  head.className = 'flex items-center justify-between mb-6';
  head.innerHTML = '<h2 class="text-2xl text-slate-800">New Incident Report</h2>';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'text-slate-600 hover:text-slate-800 text-2xl';
  close.innerHTML = '&times;';
  close.addEventListener('click', () => navigate('/guard/dashboard'));
  head.appendChild(close);

  const form = document.createElement('form');
  form.className = 'space-y-8';

  const hazardWrap = document.createElement('div');
  hazardWrap.innerHTML =
    '<label class="block text-slate-800 mb-3">Hazard Type <span class="text-sm text-slate-600">(Select all that apply)</span></label>';
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  const selected = new Set();
  const otherInput = document.createElement('input');
  otherInput.type = 'text';
  otherInput.className =
    'w-full mt-4 px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white hidden';
  otherInput.placeholder = 'Please specify';

  hazardOptions.forEach((h) => {
    const lab = document.createElement('label');
    lab.className =
      'flex items-center gap-3 p-3 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'h-5 w-5 rounded text-[var(--xu-blue)]';
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(h);
      else selected.delete(h);
      otherInput.classList.toggle('hidden', !selected.has('Other (specify)'));
    });
    const span = document.createElement('span');
    span.className = 'text-slate-700';
    span.textContent = h;
    lab.append(cb, span);
    grid.appendChild(lab);
  });
  hazardWrap.append(grid, otherInput);

  const photo = document.createElement('div');
  photo.innerHTML = `<label class="block text-slate-800 mb-3">Photo Upload</label>
    <div class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
      <input type="file" accept="image/jpeg,image/png" class="hidden" id="photo" />
      <label for="photo" class="cursor-pointer block">
        <p class="text-4xl mb-2">⬆</p>
        <p class="text-slate-700 mb-1">Click to Upload Image</p>
        <p class="text-sm text-slate-500">(JPG/PNG, Max 5MB)</p>
        <p id="photo-name" class="text-sm text-[var(--xu-blue)] mt-2 hidden"></p>
      </label>
    </div>`;
  photo.querySelector('#photo').addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    const pn = photo.querySelector('#photo-name');
    if (f) {
      pn.textContent = `Selected: ${f.name}`;
      pn.classList.remove('hidden');
    }
  });

  const loc = document.createElement('div');
  loc.innerHTML = '<label class="block text-slate-800 mb-3">Location Details</label>';
  const locGrid = document.createElement('div');
  locGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  ['building', 'floor', 'room', 'specific'].forEach((name, i) => {
    const ph = ['Building', 'Floor', 'Room/Zone', 'Specific Location'][i];
    const inp = document.createElement('input');
    inp.required = i < 3;
    inp.name = name;
    inp.placeholder = ph;
    inp.className =
      'w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white';
    locGrid.appendChild(inp);
  });
  loc.appendChild(locGrid);

  const desc = document.createElement('div');
  desc.innerHTML =
    '<label class="block text-slate-800 mb-3">Description <span class="text-sm text-slate-600">(Optional)</span></label>';
  const ta = document.createElement('textarea');
  ta.rows = 4;
  ta.className =
    'w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white resize-none';
  ta.placeholder = 'Additional details about the incident...';
  desc.appendChild(ta);

  const submit = document.createElement('div');
  submit.className = 'flex justify-end pt-4';
  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className =
    'w-full sm:w-auto px-8 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700';
  btn.textContent = 'Submit Report';
  submit.appendChild(btn);

  form.append(hazardWrap, photo, loc, desc, submit);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Report submitted successfully!');
    navigate('/guard/dashboard');
  });

  card.append(head, form);
  main.appendChild(card);
  root.append(header, main);
  container.appendChild(root);
}
