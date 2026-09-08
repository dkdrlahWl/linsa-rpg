const $ = id => document.getElementById(id);
let mode = 'login';
let busy = false;
const form = $('auth-form');
function feedback(message, kind = 'error') {
  $('feedback').textContent = message;
  $('feedback').dataset.kind = kind;
}
function setMode(next) {
  if (busy) return;
  mode = next;
  const registering = mode === 'register';
  $('login-tab').setAttribute('aria-pressed', String(!registering));
  $('register-tab').setAttribute('aria-pressed', String(registering));
  $('form-title').textContent = registering ? '새로운 전설의 시작' : '모험의 문을 열다';
  $('form-description').textContent = registering ? '당신의 모험을 기록할 계정을 만들어 주세요.' : '돌아오신 것을 환영합니다, 모험가님.';
  $('submit-label').textContent = registering ? '계정 만들기' : '모험 이어가기';
  $('confirm-field').hidden = !registering;
  $('password-confirm').disabled = !registering;
  $('password-confirm').required = registering;
  $('password').autocomplete = registering ? 'new-password' : 'current-password';
  form.action = `/api/${mode}`;
  feedback('');
}
$('login-tab').addEventListener('click', () => setMode('login'));
$('register-tab').addEventListener('click', () => setMode('register'));
for (const button of document.querySelectorAll('.visibility')) {
  button.addEventListener('click', () => {
    const input = $(button.dataset.for);
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    button.textContent = showing ? '숨기기' : '보기';
    button.setAttribute('aria-pressed', String(showing));
    button.setAttribute('aria-label', `${input.id === 'password-confirm' ? '비밀번호 확인' : '비밀번호'} ${showing ? '숨기기' : '표시'}`);
  });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const username = $('username').value.trim();
  const password = $('password').value;
  if (!username) { feedback('계정 이름을 입력해 주세요.'); $('username').focus(); return; }
  if (mode === 'register' && password !== $('password-confirm').value) {
    feedback('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
    $('password-confirm').focus(); return;
  }
  busy = true;
  for (const button of document.querySelectorAll('.tabs button, .submit')) button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  $('submit-label').textContent = mode === 'register' ? '계정을 만드는 중…' : '모험 기록을 확인하는 중…';
  feedback('');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/${mode}`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages = { 400: '입력한 계정 이름과 비밀번호 조건을 확인해 주세요.', 401: '계정 이름 또는 비밀번호가 올바르지 않습니다.', 403: '요청을 확인할 수 없습니다. 페이지를 새로고침해 주세요.', 409: '이미 사용 중인 계정 이름입니다.', 429: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' };
      const serverMessage = typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : '';
      throw new Error(messages[response.status] || (/[가-힣]/.test(serverMessage) ? serverMessage : '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'));
    }
    $('password').value = '';
    $('password-confirm').value = '';
    feedback('문이 열렸습니다. 모험으로 이동합니다…', 'success');
    window.location.assign('/linsa-rpg/');
  } catch (error) {
    feedback(error.name === 'AbortError' ? '응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.' : error instanceof TypeError ? '네트워크 연결을 확인해 주세요.' : error.message);
  } finally {
    clearTimeout(timeout);
    busy = false;
    for (const button of document.querySelectorAll('.tabs button, .submit')) button.disabled = false;
    form.setAttribute('aria-busy', 'false');
    $('submit-label').textContent = mode === 'register' ? '계정 만들기' : '모험 이어가기';
  }
});
