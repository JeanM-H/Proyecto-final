document.addEventListener('DOMContentLoaded', function () {
    console.log('=== CLIENT.JS CARGADO ===');
    
    const apiBase = window.location.origin;
    const authToken = localStorage.getItem('coolcare_token');
    const storedRole = localStorage.getItem('coolcare_role');

    function parseJwt(tokenValue) {
        if (!tokenValue) return null;
        const parts = tokenValue.split('.');
        if (parts.length !== 3) return null;
        try {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
        }
    }

    const tokenRole = authToken ? (parseJwt(authToken)?.rol || parseJwt(authToken)?.role) : null;
    const userRole = tokenRole || storedRole;

    if (!authToken || !tokenRole || userRole !== 'Cliente') {
        localStorage.removeItem('coolcare_token');
        localStorage.removeItem('coolcare_role');
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
            if (ordenesResponse.ok && ordenesData?.success) {
                const ordenes = Array.isArray(ordenesData.ordenes) ? ordenesData.ordenes : [];
                const ordenesActivas = ordenes.filter(o => o.estado !== 'Completado' && o.estado !== 'Cancelado').length;
                elements.metricOrdenesActivas.textContent = ordenesActivas;
            } else {
                console.warn('Metricas cliente: respuesta inválida de ordenes', ordenesData);
                elements.metricOrdenesActivas.textContent = '0';
            }

            // Obtener cotizaciones pendientes
            const cotizacionesResponse = await fetch(`${apiBase}/api/clientes/me/cotizaciones`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(cotizacionesResponse)) return;
            const cotizacionesData = await cotizacionesResponse.json();
            if (cotizacionesResponse.ok && cotizacionesData?.success) {
                const cotizaciones = Array.isArray(cotizacionesData.cotizaciones) ? cotizacionesData.cotizaciones : [];
                const cotizacionesPendientes = cotizaciones.filter(c => c.estado === 'Pendiente').length;
                elements.metricCotizacionesPendientes.textContent = cotizacionesPendientes;
            } else {
                elements.metricCotizacionesPendientes.textContent = '0';
            }

            // Obtener equipos
            const equiposResponse = await fetch(`${apiBase}/api/clientes/me/equipos`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(equiposResponse)) return;
            const equiposData = await equiposResponse.json();
            if (equiposResponse.ok && equiposData?.success) {
                const equipos = Array.isArray(equiposData.equipos) ? equiposData.equipos : [];
                elements.metricEquipos.textContent = equipos.length;
                options.equipos = equipos;
                populateEquiposSelect();
            } else {
                elements.metricEquipos.textContent = '0';
                options.equipos = [];
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
            if (!response.ok || !data?.success) {
                elements.ordenesTableBody.innerHTML = '<tr><td colspan="6">No se pudieron cargar las órdenes.</td></tr>';
                return;
            }
            const ordenes = Array.isArray(data.ordenes) ? data.ordenes : [];
            if (ordenes.length === 0) {
                elements.ordenesTableBody.innerHTML = '<tr><td colspan="6">No tienes órdenes registradas.</td></tr>';
                return;
            }
            elements.ordenesTableBody.innerHTML = '';
            ordenes.forEach(orden => {
                const equipoInfo = orden.equipo ? `${orden.equipo.marca} ${orden.equipo.modelo}` : 'N/A';
                const tecnicoInfo = orden.tecnico ? orden.tecnico.especialidad : 'No asignado';
                const fechaProgramada = orden.fecha_programada ? new Date(orden.fecha_programada).toLocaleDateString('es-CO') : 'No definida';
                
                const estadoClass = `badge-${orden.estado.toLowerCase().replace(/\s+/g, '-')}`;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${orden.id}</td>
                    <td>${equipoInfo}</td>
                    <td>${orden.tipo}</td>
                    <td><span class="badge ${estadoClass}">${orden.estado}</span></td>
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
                
                const estadoClass = `badge-${cotizacion.estado.toLowerCase().replace(/\s+/g, '-')}`;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${cotizacion.id}</td>
                    <td>${cotizacion.descripcion}</td>
                    <td>$${monto}</td>
                    <td><span class="badge ${estadoClass}">${cotizacion.estado}</span></td>
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
        elements.equiposTableBody.innerHTML = '<tr><td colspan="8">Cargando equipos...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/clientes/me/equipos`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.equiposTableBody.innerHTML = '<tr><td colspan="8">No se pudieron cargar los equipos.</td></tr>';
                return;
            }
            const equipos = data.equipos || [];
            if (equipos.length === 0) {
                elements.equiposTableBody.innerHTML = '<tr><td colspan="8">No tienes equipos registrados.</td></tr>';
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
                    <td class="table-actions">
                        <div class="action-menu">
                            <button type="button" class="action-menu-trigger" aria-haspopup="true" aria-expanded="false" data-id="${equipo.id}">⋮</button>
                            <div class="action-menu-dropdown hidden" role="menu">
                                <button type="button" class="action-menu-item action-menu-edit" data-id="${equipo.id}" role="menuitem">Editar</button>
                                <button type="button" class="action-menu-item action-menu-delete" data-id="${equipo.id}" role="menuitem">Eliminar</button>
                            </div>
                        </div>
                    </td>
                `;
                elements.equiposTableBody.appendChild(row);
            });
            options.equipos = equipos;
            populateEquiposSelect();
        } catch (error) {
            console.error('Error cargando equipos:', error);
            elements.equiposTableBody.innerHTML = '<tr><td colspan="8">Error al cargar equipos.</td></tr>';
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
        console.log('openDrawer() llamado con formType:', formType);
        console.log('drawer:', drawer);
        if (!drawer) {
            console.error('ERROR: drawer no existe!');
            return;
        }
        
        drawerForms.forEach(form => {
            form.classList.remove('active');
            form.classList.add('hidden');
        });
        
        const normalizedFormType = formType || 'solicitar-servicio';
        const activeForm = document.getElementById(`drawer-form-${normalizedFormType}`);
        console.log('Buscando formulario:', `drawer-form-${normalizedFormType}`);
        console.log('activeForm:', activeForm);
        
        if (!activeForm) {
            console.warn(`No se encontró el formulario para: ${normalizedFormType}`);
            return;
        }
        
        activeForm.classList.add('active');
        activeForm.classList.remove('hidden');
        
        drawerTitle.textContent = activeForm.dataset.title || 'Formulario';

        console.log('Agregando clase open a drawer y drawerBackdrop');
        drawer.classList.add('open');
        drawerBackdrop.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        console.log('drawer.classList:', drawer.classList);
        console.log('drawerBackdrop.classList:', drawerBackdrop.classList);
    }

    function bindFormDrawerButtons() {
        console.log('=== BIND FORM DRAWER BUTTONS ===');
        
        document.body.addEventListener('click', event => {
            console.log('Click en body, target:', event.target.tagName, 'classes:', event.target.className);
            
            const button = event.target.closest('.open-drawer-btn');
            if (!button) {
                console.log('No es botón de drawer');
                return;
            }
            
            console.log('✓ BOTÓN DE DRAWER ENCONTRADO!', button.dataset.form);
            event.preventDefault();
            event.stopPropagation();
            
            const formType = button.dataset.form || 'solicitar-servicio';
            console.log('Abriendo drawer con formType:', formType);
            openDrawer(formType);
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

    function closeActionMenus() {
        document.querySelectorAll('.action-menu-dropdown.open').forEach(menu => {
            menu.classList.remove('open');
            menu.classList.add('hidden');
            const trigger = menu.previousElementSibling;
            if (trigger && trigger.classList.contains('action-menu-trigger')) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function toggleActionMenu(trigger) {
        const menu = trigger.nextElementSibling;
        if (!menu) return;
        const isOpen = !menu.classList.contains('hidden');
        closeActionMenus();
        if (!isOpen) {
            menu.classList.remove('hidden');
            menu.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
        }
    }

    async function handleEditEquipo(event) {
        const equipoId = parseInt(event.target.dataset.id);
        const equipo = options.equipos.find(e => e.id === equipoId);

        if (!equipo) return;

        document.getElementById('editar-equipo-marca').value = equipo.marca || '';
        document.getElementById('editar-equipo-modelo').value = equipo.modelo || '';
        document.getElementById('editar-equipo-serial').value = equipo.serial || '';
        document.getElementById('editar-equipo-tipo').value = equipo.tipo || '';
        document.getElementById('editar-equipo-ubicacion').value = equipo.ubicacion || '';
        document.getElementById('editar-equipo-estado').value = equipo.estado || 'Activo';

        drawerTitle.textContent = `Editar Equipo - ID: ${equipoId}`;
        const editarEquipoForm = document.getElementById('editar-equipo-form');
        editarEquipoForm.dataset.equipoId = equipoId;

        openDrawer('editar-equipo');
    }

    async function handleDeleteEquipo(event) {
        const equipoId = parseInt(event.target.dataset.id);
        
        if (confirm('¿Estás seguro de que deseas eliminar este equipo? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${apiBase}/api/equipos/${equipoId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() }
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();

                if (response.ok && data.success) {
                    setFormMessage('editar-equipo-form-message', 'Equipo eliminado correctamente.', 'success');
                    fetchEquipos();
                    fetchMetrics();
                } else {
                    setFormMessage('editar-equipo-form-message', data.message || 'Error al eliminar equipo.', 'error');
                }
            } catch (error) {
                console.error('Error eliminando equipo:', error);
                setFormMessage('editar-equipo-form-message', 'Error de conexión.', 'error');
            }
        }
    }

    function bindActionMenuEvents() {
        console.log('bindActionMenuEvents: agregando listener global al document.body');

        // Usar delegación en el body - necesita ser global porque la tabla se recarga dinámicamente
        document.body.addEventListener('click', event => {
            // Solo procesar si está dentro de la tabla de equipos
            const equiposBtn = event.target.closest('.action-menu-trigger, .action-menu-edit, .action-menu-delete');
            if (!equiposBtn) return;
            
            // Verificar que esté dentro de la tabla de equipos
            if (!event.target.closest('#equipos-table-body')) return;

            console.log('*** CLICK en botón de equipos ***', equiposBtn.className);
            
            const trigger = event.target.closest('.action-menu-trigger');
            if (trigger) {
                console.log('✓ Trigger encontrado');
                event.stopPropagation();
                toggleActionMenu(trigger);
                return;
            }

            const editButton = event.target.closest('.action-menu-edit');
            if (editButton) {
                console.log('✓ Editar encontrado, ID:', editButton.dataset.id);
                event.stopPropagation();
                handleEditEquipo({ target: editButton });
                closeActionMenus();
                return;
            }

            const deleteButton = event.target.closest('.action-menu-delete');
            if (deleteButton) {
                console.log('✓ Eliminar encontrado, ID:', deleteButton.dataset.id);
                event.stopPropagation();
                handleDeleteEquipo({ target: deleteButton });
                closeActionMenus();
                return;
            }
        });
    }

    // Formulario de edición de equipo
    const editarEquipoForm = document.getElementById('editar-equipo-form');
    if (editarEquipoForm) {
        editarEquipoForm.addEventListener('submit', async event => {
            event.preventDefault();
            const equipoId = parseInt(editarEquipoForm.dataset.equipoId);

            const payload = {
                marca: document.getElementById('editar-equipo-marca').value.trim(),
                modelo: document.getElementById('editar-equipo-modelo').value.trim(),
                serial: document.getElementById('editar-equipo-serial').value.trim(),
                tipo: document.getElementById('editar-equipo-tipo').value.trim(),
                ubicacion: document.getElementById('editar-equipo-ubicacion').value.trim(),
                estado: document.getElementById('editar-equipo-estado').value
            };

            try {
                const response = await fetch(`${apiBase}/api/equipos/${equipoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify(payload)
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();
                if (response.ok && data.success) {
                    setFormMessage('editar-equipo-form-message', 'Equipo actualizado correctamente.', 'success');
                    setTimeout(() => {
                        closeDrawer();
                        fetchEquipos();
                        fetchMetrics();
                    }, 1000);
                } else {
                    setFormMessage('editar-equipo-form-message', data.message || 'Error al actualizar equipo.', 'error');
                }
            } catch (error) {
                console.error('Error actualizando equipo:', error);
                setFormMessage('editar-equipo-form-message', 'Error de conexión.', 'error');
            }
        });
    }

    // Bind tabs using delegation so the buttons work even if the DOM changes
    document.body.addEventListener('click', event => {
        const tab = event.target.closest('.admin-tab');
        if (!tab) return;
        event.preventDefault();
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

    // Initialize
    console.log('===== INICIALIZANDO CLIENT.JS =====');
    console.log('elements.equiposTableBody:', elements.equiposTableBody);
    fetchClientInfo();
    fetchMetrics();
    fetchOrdenes();
    bindFormDrawerButtons();
    console.log('Inicial - llamando a bindActionMenuEvents()...');
    bindActionMenuEvents();
    showClientSection('admin-ordenes');
});