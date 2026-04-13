document.addEventListener('DOMContentLoaded', function () {
    const apiBase = window.location.origin;
    const form = document.getElementById('reset-password-form');
    const messageBox = document.getElementById('reset-password-message');
    const emailInput = document.getElementById('email');

    // Recuperar email de sessionStorage
    const recoveryEmail = sessionStorage.getItem('recovery-email');
    const recoveryRole = sessionStorage.getItem('recovery-role');

    if (!recoveryEmail || !recoveryRole) {
        messageBox.textContent = 'Acceso inválido. Por favor, solicita la recuperación nuevamente.';
        messageBox.className = 'login-message error';
        form.style.display = 'none';
    } else {
        emailInput.value = recoveryEmail;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = recoveryEmail;
            const role = recoveryRole;
            const recoveryCode = document.getElementById('recovery-code').value.trim();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                messageBox.textContent = 'Las contraseñas no coinciden.';
                messageBox.className = 'login-message error';
                return;
            }

            if (newPassword.length < 8) {
                messageBox.textContent = 'La contraseña debe tener al menos 8 caracteres.';
                messageBox.className = 'login-message error';
                return;
            }

            try {
                const response = await fetch(`${apiBase}/api/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email, 
                        role, 
                        recovery_code: recoveryCode,
                        new_password: newPassword 
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    messageBox.textContent = '';
                    messageBox.className = 'login-message';
                    
                    // Limpiar sessionStorage
                    sessionStorage.removeItem('recovery-email');
                    sessionStorage.removeItem('recovery-role');
                    
                    form.style.display = 'none';
                    const successDiv = document.createElement('div');
                    successDiv.className = 'success-card';
                    successDiv.innerHTML = `
                        <h3>✓ Contraseña actualizada</h3>
                        <p>Tu contraseña ha sido actualizada exitosamente.</p>
                        <p>Redirigiendo a la página de inicio de sesión...</p>
                    `;
                    messageBox.parentNode.insertBefore(successDiv, form);

                    // Redirigir a login después de 2 segundos
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    messageBox.textContent = data.message || 'Error al actualizar la contraseña.';
                    messageBox.className = 'login-message error';
                }
            } catch (error) {
                console.error('Error:', error);
                messageBox.textContent = 'Error de conexión. Intenta de nuevo.';
                messageBox.className = 'login-message error';
            }
        });
    }
});
