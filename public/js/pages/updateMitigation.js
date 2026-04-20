import * as auth from '../auth.js';
import { brandHeader, btnOutline } from '../layout.js';
import { riskMitigationEdit } from '../data/mockData.js';

export function mount(container, { navigate, params }) {
  const riskId = params?.riskId || 'ASS-0089';
  const risk = riskMitigationEdit[riskId] || riskMitigationEdit['ASS-0089'];

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
  main.className = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'flex items-center gap-2 text-[var(--xu-blue)] mb-6 hover:underline';
  back.textContent = '← Back';
  back.addEventListener('click', () => history.back());

  const form = document.createElement('form');
  form.className = 'bg-white rounded-lg shadow-lg p-6 space-y-6';
  form.innerHTML = `
    <div class="mb-2">
      <h2 class="text-2xl sm:text-3xl mb-2">Update Mitigation Plan</h2>
      <p class="text-slate-600">Risk ID: ${risk.id} - ${risk.hazard}</p>
    </div>
    <div class="bg-slate-50 p-4 rounded-md border border-slate-200">
      <h3 class="text-sm text-slate-600 mb-3">Risk Information</h3>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-600">Risk ID:</span> <span class="text-slate-800">${risk.id}</span></div>
        <div><span class="text-slate-600">Location:</span> <span class="text-slate-800">${risk.location}</span></div>
        <div class="col-span-2"><span class="text-slate-600">Hazard:</span> <span class="text-slate-800">${risk.hazard}</span></div>
      </div>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Mitigation Plan</label>
      <textarea name="plan" required class="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[120px]">${risk.currentMitigation}</textarea>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Assigned To</label>
      <select name="assigned" required class="w-full px-3 py-2 border border-slate-300 rounded-md">
        <option>Maintenance Team</option>
        <option>Facilities Team</option>
        <option>Safety Team</option>
        <option>IT Team</option>
        <option>Security Team</option>
      </select>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Due Date</label>
      <input name="due" type="date" required value="${risk.dueDate}" class="w-full px-3 py-2 border border-slate-300 rounded-md" />
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Status</label>
      <select name="status" required class="w-full px-3 py-2 border border-slate-300 rounded-md">
        <option>Pending</option>
        <option selected>In Progress</option>
        <option>Completed</option>
        <option>On Hold</option>
      </select>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Additional Notes</label>
      <textarea name="notes" class="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[100px]" placeholder="Add notes..."></textarea>
    </div>
    <div class="flex gap-4 pt-4 border-t border-slate-200">
      <button type="button" class="flex-1 px-6 py-3 border border-slate-300 rounded-md hover:bg-slate-100" id="cancel">Cancel</button>
      <button type="submit" class="flex-1 px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700">Save Changes</button>
    </div>`;

  form.querySelector('#cancel').addEventListener('click', () => history.back());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Mitigation plan updated successfully!');
    navigate('/admin/dashboard');
  });

  main.append(back, form);
  root.append(header, main);
  container.appendChild(root);
}
