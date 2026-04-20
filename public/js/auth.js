const STORAGE_KEY = 'user';

const userProfiles = {
  guard: (username) => ({
    id: '1',
    username,
    role: 'guard',
    fullName: 'Juan dela Cruz',
  }),
  admin: (username) => ({
    id: '3',
    username,
    role: 'admin',
    fullName: 'Sir Apollo',
  }),
};

export function loadUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUser(user) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export async function login(username, password, role) {
  void password;
  await new Promise((r) => setTimeout(r, 500));
  const user = userProfiles[role](username);
  saveUser(user);
  return user;
}

export function logout() {
  sessionStorage.removeItem(STORAGE_KEY);
}
