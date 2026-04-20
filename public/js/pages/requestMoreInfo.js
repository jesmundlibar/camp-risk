import * as auth from '../auth.js';
import { brandHeader, btnOutline } from '../layout.js';
import { reportRequestInfo } from '../data/mockData.js';

export function mount(container, { navigate, params }) {
  const reportId = params?.reportId || 'RISK-0421';
  const report = reportRequestInfo[reportId] || reportRequestInfo['RISK-0421'];

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
  summary.className = 'bg-white rounded-lg shadow-lg p-6 mb-6';
  summary.innerHTML = `
    <h3 class="text-lg text-slate-800 mb-4">Report Summary</h3>
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div><span class="text-slate-600">Report ID:</span> <span class="text-slate-800">${report.id}</span></div>
      <div><span class="text-slate-600">Reported by:</span> <span class="text-slate-800">${report.guard}</span></div>
      <div><span class="text-slate-600">Location:</span> <span class="text-slate-800">${report.location}</span></div>
      <div><span class="text-slate-600">Date:</span> <span class="text-slate-800">${report.date}</span></div>
      <div class="col-span-2"><span class="text-slate-600">Description:</span><p class="mt-1 text-slate-800">${report.description}</p></div>
    </div>`;

  const form = document.createElement('form');
  form.className = 'bg-white rounded-lg shadow-lg p-6 space-y-6';
  form.innerHTML = `
    <div>
      <label class="block text-sm text-slate-700 mb-2">Request Type</label>
      <select name="rtype" required class="w-full px-3 py-2 border border-slate-300 rounded-md">
        <option value="clarification">Request Clarification</option>
        <option value="additional_details">Request Additional Details</option>
        <option value="follow_up">Follow-up Information</option>
        <option value="verification">Request Verification</option>
      </select>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Specific Questions</label>
      <textarea name="questions" required class="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[120px]" placeholder="What specific information do you need?"></textarea>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-3">Additional Requirements</label>
      <div class="space-y-2">
        <label class="flex items-center gap-2"><input type="checkbox" name="photos" class="w-4 h-4" /> <span class="text-sm text-slate-700">Request additional photos</span></label>
        <label class="flex items-center gap-2"><input type="checkbox" name="meas" class="w-4 h-4" /> <span class="text-sm text-slate-700">Request measurements or dimensions</span></label>
        <label class="flex items-center gap-2"><input type="checkbox" name="witness" class="w-4 h-4" /> <span class="text-sm text-slate-700">Request witness statements</span></label>
      </div>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Other Information Needed</label>
      <textarea name="other" class="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[80px]" placeholder="Any other specific information..."></textarea>
    </div>
    <div>
      <label class="block text-sm text-slate-700 mb-2">Urgency</label>
      <select name="urgency" required class="w-full px-3 py-2 border border-slate-300 rounded-md">
        <option value="low">Low - Response within 3 days</option>
        <option value="normal" selected>Normal - Response within 24 hours</option>
        <option value="high">High - Response within 4 hours</option>
        <option value="urgent">Urgent - Immediate response required</option>
      </select>
    </div>
    <div class="flex gap-4 pt-4 border-t border-slate-200">
      <button type="button" id="cancel" class="flex-1 px-6 py-3 border border-slate-300 rounded-md hover:bg-slate-100">Cancel</button>
      <button type="submit" class="flex-1 px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700">Send Request</button>
    </div>`;

  form.querySelector('#cancel').addEventListener('click', () => history.back());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert(`Information request sent to ${report.guard}`);
    navigate('/admin/dashboard');
  });

  main.append(back, summary, form);
  root.append(header, main);
  container.appendChild(root);
}
