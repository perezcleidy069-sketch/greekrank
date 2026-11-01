function showNotification(msg, type = 'info') {
    const banner = document.getElementById('notification-banner');
    const content = document.getElementById('notification-content');
    const messageEl = document.getElementById('notification-message');
    
    messageEl.textContent = msg;
    banner.classList.remove('hidden');
    content.classList.toggle('is-error', type === 'error');
    setTimeout(closeNotification, 4000);
}

function closeNotification() {
    document.getElementById('notification-banner').classList.add('hidden');
}

function openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const tabLogin = document.getElementById('auth-tab-login');
    const tabReg = document.getElementById('auth-tab-register');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.classList.add('is-active');
        tabReg.classList.remove('is-active');
        tabLogin.setAttribute('aria-selected', 'true');
        tabReg.setAttribute('aria-selected', 'false');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabReg.classList.add('is-active');
        tabLogin.classList.remove('is-active');
        tabReg.setAttribute('aria-selected', 'true');
        tabLogin.setAttribute('aria-selected', 'false');
    }
}

function navigateTo(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('is-active'));
    const activeLink = document.querySelector(`.nav-link[onclick="navigateTo('${viewId}')"]`);
    if (activeLink) activeLink.classList.add('is-active');
}