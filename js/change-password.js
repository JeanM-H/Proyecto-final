document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('change-password-form');
    const messageBox = document.getElementById('change-password-message');

    const query = new URLSearchParams(window.location.search);
    const email = query.get('email') || '';
    const role = query.get('role') || '';

    const emailInput = document.getElementById('email');
    const roleInput = document.getElementById('role');

    if (emailInput) {
        emailInput.value = email;
    }
    if (roleInput) {
        roleInput.value = role;
    }

    if (!email || !role) {
        messageBox.textContent = 'No se recibieron los datos necesarios. Regresa al inicio de sesión.';
        messageBox.style.color = '#dc2626';
    }

    if (!form) {
        return;
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const currentPassword = document.getElementById('current-password').value.trim();
        const newPassword = document.getElementById('new-password').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
            messageBox.textContent = 'Completa todos los campos para continuar.';
            messageBox.style.color = '#dc2626';
            return;
        }

        if (newPassword.length < 6) {
            messageBox.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            messageBox.style.color = '#dc2626';
            return;
        }

        if (newPassword !== confirmPassword) {
            messageBox.textContent = 'Las contraseñas no coinciden.';
            messageBox.style.color = '#dc2626';
            return;
        }

        try {
            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    role,
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json().catch(() => null);
            if (response.ok && data && data.success) {
                messageBox.textContent = 'Contraseña actualizada. Redirigiendo al inicio de sesión...';
                messageBox.style.color = '#16a34a';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1200);
                return;
            }

            messageBox.textContent = (data && data.message) ? data.message : 'Error al actualizar la contraseña.';
            messageBox.style.color = '#dc2626';
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            messageBox.textContent = 'Error de conexión con el servidor.';
            messageBox.style.color = '#dc2626';
        }
    });
});
