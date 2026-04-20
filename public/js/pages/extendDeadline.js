import * as auth from '../auth.js';
import { brandHeader, btnOutline } from '../layout.js';
import { extendActionData } from '../data/mockData.js';

export function mount(container, { navigate, params }) {
  const actionId = params?.actionId || 'MIT-085';
  const action = extendActionData[actionId] || extendActionData['MIT-085'];
  const minDate = new Date().toISOString().split('T')[0];

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

  const summary = document.createElement('div');
  summary.className = 'bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6';
  summary.innerHTML = `
    <div class="flex items-start gap-3 mb-4">
      <div class="p-2 bg-amber-100 rounded-full text-xl">📅</div>
      <div class="flex-1">
        <h3 class="text-lg text-slate-800 mb-2">${action.task}</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><span class="text-slate-600">Action ID:</span> <span class="text-slate-800">${action.id}</span></div>
          <div><span class="text-slate-600">Assigned To:</span> <span class="text-slate-800">${action.assignedTo}</span></div>
          <div><span class="text-slate-600">Original Due Date:</span> <span class="text-slate-800">${action.dueDate}</span></div>
          <div><span class="text-slate-600">Days Overdue:</span> <span class="text-red-600">${action.daysOverdue} days</span></div>
          <div class="col-span-2"><span class="text-slate-600">Related Risk:</span> <span class="text-slate-800">${action.relatedRisk}</span></div>
        </div>
      </div>
    </div>
    <div class="border-t border-amber-200 pt-4"><p class="text-sm text-slate-700">${action.description}</p></div>`;

  const form = document.createElement('form');
  form.className = 'bg-white rounded-lg shadow-lg p-6 space-y-6';
  form.innerHTML = `
    <div>
      <label class="block text-sm text-slate-700 mb-2">Current Due Date</label>
      <input type="text" disabled value="${action.dueDate}" class="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-600" />
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">New Due Date <span class="text-red-500">*</span></label>
      <input name="newdue" type="date" required min="${minDate}" class="w-full px-3 py-2 border border-slate-300 rounded-md" />
      <p class="text-xs text-slate-500 mt-1">Select a future date for the new deadline</p>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Reason for Extension <span class="text-red-500">*</span></label>
      <select name="reason" required class="w-full px-3 py-2 border border-slate-300 rounded-md">
        <option value="">Select a reason...</option>
        <option value="resource_unavailability">Resource Unavailability</option>
        <option value="budget_constraints">Budget Constraints</option>
        <option value="technical_complexity">Technical Complexity</option>
        <option value="external_dependencies">External Dependencies</option>
        <option value="priority_change">Priority Change</option>
        <option value="unexpected_obstacles">Unexpected Obstacles</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Detailed Justification <span class="text-red-500">*</span></label>
      <textarea name="just" required class="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[120px]" placeholder="Explain why the deadline needs to be extended..."></textarea>
    </div>
    <div>
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="notify" checked class="w-4 h-4" />
        <span class="text-sm text-slate-700">Notify assigned team of deadline change</span>
      </label>
    </div>
    <div class="flex gap-4 pt-4 border-t border-slate-200">
      <button type="button" id="cancel" class="flex-1 px-6 py-3 border border-slate-300 rounded-md hover:bg-slate-100">Cancel</button>
      <button type="submit" class="flex-1 px-6 py-3 bg-amber-500 text-white rounded-md hover:bg-amber-600">Extend Deadline</button>
    </div>`;

  form.querySelector('#cancel').addEventListener('click', () => history.back());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Deadline extended successfully!');
    navigate('/admin/dashboard');
  });

  main.append(back, summary, form);
  root.append(header, main);
  container.appendChild(root);
}
