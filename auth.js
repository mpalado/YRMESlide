const authClient = window.YRMECatalogDB?.client;

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function showAdmin() {
  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-login').classList.add('hidden');
  document.getElementById('admin-content').style.display = 'block';
  document.getElementById('admin-content').classList.remove('hidden');
  refreshIcons();
  window.dispatchEvent(new CustomEvent('yrme-admin-authenticated'));
}

function showLogin() {
  document.getElementById('admin-content').style.display = 'none';
  document.getElementById('admin-content').classList.add('hidden');
  document.getElementById('admin-login').style.display = '';
  document.getElementById('admin-login').classList.remove('hidden');
  refreshIcons();
}

document.getElementById('toggle-password').addEventListener('click', () => {
  const password = document.getElementById('login-password');
  const icon = document.getElementById('password-icon');
  const reveal = password.type === 'password';
  password.type = reveal ? 'text' : 'password';
  icon.setAttribute('data-lucide', reveal ? 'eye-off' : 'eye');
  document.getElementById('toggle-password').title = reveal ? 'Hide password' : 'Show password';
  refreshIcons();
});

document.getElementById('login-form').addEventListener('submit', async event => {
  event.preventDefault();

  if (!authClient) {
    document.getElementById('login-error').textContent = 'Supabase is not configured. Run the database setup first.';
    document.getElementById('login-error').classList.remove('hidden');
    return;
  }

  const email = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('remember-login').checked;
  const button = document.getElementById('login-button');
  const error = document.getElementById('login-error');

  button.disabled = true;
  button.innerHTML = '<span class="animate-pulse">Verifying...</span>';
  error.classList.add('hidden');

  const { error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password
  });

  if (!signInError) {
    if (!remember) {
      authClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          showLogin();
        }
      });
    }
    showAdmin();
  } else {
    error.textContent = signInError.message === 'Invalid login credentials'
      ? 'Incorrect email or password.'
      : signInError.message;
    error.classList.remove('hidden');
    button.disabled = false;
    button.innerHTML = '<i data-lucide="arrow-right" class="w-4 h-4"></i> Sign in';
    refreshIcons();
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await authClient?.auth.signOut();
  document.getElementById('login-form').reset();
  document.getElementById('login-username').value = 'sample1@gmail.com';
  showLogin();
  document.getElementById('login-password').focus();
});

async function restoreSession() {
  if (!authClient) {
    showLogin();
    return;
  }
  const { data } = await authClient.auth.getSession();
  if (data.session) {
    showAdmin();
  } else {
    showLogin();
  }
}

restoreSession();
