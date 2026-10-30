function showNotification(msg, type = 'info') {
    const banner = document.getElementById('notification-banner');
    const content = document.getElementById('notification-content');
    const messageEl = document.getElementById('notification-message');
    
    messageEl.textContent = msg;
    banner.classList.remove('hidden');
    
    if (type === 'error') {
        content.className = "p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between border shadow-lg bg-red-900/80 border-red-500 text-white";
    } else {
        content.className = "p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between border shadow-lg bg-cardBg border-goldAccent text-goldAccent";
    }

    setTimeout(closeNotification, 4000);
}

function closeNotification() {
    document.getElementById('notification-banner').classList.add('hidden');
}

function navigateTo(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden');
}

function openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const tabLogin = document.getElementById('auth-tab-login');
    const tabReg = document.getElementById('auth-tab-register');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.className = "w-1/2 pb-2 text-goldAccent border-b-2 border-goldAccent font-bold text-xs uppercase";
        tabReg.className = "w-1/2 pb-2 text-gray-400 font-bold text-xs uppercase";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabReg.className = "w-1/2 pb-2 text-goldAccent border-b-2 border-goldAccent font-bold text-xs uppercase";
        tabLogin.className = "w-1/2 pb-2 text-gray-400 font-bold text-xs uppercase";
    }
}