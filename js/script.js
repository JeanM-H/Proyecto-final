document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const messageBox = document.getElementById('login-message');
    const apiBase = window.location.origin;

    if (!loginForm) {
        return;
    }

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
            messageBox.textContent = 'Formato de email incorrecto.';
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
                const targetPage = role === 'Administrador' ? 'admin.html' : role === 'Técnico' ? 'tech.html' : 'client.html';
                messageBox.textContent = `¡Bienvenido, ${role}! Redirigiendo...`;
                messageBox.style.color = '#16a34a';

                setTimeout(() => {
                    window.location.href = targetPage;
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
});