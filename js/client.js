document.addEventListener('DOMContentLoaded', function () {
    const apiBase = window.location.origin;
    const authToken = localStorage.getItem('coolcare_token');

    if (!authToken) {
        window.location.href = 'login.html';
        return;
    }

    const clientTabs = document.querySelectorAll('.admin-tab');

    const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('coolcare_token')}` });

    const redirectToLogin = () => {
        localStorage.removeItem('coolcare_token');
        localStorage.removeItem('coolcare_role');
        window.location.href = 'login.html';
    };

    const handleUnauthorized = (response) => {
        if (response.status === 401) {
            redirectToLogin();
            return true;
        }
        return false;
    };

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', () => {
            localStorage.removeItem('coolcare_token');
            localStorage.removeItem('coolcare_role');
            window.location.href = 'login.html';
        });
    }

    const elements = {
        clienteInfo: document.getElementById('cliente-info'),
        metricOrdenesActivas: document.getElementById('metric-ordenes-activas'),
        metricCotizacionesPendientes: document.getElementById('metric-cotizaciones-pendientes'),
        metricEquipos: document.getElementById('metric-equipos'),
        ordenesTableBody: document.getElementById('ordenes-table-body'),
        cotizacionesTableBody: document.getElementById('cotizaciones-table-body'),
        equiposTableBody: document.getElementById('equipos-table-body')
    };

    const options = {
        equipos: []
    };

    const drawer = document.getElementById('form-drawer');
    const drawerBackdrop = document.getElementById('drawer-backdrop');
    const drawerTitle = document.getElementById('drawer-title');
    const closeDrawerButton = document.getElementById('close-drawer');
    const drawerForms = document.querySelectorAll('.drawer-form');

    function setFormMessage(selector, message, type = '') {
        const element = document.getElementById(selector);
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('success', type === 'success');
        element.classList.toggle('error', type === 'error');
    }

    function showClientSection(sectionId) {
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => {
            section.classList.toggle('hidden', section.id !== sectionId);
        });

        clientTabs.forEach(tab => {
            tab.classList.toggle('active', `admin-${tab.dataset.section}` === sectionId);
        });
    }

    async function fetchClientInfo() {
        try {
            const response = await fetch(`${apiBase}/api/clientes/me`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (response.ok && data.success && data.cliente) {
                const cliente = data.cliente;
                elements.clienteInfo.innerHTML = `
                    <strong>${cliente.empresa}</strong><br>
                    ${cliente.usuario?.email || 'N/A'} | ${cliente.telefono || 'Sin teléfono'}<br>
                    ${cliente.ciudad || 'Sin ciudad'}, ${cliente.pais || 'Sin país'}
                `;
            }
        } catch (error) {
            console.error('Error cargando información del cliente:', error);
            elements.clienteInfo.textContent = 'Error al cargar información del cliente';
        }
    }

    async function fetchMetrics() {
        try {
            // Obtener órdenes activas
            const ordenesResponse = await fetch(`${apiBase}/api/clientes/me/ordenes`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(ordenesResponse)) return;
            const ordenesData = await ordenesResponse.json();
            if (ordenesResponse.ok && ordenesData.success) {
                const ordenesActivas = ordenesData.ordenes.filter(o => o.estado !== 'Completado' && o.estado !== 'Cancelado').length;
                elements.metricOrdenesActivas.textContent = ordenesActivas;
            }

            // Obtener cotizaciones pendientes
            const cotizacionesResponse = await fetch(`${apiBase}/api/clientes/me/cotizaciones`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(cotizacionesResponse)) return;
            const cotizacionesData = await cotizacionesResponse.json();
            if (cotizacionesResponse.ok && cotizacionesData.success) {
                const cotizacionesPendientes = cotizacionesData.cotizaciones.filter(c => c.estado === 'Pendiente').length;
                elements.metricCotizacionesPendientes.textContent = cotizacionesPendientes;
            }

            // Obtener equipos
            const equiposResponse = await fetch(`${apiBase}/api/clientes/me/equipos`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(equiposResponse)) return;
            const equiposData = await equiposResponse.json();
            if (equiposResponse.ok && equiposData.success) {
                elements.metricEquipos.textContent = equiposData.equipos.length;
                options.equipos = equiposData.equipos;
                populateEquiposSelect();
            }
        } catch (error) {
            console.error('Error cargando métricas:', error);
        }
    }

    async function fetchOrdenes() {
        if (!elements.ordenesTableBody) return;
        elements.ordenesTableBody.innerHTML = '<tr><td colspan="6">Cargando órdenes...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/clientes/me/ordenes`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.ordenesTableBody.innerHTML = '<tr><td colspan="6">No se pudieron cargar las órdenes.</td></tr>';
                return;
            }
            const ordenes = data.ordenes || [];
            if (ordenes.length === 0) {
                elements.ordenesTableBody.innerHTML = '<tr><td colspan="6">No tienes órdenes registradas.</td></tr>';
                return;
            }
            elements.ordenesTableBody.innerHTML = '';
            ordenes.forEach(orden => {
                const equipoInfo = orden.equipo ? `${orden.equipo.marca} ${orden.equipo.modelo}` : 'N/A';
                const tecnicoInfo = orden.tecnico ? orden.tecnico.especialidad : 'No asignado';
                const fechaProgramada = orden.fecha_programada ? new Date(orden.fecha_programada).toLocaleDateString('es-CO') : 'No definida';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${orden.id}</td>
                    <td>${equipoInfo}</td>
                    <td>${orden.tipo}</td>
                    <td><span class="status-${orden.estado.toLowerCase().replace(' ', '-')}">${orden.estado}</span></td>
                    <td>${fechaProgramada}</td>
                    <td>${tecnicoInfo}</td>
                `;
                elements.ordenesTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando órdenes:', error);
            elements.ordenesTableBody.innerHTML = '<tr><td colspan="6">Error al cargar órdenes.</td></tr>';
        }
    }

    async function fetchCotizaciones() {
        if (!elements.cotizacionesTableBody) return;
        elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="5">Cargando cotizaciones...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/clientes/me/cotizaciones`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="5">No se pudieron cargar las cotizaciones.</td></tr>';
                return;
            }
            const cotizaciones = data.cotizaciones || [];
            if (cotizaciones.length === 0) {
                elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="5">No tienes cotizaciones registradas.</td></tr>';
                return;
            }
            elements.cotizacionesTableBody.innerHTML = '';
            cotizaciones.forEach(cotizacion => {
                const fechaSolicitud = cotizacion.fecha_solicitud ? new Date(cotizacion.fecha_solicitud).toLocaleDateString('es-CO') : 'N/A';
                const monto = Number(cotizacion.monto_estimado).toFixed(2);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${cotizacion.id}</td>
                    <td>${cotizacion.descripcion}</td>
                    <td>$${monto}</td>
                    <td><span class="status-${cotizacion.estado.toLowerCase()}">${cotizacion.estado}</span></td>
                    <td>${fechaSolicitud}</td>
                `;
                elements.cotizacionesTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando cotizaciones:', error);
            elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="5">Error al cargar cotizaciones.</td></tr>';
        }
    }

    async function fetchEquipos() {
        if (!elements.equiposTableBody) return;
        elements.equiposTableBody.innerHTML = '<tr><td colspan="7">Cargando equipos...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/clientes/me/equipos`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.equiposTableBody.innerHTML = '<tr><td colspan="7">No se pudieron cargar los equipos.</td></tr>';
                return;
            }
            const equipos = data.equipos || [];
            if (equipos.length === 0) {
                elements.equiposTableBody.innerHTML = '<tr><td colspan="7">No tienes equipos registrados.</td></tr>';
                return;
            }
            elements.equiposTableBody.innerHTML = '';
            equipos.forEach(equipo => {
                const fechaInstalacion = equipo.fecha_instalacion ? new Date(equipo.fecha_instalacion).toLocaleDateString('es-CO') : 'N/A';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${equipo.id}</td>
                    <td>${equipo.marca}</td>
                    <td>${equipo.modelo}</td>
                    <td>${equipo.serial}</td>
                    <td>${equipo.tipo}</td>
                    <td><span class="status-${equipo.estado.toLowerCase().replace(' ', '-')}">${equipo.estado}</span></td>
                    <td>${equipo.ubicacion || 'N/A'}</td>
                `;
                elements.equiposTableBody.appendChild(row);
            });
            options.equipos = equipos;
            populateEquiposSelect();
        } catch (error) {
            console.error('Error cargando equipos:', error);
            elements.equiposTableBody.innerHTML = '<tr><td colspan="7">Error al cargar equipos.</td></tr>';
        }
    }

    function populateEquiposSelect() {
        const equipoSelect = document.getElementById('servicio-equipo');
        if (!equipoSelect) return;

        equipoSelect.innerHTML = '<option value="">Seleccione un equipo</option>';
        options.equipos.forEach(equipo => {
            const option = document.createElement('option');
            option.value = equipo.id;
            option.textContent = `${equipo.marca} ${equipo.modelo} (${equipo.serial}) - ${equipo.ubicacion || 'Sin ubicación'}`;
            equipoSelect.appendChild(option);
        });
    }

    function closeDrawer() {
        if (!drawer) return;
        drawer.classList.remove('open');
        drawerBackdrop.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        drawerForms.forEach(form => {
            form.classList.remove('active');
            form.classList.add('hidden');
        });
    }

    function openDrawer(formType) {
        if (!drawer) return;
        drawerForms.forEach(form => {
            form.classList.remove('active');
            form.classList.add('hidden');
        });
        const activeForm = document.getElementById(`drawer-form-${formType}`);
        if (!activeForm) return;
        activeForm.classList.add('active');
        activeForm.classList.remove('hidden');

        drawerTitle.textContent = activeForm.dataset.title || 'Formulario';

        drawer.classList.add('open');
        drawerBackdrop.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function bindFormDrawerButtons() {
        document.querySelectorAll('.open-drawer-btn').forEach(button => {
            button.addEventListener('click', () => {
                openDrawer(button.dataset.form);
            });
        });

        if (closeDrawerButton) {
            closeDrawerButton.addEventListener('click', closeDrawer);
        }

        if (drawerBackdrop) {
            drawerBackdrop.addEventListener('click', closeDrawer);
        }

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                closeDrawer();
            }
        });
    }

    // Bind forms
    const solicitarServicioForm = document.getElementById('solicitar-servicio-form');
    if (solicitarServicioForm) {
        solicitarServicioForm.addEventListener('submit', async event => {
            event.preventDefault();

            const payload = {
                equipo_id: Number(document.getElementById('servicio-equipo').value),
                tipo: document.getElementById('servicio-tipo').value,
                descripcion: document.getElementById('servicio-descripcion').value.trim(),
                fecha_deseada: document.getElementById('servicio-fecha').value || null
            };

            try {
                const response = await fetch(`${apiBase}/api/clientes/me/solicitudes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify(payload)
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();
                if (response.ok && data.success) {
                    setFormMessage('solicitar-servicio-form-message', 'Solicitud enviada correctamente. Te contactaremos pronto.', 'success');
                    solicitarServicioForm.reset();
                    setTimeout(() => {
                        closeDrawer();
                        fetchOrdenes();
                        fetchMetrics();
                    }, 2000);
                } else {
                    setFormMessage('solicitar-servicio-form-message', data.message || 'Error al enviar la solicitud.', 'error');
                }
            } catch (error) {
                console.error('Error enviando solicitud:', error);
                setFormMessage('solicitar-servicio-form-message', 'Error de conexión.', 'error');
            }
        });
    }

    // Bind tabs
    clientTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sectionId = `admin-${tab.dataset.section}`;
            showClientSection(sectionId);

            // Load data based on section
            if (tab.dataset.section === 'ordenes') {
                fetchOrdenes();
            } else if (tab.dataset.section === 'cotizaciones') {
                fetchCotizaciones();
            } else if (tab.dataset.section === 'equipos') {
                fetchEquipos();
            }
        });
    });

    // Initialize
    fetchClientInfo();
    fetchMetrics();
    fetchOrdenes();
    bindFormDrawerButtons();
    showClientSection('admin-ordenes');
});