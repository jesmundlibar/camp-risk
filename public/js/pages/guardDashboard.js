import * as auth from '../auth.js';
import { brandHeader, btnOutline } from '../layout.js';
import { recentReports, reportHistory } from '../data/mockData.js';

function statusClass(status) {
  if (status === 'Closed') return 'bg-green-100 text-green-800';
  if (status === 'Assessed') return 'bg-blue-100 text-blue-800';
  if (status === 'In Progress') return 'bg-yellow-100 text-yellow-800';
  return 'bg-orange-100 text-orange-800';
}

export function mount(container, { navigate }) {
  const user = auth.loadUser();

  const root = document.createElement('div');
  root.className = 'min-h-screen bg-slate-50';

  const header = document.createElement('header');
  header.className = 'bg-white shadow-sm border-b border-slate-200';
  const headInner = document.createElement('div');
  headInner.className = 'max-w-7xl mx-auto px-6 py-4 flex items-center justify-between';
  headInner.append(
    brandHeader({ logoClass: 'h-16 w-auto' }),
    btnOutline('Logout', () => {
      auth.logout();
      navigate('/');
    }),
  );
  header.appendChild(headInner);

  const main = document.createElement('main');
  main.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';

  const welcome = document.createElement('div');
  welcome.className = 'mb-8';
  welcome.innerHTML = `<h2 class="text-2xl sm:text-3xl mb-2">Welcome, ${escapeHtml(user?.fullName || '')}</h2><p class="text-slate-600">Security Guard Dashboard</p>`;

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8';

  const submitCard = document.createElement('div');
  submitCard.className =
    'bg-gradient-to-br from-[var(--xu-blue)] to-blue-700 text-white rounded-lg shadow-lg p-8 lg:p-10 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]';
  submitCard.innerHTML =
    '<p class="text-6xl mb-4 opacity-90">📄</p><h3 class="text-2xl lg:text-3xl mb-2">SUBMIT INCIDENT REPORT</h3><p class="text-blue-100 text-lg">Click Here</p>';
  submitCard.addEventListener('click', () => navigate('/guard/report'));

  const recentCard = document.createElement('div');
  recentCard.className = 'bg-white rounded-lg shadow-lg p-6 lg:p-8';
  const recentTitle = document.createElement('h3');
  recentTitle.className = 'text-xl lg:text-2xl mb-4 text-slate-800';
  recentTitle.textContent = 'Recent Reports';
  const recentList = document.createElement('div');
  recentList.className = 'space-y-4';

  let selected = null;

  function renderModal() {
    const existing = root.querySelector('[data-modal-overlay]');
    if (existing) existing.remove();
    if (!selected) return;
    const overlay = document.createElement('div');
    overlay.dataset.modalOverlay = '';
    overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    const box = document.createElement('div');
    box.className = 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto';
    const types = selected.hazardTypes.map((t) => `<span class="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">${escapeHtml(t)}</span>`).join(' ');
    box.innerHTML = `
      <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h3 class="text-xl text-slate-800">Report Details</h3>
        <button type="button" class="text-slate-400 hover:text-slate-600 text-2xl leading-none" data-close>&times;</button>
      </div>
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <div><p class="text-sm text-slate-600">Report ID</p><p class="text-lg text-[var(--xu-blue)]">${escapeHtml(selected.id)}</p></div>
          <span class="inline-flex px-3 py-1 text-sm rounded-full ${statusClass(selected.status)}">${escapeHtml(selected.status)}</span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><p class="text-sm text-slate-600 mb-1">Date</p><p class="text-slate-800">${escapeHtml(selected.date)}</p></div>
          <div><p class="text-sm text-slate-600 mb-1">Time</p><p class="text-slate-800">${escapeHtml(selected.time)}</p></div>
        </div>
        <div><p class="text-sm text-slate-600 mb-1">Hazard</p><p class="text-slate-800">${escapeHtml(selected.hazard)}</p></div>
        <div><p class="text-sm text-slate-600 mb-2">Hazard Types</p><div class="flex flex-wrap gap-2">${types}</div></div>
        <div><p class="text-sm text-slate-600 mb-1">Description</p><p class="text-slate-800 leading-relaxed">${escapeHtml(selected.description)}</p></div>
        <div class="bg-slate-50 rounded-lg p-4 space-y-3">
          <p class="text-sm text-slate-600">Location Details</p>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><p class="text-xs text-slate-500">Building</p><p class="text-slate-800">${escapeHtml(selected.building)}</p></div>
            <div><p class="text-xs text-slate-500">Floor</p><p class="text-slate-800">${escapeHtml(selected.floor)}</p></div>
            <div><p class="text-xs text-slate-500">Room</p><p class="text-slate-800">${escapeHtml(selected.room)}</p></div>
            <div><p class="text-xs text-slate-500">Specific Location</p><p class="text-slate-800">${escapeHtml(selected.specificLocation)}</p></div>
          </div>
        </div>
        <div><p class="text-sm text-slate-600 mb-1">Submitted By</p><p class="text-slate-800">${escapeHtml(selected.submittedBy)}</p></div>
      </div>
      <div class="border-t border-slate-200 px-6 py-4 flex justify-end">
        <button type="button" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200" data-close>Close</button>
      </div>`;
    overlay.appendChild(box);
    root.appendChild(overlay);
    overlay.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => { selected = null; renderModal(); }));
  }

  recentReports.forEach((report) => {
    const row = document.createElement('div');
    row.className =
      'flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors';
    row.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-2"><span class="text-[var(--xu-blue)]">${escapeHtml(report.id)}</span></div>
        <div class="flex items-center gap-4 text-sm text-slate-600">
          <span>🕐 ${escapeHtml(report.time)}</span>
          <span>📍 ${escapeHtml(report.location)}</span>
        </div>
      </div>`;
    const view = document.createElement('button');
    view.type = 'button';
    view.className = 'text-[var(--xu-blue)] text-sm hover:underline';
    view.textContent = 'View';
    view.addEventListener('click', () => { selected = report; renderModal(); });
    row.appendChild(view);
    recentList.appendChild(row);
  });

  recentCard.append(recentTitle, recentList);

  grid.append(submitCard, recentCard);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'bg-white rounded-lg shadow-lg overflow-hidden';
  tableWrap.innerHTML = `<div class="px-6 py-4 border-b border-slate-200"><h3 class="text-xl text-slate-800">My Report History</h3></div>`;
  const tableScroll = document.createElement('div');
  tableScroll.className = 'overflow-x-auto';
  const table = document.createElement('table');
  table.className = 'w-full';
  table.innerHTML = `<thead class="bg-slate-50 border-b border-slate-200"><tr>
    <th class="px-6 py-3 text-left text-sm text-slate-600">Date</th>
    <th class="px-6 py-3 text-left text-sm text-slate-600">Hazard</th>
    <th class="px-6 py-3 text-left text-sm text-slate-600">Status</th>
    <th class="px-6 py-3 text-left text-sm text-slate-600">Action</th>
  </tr></thead><tbody class="divide-y divide-slate-200"></tbody>`;
  const tbody = table.querySelector('tbody');
  reportHistory.forEach((report) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50';
    const badge =
      report.status === 'Closed'
        ? 'bg-green-100 text-green-800'
        : report.status === 'Assessed'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-yellow-100 text-yellow-800';
    tr.innerHTML = `
      <td class="px-6 py-4 text-sm text-slate-800">${escapeHtml(report.date)}</td>
      <td class="px-6 py-4 text-sm text-slate-800">${escapeHtml(report.hazard)}</td>
      <td class="px-6 py-4"><span class="inline-flex px-2 py-1 text-xs rounded-full ${badge}">${escapeHtml(report.status)}</span></td>
      <td class="px-6 py-4"></td>`;
    const tdBtn = tr.querySelector('td:last-child');
    const vb = document.createElement('button');
    vb.type = 'button';
    vb.className = 'text-[var(--xu-blue)] text-sm hover:underline';
    vb.textContent = 'View';
    vb.addEventListener('click', () => { selected = report; renderModal(); });
    tdBtn.appendChild(vb);
    tbody.appendChild(tr);
  });
  tableScroll.appendChild(table);
  tableWrap.appendChild(tableScroll);

  main.append(welcome, grid, tableWrap);
  root.append(header, main);
  container.appendChild(root);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
