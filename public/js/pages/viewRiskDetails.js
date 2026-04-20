import * as auth from '../auth.js';
import { brandHeader, btnOutline } from '../layout.js';
import { riskDetailsData } from '../data/mockData.js';

export function mount(container, { navigate, params }) {
  const riskId = params?.riskId || 'ASS-0089';
  const risk = riskDetailsData[riskId] || riskDetailsData['ASS-0089'];

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
  main.className = 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'flex items-center gap-2 text-[var(--xu-blue)] mb-6 hover:underline';
  back.textContent = '← Back';
  back.addEventListener('click', () => history.back());

  const sevBadge =
    risk.severity === 'High'
      ? 'bg-red-100 text-red-800'
      : risk.severity === 'Medium'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800';
  const statBadge =
    risk.status === 'Open'
      ? 'bg-amber-100 text-amber-800'
      : risk.status === 'In Review'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-green-100 text-green-800';

  const areas = risk.affectedAreas.map((a) => `<span class="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm">${a}</span>`).join(' ');
  const notes = risk.notes
    .map(
      (n) => `
    <div class="border-l-4 border-[var(--xu-blue)] pl-4 py-2">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm text-slate-600">${n.author}</span>
        <span class="text-xs text-slate-400">${n.date}</span>
      </div>
      <p class="text-sm text-slate-700">${n.text}</p>
    </div>`,
    )
    .join('');

  main.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div class="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <div class="flex flex-wrap items-center gap-3 mb-2">
            <span class="text-2xl text-[var(--xu-blue)]">${risk.id}</span>
            <span class="inline-flex px-3 py-1 text-sm rounded-full ${sevBadge}">${risk.severity} Severity</span>
            <span class="inline-flex px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">Risk Score: ${risk.score}</span>
          </div>
          <h2 class="text-2xl text-slate-800 mb-4">${risk.hazard}</h2>
        </div>
        <span class="px-3 py-1 text-sm rounded-full ${statBadge}">${risk.status}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
        <div><p class="text-xs text-slate-500">Location</p><p>${risk.location}</p></div>
        <div><p class="text-xs text-slate-500">Date Assessed</p><p>${risk.dateAssessed}</p></div>
        <div><p class="text-xs text-slate-500">Likelihood</p><p>${risk.likelihood}</p></div>
      </div>
      <div class="border-t border-slate-200 pt-4">
        <h3 class="text-sm text-slate-600 mb-2">Description</h3>
        <p class="text-slate-800">${risk.description}</p>
      </div>
    </div>
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 class="text-lg text-slate-800 mb-4">Affected Areas</h3>
      <div class="flex flex-wrap gap-2">${areas}</div>
    </div>
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 class="text-lg text-slate-800 mb-4">Mitigation Plan</h3>
      <p class="text-slate-700 mb-4">${risk.mitigationPlan}</p>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-600">Assigned To:</span> <span class="text-slate-800">${risk.assignedTo}</span></div>
        <div><span class="text-slate-600">Due Date:</span> <span class="text-slate-800">${risk.dueDate}</span></div>
      </div>
    </div>
    <div class="bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-lg text-slate-800 mb-4">Notes & Comments</h3>
      <div class="space-y-4">${notes}</div>
    </div>
    <div class="mt-6 flex gap-4 flex-wrap">
      <button type="button" id="upd" class="flex-1 min-w-[200px] px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700">Update Mitigation</button>
      <button type="button" id="cls" class="px-6 py-3 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100">Close</button>
    </div>`;

  main.querySelector('#upd').addEventListener('click', () => navigate(`/admin/update-mitigation/${risk.id}`));
  main.querySelector('#cls').addEventListener('click', () => navigate('/admin/dashboard'));

  root.append(header, main);
  main.prepend(back);
  container.appendChild(root);
}
