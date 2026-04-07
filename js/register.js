document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const ciudad = document.getElementById('ciudad').value.trim();
    const pais = document.getElementById('pais').value.trim();
    const empresa = document.getElementById('empresa').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    const messageDiv = document.getElementById('message');
    messageDiv.textContent = '';
    messageDiv.className = 'message';

    // Validaciones básicas
    if (password !== confirmPassword) {
        messageDiv.textContent = 'Las contraseñas no coinciden.';
        messageDiv.classList.add('error');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        messageDiv.textContent = 'Formato de email incorrecto.';
        messageDiv.classList.add('error');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nombre,
                apellido,
                email,
                telefono: telefono || null,
                direccion: direccion || null,
                ciudad: ciudad || null,
                pais: pais || null,
                empresa: empresa || null,
                password,
                rol: 'Cliente'
            }),
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.textContent = 'Registro exitoso. Redirigiendo al login...';
            messageDiv.classList.add('success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            messageDiv.textContent = data.error || 'Error en el registro.';
            messageDiv.classList.add('error');
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.textContent = 'Error de conexión. Inténtalo de nuevo.';
        messageDiv.classList.add('error');
    }
});