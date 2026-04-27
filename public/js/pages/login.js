import * as auth from '../auth.js';

export function mount(container, { navigate }) {
  container.className = 'min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center p-4';

  const wrap = document.createElement('div');
  wrap.className = 'w-full max-w-md mx-auto';

  const card = document.createElement('div');
  card.className = 'bg-white rounded-lg shadow-xl p-8';

  const brand = document.createElement('div');
  brand.className = 'text-center mb-8';
  const logo = document.createElement('img');
  logo.src = '/xu-logo.png';
  logo.alt = 'Xavier University';
  logo.className = 'h-32 mx-auto mb-4';
  const h1 = document.createElement('h1');
  h1.className = 'text-3xl mb-1 text-[var(--xu-blue)]';
  h1.textContent = 'CAMP-RISK';
  const sub = document.createElement('p');
  sub.className = 'text-slate-600';
  sub.textContent = 'Risk Management System';
  brand.append(logo, h1, sub);

  const notice = document.createElement('div');
  notice.className = 'mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md';
  notice.innerHTML =
    '<p class="text-sm text-slate-700">Secure authentication with role-based access control</p>';

  const errBox = document.createElement('div');
  errBox.className = 'hidden mb-6 p-3 bg-red-50 border border-red-200 rounded-md';
  const errP = document.createElement('p');
  errP.className = 'text-sm text-red-700';
  errBox.appendChild(errP);

  const form = document.createElement('form');
  form.className = 'space-y-6';

  const uLabel = document.createElement('label');
  uLabel.htmlFor = 'username';
  uLabel.className = 'block text-sm mb-2 text-slate-700';
  uLabel.textContent = 'Username';
  const user = document.createElement('input');
  user.id = 'username';
  user.type = 'text';
  user.required = true;
  user.className =
    'w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white';
  user.placeholder = 'Enter your username';

  const pLabel = document.createElement('label');
  pLabel.htmlFor = 'password';
  pLabel.className = 'block text-sm mb-2 text-slate-700';
  pLabel.textContent = 'Password';
  const pass = document.createElement('input');
  pass.id = 'password';
  pass.type = 'password';
  pass.required = true;
  pass.className = user.className;
  pass.placeholder = 'Enter your password';

  const rLabel = document.createElement('label');
  rLabel.htmlFor = 'role';
  rLabel.className = 'block text-sm mb-2 text-slate-700';
  rLabel.textContent = 'Role';
  const role = document.createElement('select');
  role.id = 'role';
  role.className = user.className;
  role.innerHTML =
    '<option value="guard">Security Guard (Regular User)</option><option value="admin">Administrator (SSIO Officer)</option>';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className =
    'w-full bg-[var(--xu-blue)] text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed';
  submit.textContent = 'Sign In';

  form.append(
    (() => {
      const d = document.createElement('div');
      d.append(uLabel, user);
      return d;
    })(),
    (() => {
      const d = document.createElement('div');
      d.append(pLabel, pass);
      return d;
    })(),
    (() => {
      const d = document.createElement('div');
      d.append(rLabel, role);
      return d;
    })(),
    submit,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('hidden');
    submit.disabled = true;
    submit.textContent = 'Signing In...';
    try {
      await auth.login(user.value, pass.value, role.value);
      if (role.value === 'guard') navigate('/guard/dashboard');
      else navigate('/admin/dashboard');
    } catch {
      errP.textContent = 'Invalid credentials. Please try again.';
      errBox.classList.remove('hidden');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Sign In';
    }
  });

  const foot = document.createElement('div');
  foot.className = 'mt-8 pt-6 border-t border-slate-200';
  foot.innerHTML = `
    <div class="text-center text-sm text-slate-500 mb-4">© 2026 Xavier University SSIO</div>
    <div class="text-xs text-slate-400 space-y-1">
      <p>Password: Bcrypt hashing with salt</p>
      <p>Session: JWT token-based authentication</p>
      <p>Audit: All actions logged for compliance</p>
    </div>`;

  card.append(brand, notice, errBox, form, foot);
  wrap.appendChild(card);
  container.appendChild(wrap);
}
