document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const messageBox = document.getElementById('login-message');
    const loginPage = document.querySelector('.login-page');
    const homeSection = document.getElementById('home');
    const logoutBtn = document.getElementById('logout-btn');

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const email = loginForm.email.value.trim();
        const password = loginForm.password.value.trim();
        const role = loginForm.role.value;

        if (!email || !password) {
            messageBox.textContent = 'Completa todos los campos para continuar.';
            messageBox.style.color = '#dc2626';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            messageBox.textContent = 'Ingresa un correo válido.';
            messageBox.style.color = '#dc2626';
            return;
        }

        if (password.length < 6) {
            messageBox.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            messageBox.style.color = '#dc2626';
            return;
        }

        messageBox.textContent = `¡Bienvenido, ${role}! Accediendo...`;
        messageBox.style.color = '#16a34a';

        setTimeout(() => {
            loginPage.classList.add('hidden');
            homeSection.classList.remove('hidden');
        }, 800);
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            homeSection.classList.add('hidden');
            loginPage.classList.remove('hidden');
            messageBox.textContent = '';
            loginForm.reset();
        });
    }
});