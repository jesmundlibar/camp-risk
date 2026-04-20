import { brandHeader, btnOutline } from '../layout.js';

export function mount(container, { navigate, params }) {
  const reportId = params?.reportId || '—';

  const root = document.createElement('div');
  root.className = 'min-h-screen bg-slate-50';

  const header = document.createElement('header');
  header.className = 'bg-white shadow-sm border-b border-slate-200';
  const hi = document.createElement('div');
  hi.className = 'max-w-7xl mx-auto px-6 py-4 flex items-center justify-between';
  hi.append(brandHeader({}), btnOutline('Dashboard', () => navigate('/admin/dashboard')));
  header.appendChild(hi);

  const main = document.createElement('main');
  main.className = 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8';

  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg shadow-lg p-6 sm:p-8 lg:p-10';

  let likelihood = '';
  let severity = '';

  const head = document.createElement('div');
  head.className = 'flex items-center justify-between mb-6 flex-wrap gap-2';
  head.innerHTML = `<h2 class="text-2xl text-slate-800">Risk Assessment - Report #${escapeHtml(reportId)}</h2>`;
  const saveDraft = document.createElement('button');
  saveDraft.type = 'button';
  saveDraft.className = 'flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100';
  saveDraft.textContent = 'Save Draft';
  saveDraft.addEventListener('click', () => alert('Draft saved successfully!'));
  head.appendChild(saveDraft);

  const form = document.createElement('form');
  form.className = 'space-y-8';
  form.innerHTML = `
    <div class="bg-slate-50 rounded-lg p-4 sm:p-6 lg:p-8 border border-slate-200">
      <h3 class="text-lg lg:text-xl text-slate-800 mb-4">Incident Details</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
        <div><span class="text-slate-600">Hazard:</span> <span class="ml-2 text-slate-800">Loose Electrical Wiring</span></div>
        <div><span class="text-slate-600">Location:</span> <span class="ml-2 text-slate-800">Building A, Floor 2, Room 201</span></div>
        <div><span class="text-slate-600">Reported:</span> <span class="ml-2 text-slate-800">April 1, 2024 - Juan dela Cruz</span></div>
        <div><button type="button" class="text-[var(--xu-blue)] hover:underline">[View Image]</button></div>
      </div>
    </div>
    <div>
      <label class="block text-slate-800 mb-3">Risk Classification</label>
      <select name="classification" required class="w-full px-4 py-2 border border-slate-300 rounded-md bg-white">
        <option value="">Select Risk</option>
        <option value="electrocution">Electrocution</option>
        <option value="fire">Fire Hazard</option>
        <option value="equipment">Equipment Damage</option>
        <option value="injury">Physical Injury</option>
        <option value="slip">Slip/Trip/Fall</option>
      </select>
    </div>
    <div>
      <label class="block text-slate-800 mb-3">Risk Rating</label>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm text-slate-600 mb-2">Likelihood (1-4)</label>
          <div class="flex gap-4 flex-wrap" id="like-group"></div>
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-2">Severity (1-4)</label>
          <div class="flex gap-4 flex-wrap" id="sev-group"></div>
        </div>
      </div>
      <div id="score-box" class="hidden mt-4 p-4 bg-slate-100 rounded-lg"></div>
    </div>
    <div>
      <label class="block text-slate-800 mb-3">Control Measures (HIRAC Framework)</label>
      <div class="space-y-4">
        <div><label class="block text-sm text-slate-600 mb-2">Engineering Controls</label>
          <input name="engineering" class="w-full px-4 py-2 border border-slate-300 rounded-md bg-white" placeholder="e.g., Replace wiring" /></div>
        <div><label class="block text-sm text-slate-600 mb-2">Administrative Controls</label>
          <input name="administrative" class="w-full px-4 py-2 border border-slate-300 rounded-md bg-white" placeholder="e.g., Post warning signs" /></div>
        <div><label class="block text-sm text-slate-600 mb-2">PPE Requirements</label>
          <input name="ppe" class="w-full px-4 py-2 border border-slate-300 rounded-md bg-white" placeholder="e.g., Insulated gloves" /></div>
      </div>
    </div>
    <div>
      <label class="block text-slate-800 mb-3">Mitigation Actions</label>
      <div id="action-rows" class="space-y-4"></div>
      <button type="button" id="add-action" class="text-[var(--xu-blue)] text-sm hover:underline mt-2">+ Add Another Action</button>
    </div>
    <div class="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-slate-200">
      <button type="button" id="req-info" class="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100">Request More Info</button>
      <button type="submit" class="w-full sm:w-auto px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700">Submit Assessment</button>
    </div>`;

  const likeGroup = () => form.querySelector('#like-group');
  const sevGroup = () => form.querySelector('#sev-group');
  const scoreBox = () => form.querySelector('#score-box');

  [1, 2, 3, 4].forEach((n) => {
    const l = document.createElement('label');
    l.className = 'flex items-center gap-2 cursor-pointer';
    l.innerHTML = `<input type="radio" name="likelihood" value="${n}" class="h-4 w-4" required /><span class="text-slate-700">${n}</span>`;
    l.querySelector('input').addEventListener('change', (e) => {
      likelihood = e.target.value;
      updateScore();
    });
    likeGroup().appendChild(l);
  });
  [1, 2, 3, 4].forEach((n) => {
    const l = document.createElement('label');
    l.className = 'flex items-center gap-2 cursor-pointer';
    l.innerHTML = `<input type="radio" name="severity" value="${n}" class="h-4 w-4" required /><span class="text-slate-700">${n}</span>`;
    l.querySelector('input').addEventListener('change', (e) => {
      severity = e.target.value;
      updateScore();
    });
    sevGroup().appendChild(l);
  });

  function updateScore() {
    const box = scoreBox();
    if (!likelihood || !severity) {
      box.classList.add('hidden');
      return;
    }
    const score = parseInt(likelihood, 10) * parseInt(severity, 10);
    let level = 'Low Risk';
    let badge = 'bg-green-100 text-green-800';
    if (score >= 12) {
      level = 'High Risk';
      badge = 'bg-red-100 text-red-800';
    } else if (score >= 6) {
      level = 'Medium Risk';
      badge = 'bg-yellow-100 text-yellow-800';
    }
    box.classList.remove('hidden');
    box.innerHTML = `<div class="flex items-center gap-3">
      <span class="text-xl">⚠</span>
      <div>
        <span class="text-slate-600">Calculated Score: </span>
        <span class="font-medium">${score}</span>
        <span class="ml-3 px-3 py-1 rounded-full text-sm ${badge}">${level}</span>
      </div>
    </div>`;
  }

  const actionRows = form.querySelector('#action-rows');
  function addActionRow() {
    const wrap = document.createElement('div');
    wrap.className = 'grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg';
    wrap.innerHTML = `
      <div class="lg:col-span-2">
        <label class="block text-sm text-slate-600 mb-2">Action</label>
        <input name="adesc" class="w-full px-4 py-2 border border-slate-300 rounded-md bg-white" placeholder="Describe the action" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-2">Due Date</label>
        <input name="adate" type="date" class="w-full px-4 py-2 border border-slate-300 rounded-md bg-white" />
      </div>`;
    actionRows.appendChild(wrap);
  }
  addActionRow();
  form.querySelector('#add-action').addEventListener('click', addActionRow);

  form.querySelector('#req-info').addEventListener('click', () => navigate(`/admin/request-info/${reportId}`));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Assessment submitted successfully!');
    navigate('/admin/dashboard');
  });

  card.append(head, form);
  main.appendChild(card);
  root.append(header, main);
  container.appendChild(root);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
