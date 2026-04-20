import * as auth from '../auth.js';
import { brandHeader, btnOutline, btnPrimary } from '../layout.js';

let personnel = [
  { id: '1', username: 'jdelacruz', fullName: 'Juan dela Cruz', email: 'juan.delacruz@xu.edu.ph', dateAdded: '2024-01-15', status: 'Active' },
  { id: '2', username: 'pgarcia', fullName: 'Pedro Garcia', email: 'pedro.garcia@xu.edu.ph', dateAdded: '2024-02-20', status: 'Active' },
  { id: '3', username: 'mlopez', fullName: 'Maria Lopez', email: 'maria.lopez@xu.edu.ph', dateAdded: '2024-03-10', status: 'Active' },
];

export function mount(container, { navigate }) {
  let showAdd = false;
  let deleteId = null;

  function draw() {
    container.replaceChildren();
    container.className = '';

    const root = document.createElement('div');
    root.className = 'min-h-screen bg-slate-50';

    const header = document.createElement('header');
    header.className = 'bg-white shadow-sm border-b border-slate-200';
    const hi = document.createElement('div');
    hi.className = 'max-w-7xl mx-auto px-6 py-4 flex items-center justify-between';
    hi.append(
      brandHeader({}),
      (() => {
        const w = document.createElement('div');
        w.className = 'flex items-center gap-4';
        w.append(
          btnOutline('Back to Dashboard', () => navigate('/admin/dashboard')),
          btnOutline('Logout', () => {
            auth.logout();
            navigate('/');
          }),
        );
        return w;
      })(),
    );
    header.appendChild(hi);

    const main = document.createElement('main');
    main.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';

    const top = document.createElement('div');
    top.className = 'mb-8 flex items-center justify-between flex-wrap gap-4';
    top.innerHTML = `<div><h2 class="text-2xl sm:text-3xl mb-2">Manage Security Personnel</h2><p class="text-slate-600">Add or remove security guard accounts</p></div>`;
    const addBtn = btnPrimary('Add Personnel', () => { showAdd = true; draw(); }, 'flex items-center gap-2');
    top.appendChild(addBtn);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'bg-white rounded-lg shadow-lg overflow-hidden';
    const table = document.createElement('table');
    table.className = 'w-full';
    table.innerHTML = `<thead class="bg-slate-50 border-b border-slate-200"><tr>
      <th class="px-6 py-3 text-left text-sm text-slate-600">ID</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Username</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Full Name</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Email</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Date Added</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Status</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Actions</th>
    </tr></thead><tbody class="divide-y divide-slate-200"></tbody>`;
    const tbody = table.querySelector('tbody');
    personnel.forEach((p) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      tr.innerHTML = `
        <td class="px-6 py-4 text-sm text-[var(--xu-blue)]">${p.id}</td>
        <td class="px-6 py-4 text-sm text-slate-800">${p.username}</td>
        <td class="px-6 py-4 text-sm text-slate-800">${p.fullName}</td>
        <td class="px-6 py-4 text-sm text-slate-600">${p.email}</td>
        <td class="px-6 py-4 text-sm text-slate-600">${p.dateAdded}</td>
        <td class="px-6 py-4"><span class="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">${p.status}</span></td>
        <td class="px-6 py-4"></td>`;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'flex items-center gap-1 px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50';
      del.textContent = 'Delete';
      del.addEventListener('click', () => { deleteId = p.id; draw(); });
      tr.querySelector('td:last-child').appendChild(del);
      tbody.appendChild(tr);
    });
    tableWrap.appendChild(table);

    main.append(top, tableWrap);
    root.append(header, main);

    if (showAdd) {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
      overlay.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div class="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 class="text-xl text-slate-800">Add Security Personnel</h3>
            <button type="button" class="text-2xl text-slate-400 hover:text-slate-600" data-x>&times;</button>
          </div>
          <form class="p-6 space-y-4" id="add-form">
            <div><label class="block text-sm text-slate-700 mb-2">Username</label>
              <input name="username" required class="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="jdoe" /></div>
            <div><label class="block text-sm text-slate-700 mb-2">Full Name</label>
              <input name="fullName" required class="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="John Doe" /></div>
            <div><label class="block text-sm text-slate-700 mb-2">Email</label>
              <input name="email" type="email" required class="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="john.doe@xu.edu.ph" /></div>
            <div><label class="block text-sm text-slate-700 mb-2">Password</label>
              <input name="password" type="password" required class="w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="••••••••" /></div>
            <div class="flex gap-3 pt-4">
              <button type="button" class="flex-1 px-4 py-2 border border-slate-300 rounded-md" id="cancel-add">Cancel</button>
              <button type="submit" class="flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700">Add Personnel</button>
            </div>
          </form>
        </div>`;
      overlay.querySelector('[data-x]').addEventListener('click', () => { showAdd = false; draw(); });
      overlay.querySelector('#cancel-add').addEventListener('click', () => { showAdd = false; draw(); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) { showAdd = false; draw(); } });
      overlay.querySelector('#add-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        personnel = [
          ...personnel,
          {
            id: String(personnel.length + 1),
            username: fd.get('username'),
            fullName: fd.get('fullName'),
            email: fd.get('email'),
            dateAdded: new Date().toISOString().split('T')[0],
            status: 'Active',
          },
        ];
        showAdd = false;
        draw();
      });
      root.appendChild(overlay);
    }

    if (deleteId) {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
      overlay.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 class="text-xl text-slate-800 mb-4">Delete Personnel</h3>
          <p class="text-slate-600 mb-6">Are you sure you want to delete this security personnel account? This action cannot be undone.</p>
          <div class="flex gap-3">
            <button type="button" class="flex-1 px-4 py-2 border border-slate-300 rounded-md" id="cancel-del">Cancel</button>
            <button type="button" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" id="confirm-del">Delete</button>
          </div>
        </div>`;
      overlay.querySelector('#cancel-del').addEventListener('click', () => { deleteId = null; draw(); });
      overlay.querySelector('#confirm-del').addEventListener('click', () => {
        personnel = personnel.filter((p) => p.id !== deleteId);
        deleteId = null;
        draw();
      });
      root.appendChild(overlay);
    }

    container.appendChild(root);
  }

  draw();
}
