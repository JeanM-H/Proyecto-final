document.addEventListener('DOMContentLoaded', function () {
    const apiBase = window.location.origin;
    const form = document.getElementById('forgot-password-form');
    const messageBox = document.getElementById('forgot-password-message');
    const successCard = document.getElementById('success-message');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const role = document.querySelector('input[name="role"]:checked').value;

            try {
                const response = await fetch(`${apiBase}/api/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, role })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    messageBox.textContent = '';
                    messageBox.className = 'login-message';
                    
                    // Guardar email en sessionStorage para usar en reset-password
                    sessionStorage.setItem('recovery-email', email);
                    sessionStorage.setItem('recovery-role', role);
                    
                    form.style.display = 'none';
                    successCard.classList.remove('hidden');
                    
                    // Mostrar el código si es disponible (para desarrollo)
                    if (data.recovery_code) {
                        const codeDisplay = document.createElement('div');
                        codeDisplay.className = 'recovery-code-display';
                        codeDisplay.innerHTML = `<p><strong>Código de recuperación (para pruebas):</strong> <code>${data.recovery_code}</code></p>`;
                        successCard.appendChild(codeDisplay);
                    }

                    // Redirigir a reset-password después de 2 segundos
                    setTimeout(() => {
                        window.location.href = 'reset-password.html';
                    }, 3000);
                } else {
                    messageBox.textContent = data.message || 'Error al procesar tu solicitud.';
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
