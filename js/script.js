document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const messageBox = document.getElementById('login-message');
    const loginPage = document.querySelector('.login-page');
    const homeSection = document.getElementById('home');
    const logoutBtn = document.getElementById('logout-btn');

    // Detectar la URL base de la API
    const apiBase = window.location.origin;

    loginForm.addEventListener('submit', async function(event) {
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

        messageBox.textContent = 'Verificando credenciales...';
        messageBox.style.color = '#0066cc';

        try {
            const response = await fetch(`${apiBase}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    role: role
                })
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const message = (data && data.message) ? data.message : 'Credenciales inválidas.';
                messageBox.textContent = message;
                messageBox.style.color = '#dc2626';
                return;
            }

            if (data && data.success) {
                messageBox.textContent = `¡Bienvenido, ${role}! Accediendo...`;
                messageBox.style.color = '#16a34a';

                setTimeout(() => {
                    loginPage.classList.add('hidden');
                    homeSection.classList.remove('hidden');
                }, 800);
            } else {
                const message = (data && data.message) ? data.message : 'Credenciales inválidas.';
                messageBox.textContent = message;
                messageBox.style.color = '#dc2626';
            }
        } catch (error) {
            messageBox.textContent = 'Error de conexión con el servidor.';
            messageBox.style.color = '#dc2626';
            console.error('Error:', error);
        }
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