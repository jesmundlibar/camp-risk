import * as auth from '../auth.js';
import { brandHeader, btnOutline, btnPrimary } from '../layout.js';
import {
  pendingReports,
  openRisks,
  overdueActions,
  riskRegister,
} from '../data/mockData.js';

function priClass(p) {
  if (p === 'High') return 'bg-red-100 text-red-800';
  if (p === 'Medium') return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}

function sevClass(s) {
  if (s === 'High') return 'bg-red-100 text-red-800';
  if (s === 'Medium') return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}

export function mount(container, { navigate }) {
  const user = auth.loadUser();
  let showModal = null;

  function draw() {
    container.replaceChildren();
    container.className = '';

    const root = document.createElement('div');
    root.className = 'min-h-screen bg-slate-50 relative';

    const header = document.createElement('header');
    header.className = 'bg-white shadow-sm border-b border-slate-200';
    const hi = document.createElement('div');
    hi.className = 'max-w-7xl mx-auto px-6 py-4 flex items-center justify-between';
    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-3';
    actions.append(
      btnPrimary('Manage Personnel', () => navigate('/admin/manage-personnel'), 'flex items-center gap-2 text-sm'),
      btnOutline('Logout', () => {
        auth.logout();
        navigate('/');
      }),
    );
    hi.append(brandHeader({ logoClass: 'h-16 w-auto' }), actions);
    header.appendChild(hi);

    const main = document.createElement('main');
    main.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';

    const welcome = document.createElement('div');
    welcome.className = 'mb-8';
    welcome.innerHTML = `<h2 class="text-2xl sm:text-3xl mb-2">Welcome, ${user?.fullName || ''}</h2><p class="text-slate-600">Administrator Dashboard</p>`;

    const cards = document.createElement('div');
    cards.className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8';

    function summaryCard(title, count, borderVar, iconEmoji, modalKey) {
      const c = document.createElement('div');
      c.className = `bg-white rounded-lg shadow-lg p-6 lg:p-8 border-t-4 cursor-pointer hover:shadow-xl transition-shadow`;
      c.style.borderTopColor = `var(${borderVar})`;
      c.innerHTML = `
        <div class="flex items-start justify-between mb-2">
          <h3 class="text-slate-600 text-sm sm:text-base">${title}</h3>
          <span class="text-2xl">${iconEmoji}</span>
        </div>
        <p class="text-4xl lg:text-5xl text-slate-800 mb-2">${count}</p>
        <p class="text-xs text-slate-500">Click to view details</p>`;
      c.addEventListener('click', () => { showModal = modalKey; draw(); });
      return c;
    }

    cards.append(
      summaryCard('Pending Reports', pendingReports.length, '--xu-blue', '🕐', 'pending'),
      summaryCard('Open Risks', openRisks.length, '--xu-gold', '⚠', 'risks'),
      summaryCard('Overdue Actions', overdueActions.length, '--xu-red', '⚠', 'overdue'),
    );

    const queue = document.createElement('div');
    queue.className = 'bg-white rounded-lg shadow-lg overflow-hidden mb-8';
    queue.innerHTML = `<div class="px-6 py-4 border-b border-slate-200"><h3 class="text-xl text-slate-800">Risk Assessment Queue</h3></div>`;
    const qScroll = document.createElement('div');
    qScroll.className = 'overflow-x-auto';
    const qTable = document.createElement('table');
    qTable.className = 'w-full';
    qTable.innerHTML = `<thead class="bg-slate-50 border-b border-slate-200"><tr>
      <th class="px-6 py-3 text-left text-sm text-slate-600">ID</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Hazard</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Date</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Priority</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Action</th>
    </tr></thead><tbody class="divide-y divide-slate-200"></tbody>`;
    const qBody = qTable.querySelector('tbody');
    pendingReports.forEach((r) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      tr.innerHTML = `
        <td class="px-6 py-4 text-sm text-[var(--xu-blue)]">${r.id}</td>
        <td class="px-6 py-4 text-sm text-slate-800">${r.hazard}</td>
        <td class="px-6 py-4 text-sm text-slate-600">${r.date}</td>
        <td class="px-6 py-4"><span class="inline-flex px-2 py-1 text-xs rounded-full ${priClass(r.priority)}">${r.priority}</span></td>
        <td class="px-6 py-4"></td>`;
      const assess = document.createElement('button');
      assess.type = 'button';
      assess.className = 'px-4 py-2 bg-[var(--xu-blue)] text-white text-sm rounded-md hover:bg-blue-700';
      assess.textContent = 'Assess';
      assess.addEventListener('click', () => navigate(`/admin/assess/${r.id}`));
      tr.querySelector('td:last-child').appendChild(assess);
      qBody.appendChild(tr);
    });
    qScroll.appendChild(qTable);
    queue.appendChild(qScroll);

    const bottom = document.createElement('div');
    bottom.className = 'grid grid-cols-1 xl:grid-cols-2 gap-6';

    const reg = document.createElement('div');
    reg.className = 'bg-white rounded-lg shadow-lg overflow-hidden';
    reg.innerHTML = `<div class="px-6 py-4 border-b border-slate-200"><h3 class="text-xl text-slate-800">Risk Register</h3></div>`;
    const regScroll = document.createElement('div');
    regScroll.className = 'overflow-x-auto';
    const regTable = document.createElement('table');
    regTable.className = 'w-full';
    regTable.innerHTML = `<thead class="bg-slate-50 border-b border-slate-200"><tr>
      <th class="px-6 py-3 text-left text-sm text-slate-600">ID</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Severity</th>
      <th class="px-6 py-3 text-left text-sm text-slate-600">Status</th>
    </tr></thead><tbody class="divide-y divide-slate-200"></tbody>`;
    const regBody = regTable.querySelector('tbody');
    riskRegister.forEach((r) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      tr.innerHTML = `
        <td class="px-6 py-4 text-sm text-[var(--xu-blue)]">${r.id}</td>
        <td class="px-6 py-4"><span class="inline-flex px-2 py-1 text-xs rounded-full ${sevClass(r.severity)}">${r.severity}</span></td>
        <td class="px-6 py-4 text-sm text-slate-600">${r.status}</td>`;
      regBody.appendChild(tr);
    });
    regScroll.appendChild(regTable);
    reg.appendChild(regScroll);

    const mit = document.createElement('div');
    mit.className = 'bg-white rounded-lg shadow-lg p-6';
    mit.innerHTML = `
      <div class="border-b border-slate-200 pb-4 mb-6">
        <h3 class="text-xl text-slate-800">Mitigation Tracking</h3>
        <p class="text-sm text-slate-600 mt-1">Jan-Jun 2024</p>
      </div>
      <div class="space-y-6">
        <div>
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-700">Completed Actions</span><span class="text-sm text-green-600">75%</span></div>
          <div class="w-full bg-slate-200 rounded-full h-3"><div class="bg-green-500 h-3 rounded-full" style="width:75%"></div></div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-700">In Progress</span><span class="text-sm text-yellow-600">50%</span></div>
          <div class="w-full bg-slate-200 rounded-full h-3"><div class="bg-yellow-500 h-3 rounded-full" style="width:50%"></div></div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2"><span class="text-sm text-slate-700">Overdue</span><span class="text-sm text-red-600">25%</span></div>
          <div class="w-full bg-slate-200 rounded-full h-3"><div class="bg-red-500 h-3 rounded-full" style="width:25%"></div></div>
        </div>
      </div>`;

    bottom.append(reg, mit);
    main.append(welcome, cards, queue, bottom);

    root.append(header, main);

    if (showModal === 'pending') {
      const modal = modalShell('Pending Reports', 'Incident reports awaiting risk assessment', () => { showModal = null; draw(); });
      const body = modal.querySelector('[data-modal-body]');
      pendingReports.forEach((report) => {
        const block = document.createElement('div');
        block.className = 'border border-slate-200 rounded-lg p-4 hover:bg-slate-50';
        block.innerHTML = `
          <div class="mb-3">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-[var(--xu-blue)]">${report.id}</span>
              <span class="inline-flex px-2 py-1 text-xs rounded-full ${priClass(report.priority)}">${report.priority} Priority</span>
            </div>
            <h4 class="text-lg text-slate-800 mb-2">${report.hazard}</h4>
            <div class="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div><span class="font-medium">Location:</span> ${report.location}</div>
              <div><span class="font-medium">Reported by:</span> ${report.guard}</div>
              <div><span class="font-medium">Date:</span> ${report.date}</div>
              <div><span class="font-medium">Status:</span> Awaiting Assessment</div>
            </div>
          </div>
          <div class="flex gap-2" data-actions></div>`;
        const act = block.querySelector('[data-actions]');
        const b1 = document.createElement('button');
        b1.type = 'button';
        b1.className = 'flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700';
        b1.textContent = 'Assess This Report';
        b1.addEventListener('click', () => navigate(`/admin/assess/${report.id}`));
        const b2 = document.createElement('button');
        b2.type = 'button';
        b2.className = 'flex-1 px-4 py-2 border border-[var(--xu-blue)] text-[var(--xu-blue)] rounded-md hover:bg-blue-50';
        b2.textContent = 'Request More Info';
        b2.addEventListener('click', () => navigate(`/admin/request-info/${report.id}`));
        act.append(b1, b2);
        body.appendChild(block);
      });
      root.appendChild(modal);
    }

    if (showModal === 'risks') {
      const modal = modalShell('Open Risks', 'Active risks requiring monitoring and mitigation', () => { showModal = null; draw(); });
      const body = modal.querySelector('[data-modal-body]');
      openRisks.forEach((risk) => {
        const block = document.createElement('div');
        block.className = 'border border-slate-200 rounded-lg p-4 hover:bg-slate-50';
        block.innerHTML = `
          <div class="mb-3">
            <div class="flex flex-wrap items-center gap-3 mb-2">
              <span class="text-[var(--xu-blue)]">${risk.id}</span>
              <span class="inline-flex px-2 py-1 text-xs rounded-full ${sevClass(risk.severity)}">${risk.severity} Severity</span>
              <span class="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Risk Score: ${risk.score}</span>
            </div>
            <h4 class="text-lg text-slate-800 mb-2">${risk.hazard}</h4>
            <div class="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div><span class="font-medium">Location:</span> ${risk.location}</div>
              <div><span class="font-medium">Status:</span> ${risk.status}</div>
              <div><span class="font-medium">Assessed:</span> ${risk.dateAssessed}</div>
            </div>
          </div>
          <div class="flex gap-2" data-actions></div>`;
        const act = block.querySelector('[data-actions]');
        const b1 = document.createElement('button');
        b1.type = 'button';
        b1.className = 'flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100';
        b1.textContent = 'View Details';
        b1.addEventListener('click', () => navigate(`/admin/view-risk/${risk.id}`));
        const b2 = document.createElement('button');
        b2.type = 'button';
        b2.className = 'flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700';
        b2.textContent = 'Update Mitigation';
        b2.addEventListener('click', () => navigate(`/admin/update-mitigation/${risk.id}`));
        act.append(b1, b2);
        body.appendChild(block);
      });
      root.appendChild(modal);
    }

    if (showModal === 'overdue') {
      const modal = modalShell(
        'Overdue Actions',
        'Mitigation actions past their due date requiring immediate attention',
        () => { showModal = null; draw(); },
      );
      const body = modal.querySelector('[data-modal-body]');
      overdueActions.forEach((action) => {
        const block = document.createElement('div');
        block.className = 'border-l-4 border-red-500 bg-red-50 rounded-lg p-4';
        block.innerHTML = `
          <div class="mb-3">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-[var(--xu-blue)]">${action.id}</span>
              <span class="inline-flex px-2 py-1 text-xs rounded-full bg-red-600 text-white">${action.daysOverdue} days overdue</span>
            </div>
            <h4 class="text-lg text-slate-800 mb-3">${action.task}</h4>
            <div class="grid grid-cols-2 gap-4 text-sm text-slate-700">
              <div><span class="font-medium">Due Date:</span> ${action.dueDate}</div>
              <div><span class="font-medium">Assigned To:</span> ${action.assignedTo}</div>
              <div class="col-span-2"><span class="font-medium">Related Risk:</span> ${action.relatedRisk}</div>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap" data-actions></div>`;
        const act = block.querySelector('[data-actions]');
        const b1 = document.createElement('button');
        b1.type = 'button';
        b1.className = 'flex-1 min-w-[120px] px-4 py-2 border border-slate-300 bg-white rounded-md hover:bg-slate-100';
        b1.textContent = 'View Risk Details';
        b1.addEventListener('click', () => navigate(`/admin/view-risk/${action.relatedRisk}`));
        const b2 = document.createElement('button');
        b2.type = 'button';
        b2.className = 'flex-1 min-w-[120px] px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700';
        b2.textContent = 'Mark as Completed';
        b2.addEventListener('click', () => {
          if (confirm('Are you sure you want to mark this action as completed?')) {
            alert('Action marked as completed!');
            showModal = null;
            draw();
          }
        });
        const b3 = document.createElement('button');
        b3.type = 'button';
        b3.className = 'flex-1 min-w-[120px] px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600';
        b3.textContent = 'Extend Deadline';
        b3.addEventListener('click', () => navigate(`/admin/extend-deadline/${action.id}`));
        act.append(b1, b2, b3);
        body.appendChild(block);
      });
      root.appendChild(modal);
    }

    container.appendChild(root);
  }

  draw();
}

function modalShell(title, subtitle, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
  overlay.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <div class="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
        <div>
          <h3 class="text-2xl text-slate-800">${title}</h3>
          <p class="text-sm text-slate-600 mt-1">${subtitle}</p>
        </div>
        <button type="button" class="text-slate-400 hover:text-slate-600 text-2xl leading-none" data-x>&times;</button>
      </div>
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4" data-modal-body></div>
    </div>`;
  overlay.querySelector('[data-x]').addEventListener('click', onClose);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) onClose(); });
  return overlay;
}
