document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const messageBox = document.getElementById('login-message');
    const apiBase = window.location.origin;

    if (!loginForm) {
        return;
    }

    const loginButton = document.getElementById('login-button');

    const handleLogin = async function() {
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

            function parseJwt(token) {
                if (!token) return null;
                const parts = token.split('.');
                if (parts.length !== 3) return null;
                try {
                    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                    return JSON.parse(jsonPayload);
                } catch (error) {
                    console.warn('No se pudo parsear JWT:', error);
                    return null;
                }
            }

            function getRoleFromToken(token) {
                const payload = parseJwt(token);
                return payload?.rol || payload?.role || null;
            }

            if (data && data.success) {
                if (data.token) {
                    localStorage.setItem('coolcare_token', data.token);
                    const tokenRole = getRoleFromToken(data.token);
                    const userRole = data.user?.rol || tokenRole || role;
                    localStorage.setItem('coolcare_role', userRole);
                    console.log('Login successful, token saved, role:', userRole);
                } else {
                    console.warn('Login exitoso pero no se recibió token.');
                }

                if (data.needsPasswordChange) {
                    const targetPage = `change-password.html?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`;
                    messageBox.textContent = `¡Bienvenido, ${role}! Redirigiendo para cambiar contraseña...`;
                    messageBox.style.color = '#16a34a';
                    setTimeout(() => {
                        window.location.href = targetPage;
                    }, 800);
                } else {
                    const tokenRole = getRoleFromToken(data.token);
                    const userRole = data.user?.rol || tokenRole || role;
                    const targetPage = userRole === 'Administrador' ? 'admin.html' : userRole === 'Técnico' ? 'tech.html' : 'client.html';
                    localStorage.setItem('coolcare_role', userRole);
                    messageBox.textContent = `¡Bienvenido, ${userRole}! Redirigiendo...`;
                    messageBox.style.color = '#16a34a';
                    setTimeout(() => {
                        window.location.href = targetPage;
                    }, 800);
                }
            } else {
                localStorage.removeItem('coolcare_token');
                localStorage.removeItem('coolcare_role');
                const message = (data && data.message) ? data.message : 'Credenciales inválidas.';
                messageBox.textContent = message;
                messageBox.style.color = '#dc2626';
            }
        } catch (error) {
            messageBox.textContent = 'Error de conexión con el servidor.';
            messageBox.style.color = '#dc2626';
            console.error('Error:', error);
        }
    };

    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
    });

});