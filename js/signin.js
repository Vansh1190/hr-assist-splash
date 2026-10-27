/* ============================================================================
   signin.js — HR Assist sign-in (integration surface)
   ----------------------------------------------------------------------------
   The splash/onboarding hands off here (onboarding.js -> onDone()).
   This screen is built in the same design language and uses the same tokens
   from css/onboarding.css; the visual pass for it is still to come from
   "MSIL Enhancement Track" (sign-in node not shared yet).

   Public API
     mountSignIn(el, { onSubmit, onBack }) -> { destroy, form }

   No credentials are checked, stored or sent anywhere — wire `onSubmit`
   to your IAM endpoint when you have one.
   ========================================================================== */

const el = (tag, cls, attrs = {}) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
  return n;
};

export function mountSignIn(root, options = {}) {
  const opts = { onSubmit: null, onBack: null, ...options };
  root.innerHTML = '';
  root.dataset.tone = 'light';

  const screen = el('section', 'qnx-signin', { 'data-tag': 'signin_root', 'aria-labelledby': 'signin_title' });

  const mark = el('div', 'qnx-signin__mark', { 'aria-hidden': 'true' });
  const h = el('h2', null, { id: 'signin_title' });
  h.textContent = 'Sign in to HR Assist';
  const sub = el('p');
  sub.textContent = 'Use your Maruti employee credentials to continue.';

  const form = el('form', 'qnx-signin__form', { novalidate: 'novalidate', 'data-tag': 'signin_form' });
  form.innerHTML = `
    <div class="qnx-field">
      <label for="empId">Employee ID</label>
      <input id="empId" name="empId" type="text" autocomplete="username"
             inputmode="email" placeholder="e.g. 10029384" data-tag="signin_empid" />
    </div>
    <div class="qnx-field">
      <label for="pass">Password</label>
      <input id="pass" name="password" type="password" autocomplete="current-password"
             placeholder="••••••••" data-tag="signin_password" />
    </div>
    <button class="qnx-cta" type="submit" data-tag="signin_submit">Sign in</button>
    <p class="qnx-signin__error" data-tag="signin_error" role="alert" hidden></p>`;

  const note = el('p', 'qnx-note');
  note.textContent = 'Sign-in visuals are pending the Figma node — this screen carries the splash design tokens.';

  let back = null;
  if (typeof opts.onBack === 'function') {
    back = el('button', 'qnx-back', { type: 'button', 'data-tag': 'signin_back' });
    back.textContent = '↺ Watch the intro again';
    back.addEventListener('click', opts.onBack);
  }

  screen.append(mark, h, sub, form, note, ...(back ? [back] : []));
  root.append(screen);

  const empId = form.querySelector('#empId');
  const pass = form.querySelector('#pass');
  const btn = form.querySelector('button[type=submit]');
  const err = form.querySelector('.qnx-signin__error');

  const showError = (msg) => {
    err.textContent = msg;
    err.hidden = !msg;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showError('');
    if (!empId.value.trim() || !pass.value) {
      showError('Enter your employee ID and password.');
      (empId.value.trim() ? pass : empId).focus();
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    const payload = { empId: empId.value.trim() };
    if (typeof opts.onSubmit === 'function') {
      Promise.resolve(opts.onSubmit(payload, { password: pass.value }))
        .catch((reason) => {
          showError(reason?.message || 'Could not sign in. Try again.');
        })
        .finally(() => {
          btn.disabled = false;
          btn.textContent = 'Sign in';
        });
    } else {
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Sign in';
        showError('No identity provider wired up yet — pass onSubmit() to mountSignIn().');
      }, 650);
    }
  });

  empId.focus({ preventScroll: true });

  return {
    form,
    destroy() { root.innerHTML = ''; },
  };
}
