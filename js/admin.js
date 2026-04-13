document.addEventListener('DOMContentLoaded', function () {
    const apiBase = window.location.origin;
    const authToken = localStorage.getItem('coolcare_token');
    const userRole = localStorage.getItem('coolcare_role');

    if (!authToken || userRole !== 'Administrador') {
        localStorage.removeItem('coolcare_token');
        localStorage.removeItem('coolcare_role');
        window.location.href = 'login.html';
        return;
    }

    const adminTabs = document.querySelectorAll('.admin-tab');

    const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('coolcare_token')}` });

    const redirectToLogin = () => {
        localStorage.removeItem('coolcare_token');
        window.location.href = 'login.html';
    };

    const handleUnauthorized = (response) => {
        if (response.status === 401) {
            redirectToLogin();
            return true;
        }
        return false;
    };

    const logoutLink = document.querySelector('nav a[href="login.html"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', () => {
            localStorage.removeItem('coolcare_token');
            localStorage.removeItem('coolcare_role');
        });
    }


    const elements = {
        metricClientes: document.getElementById('metric-clientes'),
        metricEquipos: document.getElementById('metric-equipos'),
        metricTecnicos: document.getElementById('metric-tecnicos'),
        metricOrdenes: document.getElementById('metric-ordenes'),
        metricCotizaciones: document.getElementById('metric-cotizaciones'),
        metricRepuestos: document.getElementById('metric-repuestos'),
        clientesTableBody: document.getElementById('clientes-table-body'),
        equiposTableBody: document.getElementById('equipos-table-body'),
        tecnicosTableBody: document.getElementById('tecnicos-table-body'),
        ordenesTableBody: document.getElementById('ordenes-table-body'),
        cotizacionesTableBody: document.getElementById('cotizaciones-table-body'),
        repuestosTableBody: document.getElementById('repuestos-table-body'),
        evidenciasTableBody: document.getElementById('evidencias-table-body')
    };

    const options = {
        clientes: [],
        equipos: [],
        tecnicos: [],
        repuestos: []
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

    function showAdminSection(sectionId) {
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => {
            section.classList.toggle('hidden', section.id !== sectionId);
        });

        adminTabs.forEach(tab => {
            tab.classList.toggle('active', `admin-${tab.dataset.section}` === sectionId);
        });
    }

    async function fetchMetrics() {
        try {
            const response = await fetch(`${apiBase}/api/dashboard-metrics`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (response.ok && data.success && data.counts) {
                elements.metricClientes.textContent = data.counts.clientes || 0;
                elements.metricEquipos.textContent = data.counts.equipos || 0;
                elements.metricTecnicos.textContent = data.counts.tecnicos || 0;
                elements.metricOrdenes.textContent = data.counts.ordenes || 0;
                elements.metricCotizaciones.textContent = data.counts.cotizaciones || 0;
                
                // Load repuestos count
                try {
                    const repuestosResponse = await fetch(`${apiBase}/api/repuestos`, {
                        headers: authHeaders()
                    });
                    if (repuestosResponse.ok) {
                        const repuestosData = await repuestosResponse.json();
                        elements.metricRepuestos.textContent = (repuestosData.data || []).length || 0;
                    }
                } catch (err) {
                    console.warn('Could not load repuestos count:', err);
                    elements.metricRepuestos.textContent = 0;
                }
            }
        } catch (error) {
            console.error('Error cargando métricas:', error);
        }
    }

    async function fetchClientes() {
        if (!elements.clientesTableBody) return;
        elements.clientesTableBody.innerHTML = '<tr><td colspan="8">Cargando clientes...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/clientes`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.clientesTableBody.innerHTML = '<tr><td colspan="9">No se pudieron cargar los clientes.</td></tr>';
                return;
            }
            options.clientes = data.clientes || [];
            if (options.clientes.length === 0) {
                elements.clientesTableBody.innerHTML = '<tr><td colspan="9">No hay clientes registrados.</td></tr>';
                return;
            }
            elements.clientesTableBody.innerHTML = '';
            options.clientes.forEach(cliente => {
                const fullName = cliente.usuario?.nombre ? cliente.usuario.nombre.trim() : '';
                const displayName = fullName || 'N/A';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${cliente.id}</td>
                    <td>${displayName}</td>
                    <td>${cliente.empresa || 'N/A'}</td>
                    <td>${cliente.usuario?.email || 'N/A'}</td>
                    <td>${cliente.telefono || 'N/A'}</td>
                    <td>${cliente.ciudad || 'N/A'}</td>
                    <td>${cliente.pais || 'N/A'}</td>
                    <td>${new Date(cliente.created_at).toLocaleDateString('es-CO')}</td>
                    <td class="table-actions">
                        <div class="action-menu">
                            <button type="button" class="action-menu-trigger" aria-haspopup="true" aria-expanded="false" data-id="${cliente.id}">⋮</button>
                            <div class="action-menu-dropdown hidden" role="menu">
                                <button type="button" class="action-menu-item action-menu-edit" data-id="${cliente.id}" role="menuitem">Editar</button>
                                <button type="button" class="action-menu-item action-menu-delete" data-id="${cliente.id}" role="menuitem">Eliminar</button>
                            </div>
                        </div>
                    </td>
                `;
                elements.clientesTableBody.appendChild(row);
            });

            populateSelectOptions();
        } catch (error) {
            console.error('Error cargando clientes:', error);
            elements.clientesTableBody.innerHTML = '<tr><td colspan="9">Error al cargar clientes.</td></tr>';
        }
    }

    async function handleEditCliente(event) {
        const clienteId = parseInt(event.target.dataset.id);
        const cliente = options.clientes.find(c => c.id === clienteId);

        if (!cliente) return;

        let clienteNombre = cliente.usuario?.nombre || '';
        let clienteApellido = cliente.usuario?.apellido || '';

        if (!clienteApellido && clienteNombre.includes(' ')) {
            const nombreParts = clienteNombre.trim().split(' ');
            clienteApellido = nombreParts.pop();
            clienteNombre = nombreParts.join(' ');
        }

        document.getElementById('cliente-nombre').value = clienteNombre;
        document.getElementById('cliente-apellido').value = clienteApellido;
        document.getElementById('cliente-email').value = cliente.usuario?.email || '';
        document.getElementById('cliente-empresa').value = cliente.empresa || '';
        document.getElementById('cliente-telefono').value = cliente.telefono || '';
        document.getElementById('cliente-direccion').value = cliente.direccion || '';
        document.getElementById('cliente-ciudad').value = cliente.ciudad || '';
        document.getElementById('cliente-pais').value = cliente.pais || '';

        const drawerTitle = document.getElementById('drawer-title');
        const clienteForm = document.getElementById('cliente-form');
        
        console.log('[CLIENTE EDIT] abrir editar cliente', clienteId, cliente);
        drawerTitle.textContent = `Editar Cliente - ID: ${clienteId}`;
        clienteForm.dataset.mode = 'edit';
        clienteForm.dataset.clienteId = clienteId;

        openDrawer('cliente', { mode: 'edit' });
    }

    async function handleDeleteCliente(event) {
        const clienteId = parseInt(event.target.dataset.id);
        
        if (confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${apiBase}/api/clientes`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ id: clienteId })
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();

                if (response.ok && data.success) {
                    setFormMessage('cliente-form-message', 'Cliente eliminado correctamente.', 'success');
                    fetchClientes();
                    fetchMetrics();
                } else {
                    setFormMessage('cliente-form-message', data.message || 'Error al eliminar cliente.', 'error');
                }
            } catch (error) {
                console.error('Error eliminando cliente:', error);
                setFormMessage('cliente-form-message', 'Error de conexión.', 'error');
            }
        }
    }

    async function handleEditEquipo(event) {
        const equipoId = parseInt(event.target.dataset.id);
        const equipo = options.equipos.find(e => e.id === equipoId);

        if (!equipo) return;

        document.getElementById('edit-equipo-cliente').value = equipo.cliente_id || '';
        document.getElementById('edit-equipo-marca').value = equipo.marca || '';
        document.getElementById('edit-equipo-modelo').value = equipo.modelo || '';
        document.getElementById('edit-equipo-serial').value = equipo.serial || '';
        document.getElementById('edit-equipo-tipo').value = equipo.tipo || '';
        document.getElementById('edit-equipo-fecha').value = equipo.fecha_instalacion ? new Date(equipo.fecha_instalacion).toISOString().split('T')[0] : '';
        document.getElementById('edit-equipo-ubicacion').value = equipo.ubicacion || '';
        document.getElementById('edit-equipo-estado').value = equipo.estado || 'Activo';

        const drawerTitle = document.getElementById('drawer-title');
        const editEquipoForm = document.getElementById('edit-equipo-form');
        
        drawerTitle.textContent = `Editar Equipo - ID: ${equipoId}`;
        editEquipoForm.dataset.equipoId = equipoId;

        openDrawer('edit-equipo');
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
                    setFormMessage('edit-equipo-form-message', 'Equipo eliminado correctamente.', 'success');
                    fetchEquipos();
                    fetchMetrics();
                } else {
                    setFormMessage('edit-equipo-form-message', data.message || 'Error al eliminar equipo.', 'error');
                }
            } catch (error) {
                console.error('Error eliminando equipo:', error);
                setFormMessage('edit-equipo-form-message', 'Error de conexión.', 'error');
            }
        }
    }

    async function handleEditTecnico(event) {
        const tecnicoId = parseInt(event.target.dataset.id);
        const tecnico = options.tecnicos.find(t => t.id === tecnicoId);

        if (!tecnico) return;

        document.getElementById('edit-tecnico-especialidad').value = tecnico.especialidad || '';
        document.getElementById('edit-tecnico-telefono').value = tecnico.telefono_contacto || '';
        document.getElementById('edit-tecnico-disponible').value = tecnico.disponible ? 'true' : 'false';

        const drawerTitle = document.getElementById('drawer-title');
        const editTecnicoForm = document.getElementById('edit-tecnico-form');
        
        drawerTitle.textContent = `Editar Técnico - ID: ${tecnicoId}`;
        editTecnicoForm.dataset.tecnicoId = tecnicoId;

        openDrawer('edit-tecnico');
    }

    async function handleDeleteTecnico(event) {
        const tecnicoId = parseInt(event.target.dataset.id);
        
        if (confirm('¿Estás seguro de que deseas eliminar este técnico? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${apiBase}/api/tecnicos/${tecnicoId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() }
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();

                if (response.ok && data.success) {
                    setFormMessage('edit-tecnico-form-message', 'Técnico eliminado correctamente.', 'success');
                    fetchTecnicos();
                    fetchMetrics();
                } else {
                    setFormMessage('edit-tecnico-form-message', data.message || 'Error al eliminar técnico.', 'error');
                }
            } catch (error) {
                console.error('Error eliminando técnico:', error);
                setFormMessage('edit-tecnico-form-message', 'Error de conexión.', 'error');
            }
        }
    }

    async function handleEditOrden(event) {
        const ordenId = parseInt(event.target.dataset.id);
        const orden = await fetchOrdenById(ordenId);

        if (!orden) return;

        document.getElementById('edit-orden-cliente').value = orden.cliente_id || '';
        document.getElementById('edit-orden-equipo').value = orden.equipo_id || '';
        document.getElementById('edit-orden-tecnico').value = orden.tecnico_id || '';
        document.getElementById('edit-orden-tipo').value = orden.tipo || '';
        document.getElementById('edit-orden-descripcion').value = orden.descripcion || '';
        document.getElementById('edit-orden-fecha').value = orden.fecha_programada ? new Date(orden.fecha_programada).toISOString().split('T')[0] : '';
        document.getElementById('edit-orden-estado').value = orden.estado || 'Pendiente';

        const drawerTitle = document.getElementById('drawer-title');
        const editOrdenForm = document.getElementById('edit-orden-form');
        
        drawerTitle.textContent = `Editar Orden - ID: ${ordenId}`;
        editOrdenForm.dataset.ordenId = ordenId;

        openDrawer('edit-orden');
    }

    async function handleDeleteOrden(event) {
        const ordenId = parseInt(event.target.dataset.id);
        
        if (confirm('¿Estás seguro de que deseas eliminar esta orden? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${apiBase}/api/ordenes/${ordenId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() }
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();

                if (response.ok && data.success) {
                    setFormMessage('edit-orden-form-message', 'Orden eliminada correctamente.', 'success');
                    fetchOrdenes();
                    fetchMetrics();
                } else {
                    setFormMessage('edit-orden-form-message', data.message || 'Error al eliminar orden.', 'error');
                }
            } catch (error) {
                console.error('Error eliminando orden:', error);
                setFormMessage('edit-orden-form-message', 'Error de conexión.', 'error');
            }
        }
    }

    async function handleEditCotizacion(event) {
        const cotizacionId = parseInt(event.target.dataset.id);
        const cotizacion = await fetchCotizacionById(cotizacionId);

        if (!cotizacion) return;

        document.getElementById('edit-cotizacion-cliente').value = cotizacion.cliente_id || '';
        document.getElementById('edit-cotizacion-descripcion').value = cotizacion.descripcion || '';
        document.getElementById('edit-cotizacion-monto').value = cotizacion.monto_estimado || '';
        document.getElementById('edit-cotizacion-estado').value = cotizacion.estado || 'Pendiente';

        const drawerTitle = document.getElementById('drawer-title');
        const editCotizacionForm = document.getElementById('edit-cotizacion-form');
        
        drawerTitle.textContent = `Editar Cotización - ID: ${cotizacionId}`;
        editCotizacionForm.dataset.cotizacionId = cotizacionId;

        openDrawer('edit-cotizacion');
    }

    async function handleDeleteCotizacion(event) {
        const cotizacionId = parseInt(event.target.dataset.id);
        
        if (confirm('¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${apiBase}/api/cotizaciones/${cotizacionId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() }
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();

                if (response.ok && data.success) {
                    setFormMessage('edit-cotizacion-form-message', 'Cotización eliminada correctamente.', 'success');
                    fetchCotizaciones();
                    fetchMetrics();
                } else {
                    setFormMessage('edit-cotizacion-form-message', data.message || 'Error al eliminar cotización.', 'error');
                }
            } catch (error) {
                console.error('Error eliminando cotización:', error);
                setFormMessage('edit-cotizacion-form-message', 'Error de conexión.', 'error');
            }
        }
    }

    async function fetchOrdenById(ordenId) {
        try {
            const response = await fetch(`${apiBase}/api/ordenes/${ordenId}`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return null;
            const data = await response.json();
            return response.ok && data.success ? data.orden : null;
        } catch (error) {
            console.error('Error obteniendo orden:', error);
            return null;
        }
    }

    async function fetchCotizacionById(cotizacionId) {
        try {
            const response = await fetch(`${apiBase}/api/cotizaciones/${cotizacionId}`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return null;
            const data = await response.json();
            return response.ok && data.success ? data.cotizacion : null;
        } catch (error) {
            console.error('Error obteniendo cotización:', error);
            return null;
        }
    }

    async function fetchEquipos() {
        if (!elements.equiposTableBody) return;
        elements.equiposTableBody.innerHTML = '<tr><td colspan="7">Cargando equipos...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/equipos`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.equiposTableBody.innerHTML = '<tr><td colspan="7">No se pudieron cargar los equipos.</td></tr>';
                return;
            }
            options.equipos = data.equipos || [];
            if (options.equipos.length === 0) {
                elements.equiposTableBody.innerHTML = '<tr><td colspan="7">No hay equipos registrados.</td></tr>';
                return;
            }
            elements.equiposTableBody.innerHTML = '';
            options.equipos.forEach(equipo => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${equipo.id}</td>
                    <td>${equipo.cliente?.empresa || 'N/A'}</td>
                    <td>${equipo.marca}</td>
                    <td>${equipo.modelo}</td>
                    <td>${equipo.serial}</td>
                    <td>${equipo.tipo}</td>
                    <td>${equipo.estado}</td>
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
            populateSelectOptions();
        } catch (error) {
            console.error('Error cargando equipos:', error);
            elements.equiposTableBody.innerHTML = '<tr><td colspan="7">Error al cargar equipos.</td></tr>';
        }
    }

    async function fetchTecnicos() {
        if (!elements.tecnicosTableBody) return;
        elements.tecnicosTableBody.innerHTML = '<tr><td colspan="6">Cargando técnicos...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/tecnicos`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.tecnicosTableBody.innerHTML = '<tr><td colspan="6">No se pudieron cargar los técnicos.</td></tr>';
                return;
            }
            options.tecnicos = data.tecnicos || [];
            if (options.tecnicos.length === 0) {
                elements.tecnicosTableBody.innerHTML = '<tr><td colspan="6">No hay técnicos registrados.</td></tr>';
                return;
            }
            elements.tecnicosTableBody.innerHTML = '';
            options.tecnicos.forEach(tecnico => {
                const nombre = tecnico.usuario?.nombre || `Técnico ${tecnico.id}`;
                const email = tecnico.usuario?.email || 'N/A';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tecnico.id}</td>
                    <td>${nombre}</td>
                    <td>${email}</td>
                    <td>${tecnico.especialidad}</td>
                    <td>${tecnico.telefono_contacto || 'N/A'}</td>
                    <td>${tecnico.disponible ? 'Sí' : 'No'}</td>
                    <td class="table-actions">
                        <div class="action-menu">
                            <button type="button" class="action-menu-trigger" aria-haspopup="true" aria-expanded="false" data-id="${tecnico.id}">⋮</button>
                            <div class="action-menu-dropdown hidden" role="menu">
                                <button type="button" class="action-menu-item action-menu-edit" data-id="${tecnico.id}" role="menuitem">Editar</button>
                                <button type="button" class="action-menu-item action-menu-delete" data-id="${tecnico.id}" role="menuitem">Eliminar</button>
                            </div>
                        </div>
                    </td>
                `;
                elements.tecnicosTableBody.appendChild(row);
            });
            populateSelectOptions();
        } catch (error) {
            console.error('Error cargando técnicos:', error);
            elements.tecnicosTableBody.innerHTML = '<tr><td colspan="6">Error al cargar técnicos.</td></tr>';
        }
    }

    async function fetchOrdenes() {
        if (!elements.ordenesTableBody) return;
        elements.ordenesTableBody.innerHTML = '<tr><td colspan="7">Cargando órdenes...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/ordenes`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.ordenesTableBody.innerHTML = '<tr><td colspan="7">No se pudieron cargar las órdenes.</td></tr>';
                return;
            }
            const ordenes = data.ordenes || [];
            if (ordenes.length === 0) {
                elements.ordenesTableBody.innerHTML = '<tr><td colspan="7">No hay órdenes registradas.</td></tr>';
                return;
            }
            elements.ordenesTableBody.innerHTML = '';
            ordenes.forEach(orden => {
                const row = document.createElement('tr');
                const estadoClass = `badge-${orden.estado.toLowerCase().replace(/\s+/g, '-')}`;
                row.innerHTML = `
                    <td>${orden.id}</td>
                    <td>${orden.cliente?.empresa || 'N/A'}</td>
                    <td>${orden.equipo?.modelo || 'N/A'}</td>
                    <td>${orden.tecnico?.especialidad || 'N/A'}</td>
                    <td>${orden.tipo}</td>
                    <td><span class="badge ${estadoClass}">${orden.estado}</span></td>
                    <td>${orden.fecha_programada ? new Date(orden.fecha_programada).toLocaleDateString('es-CO') : 'No definida'}</td>
                    <td class="table-actions">
                        <div class="action-menu">
                            <button type="button" class="action-menu-trigger" aria-haspopup="true" aria-expanded="false" data-id="${orden.id}">⋮</button>
                            <div class="action-menu-dropdown hidden" role="menu">
                                <button type="button" class="action-menu-item action-menu-edit" data-id="${orden.id}" role="menuitem">Editar</button>
                                <button type="button" class="action-menu-item action-menu-delete" data-id="${orden.id}" role="menuitem">Eliminar</button>
                            </div>
                        </div>
                    </td>
                `;
                elements.ordenesTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando órdenes:', error);
            elements.ordenesTableBody.innerHTML = '<tr><td colspan="7">Error al cargar órdenes.</td></tr>';
        }
    }

    async function fetchCotizaciones() {
        if (!elements.cotizacionesTableBody) return;
        elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="6">Cargando cotizaciones...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/cotizaciones`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="6">No se pudieron cargar las cotizaciones.</td></tr>';
                return;
            }
            const cotizaciones = data.cotizaciones || [];
            if (cotizaciones.length === 0) {
                elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="6">No hay cotizaciones registradas.</td></tr>';
                return;
            }
            elements.cotizacionesTableBody.innerHTML = '';
            cotizaciones.forEach(cotizacion => {
                const row = document.createElement('tr');
                const estadoClass = `badge-${cotizacion.estado.toLowerCase().replace(/\s+/g, '-')}`;
                row.innerHTML = `
                    <td>${cotizacion.id}</td>
                    <td>${cotizacion.cliente?.empresa || 'N/A'}</td>
                    <td>${cotizacion.descripcion}</td>
                    <td>${Number(cotizacion.monto_estimado).toFixed(2)}</td>
                    <td><span class="badge ${estadoClass}">${cotizacion.estado}</span></td>
                    <td>${cotizacion.fecha_solicitud ? new Date(cotizacion.fecha_solicitud).toLocaleDateString('es-CO') : 'N/A'}</td>
                    <td class="table-actions">
                        <div class="action-menu">
                            <button type="button" class="action-menu-trigger" aria-haspopup="true" aria-expanded="false" data-id="${cotizacion.id}">⋮</button>
                            <div class="action-menu-dropdown hidden" role="menu">
                                <button type="button" class="action-menu-item action-menu-edit" data-id="${cotizacion.id}" role="menuitem">Editar</button>
                                <button type="button" class="action-menu-item action-menu-delete" data-id="${cotizacion.id}" role="menuitem">Eliminar</button>
                            </div>
                        </div>
                    </td>
                `;
                elements.cotizacionesTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando cotizaciones:', error);
            elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="6">Error al cargar cotizaciones.</td></tr>';
        }
    }

    async function fetchRepuestos() {
        if (!elements.repuestosTableBody) return;
        elements.repuestosTableBody.innerHTML = '<tr><td colspan="8">Cargando repuestos...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/repuestos`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.repuestosTableBody.innerHTML = '<tr><td colspan="8">No se pudieron cargar los repuestos.</td></tr>';
                return;
            }
            const repuestos = data.data || [];
            if (repuestos.length === 0) {
                elements.repuestosTableBody.innerHTML = '<tr><td colspan="8">No hay repuestos registrados.</td></tr>';
                return;
            }
            options.repuestos = repuestos;
            elements.repuestosTableBody.innerHTML = '';
            repuestos.forEach(repuesto => {
                const row = document.createElement('tr');
                const estadoClass = `badge-${repuesto.estado.toLowerCase().replace(/\s+/g, '-')}`;
                const precioFormato = Number(repuesto.precio_unitario || 0).toFixed(2);
                row.innerHTML = `
                    <td>${repuesto.id}</td>
                    <td>${repuesto.nombre}</td>
                    <td>${repuesto.codigo || 'N/A'}</td>
                    <td>${repuesto.cantidad || 0}</td>
                    <td>${repuesto.cantidad_minima || 0}</td>
                    <td>$${precioFormato}</td>
                    <td><span class="badge ${estadoClass}">${repuesto.estado}</span></td>
                    <td class="table-actions">
                        <div class="action-menu">
                            <button type="button" class="action-menu-trigger" aria-haspopup="true" aria-expanded="false" data-id="${repuesto.id}">⋮</button>
                            <div class="action-menu-dropdown hidden" role="menu">
                                <button type="button" class="action-menu-item action-menu-edit" data-id="${repuesto.id}" role="menuitem">Editar</button>
                                <button type="button" class="action-menu-item action-menu-delete" data-id="${repuesto.id}" role="menuitem">Eliminar</button>
                            </div>
                        </div>
                    </td>
                `;
                elements.repuestosTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando repuestos:', error);
            elements.repuestosTableBody.innerHTML = '<tr><td colspan="8">Error al cargar repuestos.</td></tr>';
        }
    }

    async function fetchEvidencias() {
        if (!elements.evidenciasTableBody) return;
        elements.evidenciasTableBody.innerHTML = '<tr><td colspan="7">Cargando evidencias...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/evidencias`, {
                headers: authHeaders()
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                elements.evidenciasTableBody.innerHTML = '<tr><td colspan="7">No se pudieron cargar las evidencias.</td></tr>';
                return;
            }
            
            const evidencias = data.data || [];
            if (evidencias.length === 0) {
                elements.evidenciasTableBody.innerHTML = '<tr><td colspan="7">No hay evidencias registradas.</td></tr>';
                return;
            }
            
            elements.evidenciasTableBody.innerHTML = '';
            evidencias.forEach(evidencia => {
                const row = document.createElement('tr');
                const tipoClass = `badge-${evidencia.tipo.toLowerCase()}`;
                const fecha = new Date(evidencia.created_at).toLocaleDateString('es-CO');
                const tecnico = evidencia.mantenimientos?.tecnicos?.usuarios?.nombre || 'Técnico N/A';
                row.innerHTML = `
                    <td>${evidencia.id}</td>
                    <td>${evidencia.mantenimiento_id}</td>
                    <td class="archivo-nombre">${evidencia.archivo_nombre || 'N/A'}</td>
                    <td><span class="badge ${tipoClass}">${evidencia.tipo}</span></td>
                    <td>${evidencia.descripcion || 'N/A'}</td>
                    <td>${fecha}</td>
                    <td class="table-actions">
                        <div class="action-menu">
                            <button type="button" class="action-menu-trigger" aria-haspopup="true" aria-expanded="false" data-id="${evidencia.id}">⋮</button>
                            <div class="action-menu-dropdown hidden" role="menu">
                                <button type="button" class="action-menu-item action-menu-delete" data-id="${evidencia.id}" data-table="evidencias" role="menuitem">Eliminar</button>
                            </div>
                        </div>
                    </td>
                `;
                elements.evidenciasTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando evidencias:', error);
            elements.evidenciasTableBody.innerHTML = '<tr><td colspan="7">Error al cargar evidencias: ' + error.message + '</td></tr>';
        }
    }

    function populateSelectOptions() {
        const clienteSelects = [
            document.getElementById('equipo-cliente'),
            document.getElementById('orden-cliente'),
            document.getElementById('cotizacion-cliente'),
            document.getElementById('edit-equipo-cliente'),
            document.getElementById('edit-orden-cliente'),
            document.getElementById('edit-cotizacion-cliente')
        ].filter(Boolean);
        const tecnicoSelect = document.getElementById('orden-tecnico');
        const tecnicoEditSelect = document.getElementById('edit-orden-tecnico');
        const equipoSelect = document.getElementById('orden-equipo');
        const equipoEditSelect = document.getElementById('edit-orden-equipo');

        const clienteOptions = options.clientes.map(cliente => `<option value="${cliente.id}">${cliente.empresa || `Cliente ${cliente.id}`}</option>`).join('');
        clienteSelects.forEach(select => {
            if (select) select.innerHTML = '<option value="">Seleccione un cliente</option>' + clienteOptions;
        });

        if (equipoSelect) {
            equipoSelect.innerHTML = '<option value="">Seleccione un equipo</option>' + options.equipos.map(e => `<option value="${e.id}">${e.marca} ${e.modelo} (${e.serial})</option>`).join('');
        }

        if (equipoEditSelect) {
            equipoEditSelect.innerHTML = '<option value="">Seleccione un equipo</option>' + options.equipos.map(e => `<option value="${e.id}">${e.marca} ${e.modelo} (${e.serial})</option>`).join('');
        }

        if (tecnicoSelect) {
            tecnicoSelect.innerHTML = '<option value="">Seleccione un técnico</option>' + options.tecnicos.map(t => `<option value="${t.id}">${t.usuario?.nombre || `Técnico ${t.id}`}</option>`).join('');
        }

        if (tecnicoEditSelect) {
            tecnicoEditSelect.innerHTML = '<option value="">Seleccione un técnico</option>' + options.tecnicos.map(t => `<option value="${t.id}">${t.usuario?.nombre || `Técnico ${t.id}`}</option>`).join('');
        }
    }

    async function submitForm(url, payload, successMessage, formId, messageId, refreshCallback) {
        try {
            const response = await fetch(`${apiBase}${url}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(payload)
            });
            if (handleUnauthorized(response)) return;
            const data = await response.json();
            if (response.ok && data.success) {
                setFormMessage(messageId, successMessage, 'success');
                document.getElementById(formId).reset();
                if (refreshCallback) refreshCallback();
                fetchMetrics();
            } else {
                setFormMessage(messageId, data.message || 'Error al guardar.', 'error');
            }
        } catch (error) {
            console.error('Error guardando datos:', error);
            setFormMessage(messageId, 'Error de conexión al guardar.', 'error');
        }
    }

    async function handleDeleteRepuesto(event) {
        const repuestoId = parseInt(event.target.dataset.id);
        
        if (confirm('¿Estás seguro de que deseas eliminar este repuesto? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${apiBase}/api/repuestos/${repuestoId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() }
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();

                if (response.ok && data.success) {
                    setFormMessage('repuesto-form-message', 'Repuesto eliminado correctamente.', 'success');
                    fetchRepuestos();
                    fetchMetrics();
                } else {
                    setFormMessage('repuesto-form-message', data.message || 'Error al eliminar repuesto.', 'error');
                }
            } catch (error) {
                console.error('Error eliminando repuesto:', error);
                setFormMessage('repuesto-form-message', 'Error de conexión al eliminar.', 'error');
            }
        }
    }

    async function handleEditRepuesto(event) {
        const repuestoId = parseInt(event.target.dataset.id);
        const repuesto = options.repuestos.find(r => r.id === repuestoId);
        
        if (!repuesto) {
            alert('Repuesto no encontrado');
            return;
        }

        document.getElementById('repuesto-form-title').textContent = 'Editar Repuesto';
        document.getElementById('repuesto-id').value = repuesto.id;
        document.getElementById('repuesto-nombre').value = repuesto.nombre;
        document.getElementById('repuesto-codigo').value = repuesto.codigo || '';
        document.getElementById('repuesto-descripcion').value = repuesto.descripcion || '';
        document.getElementById('repuesto-cantidad').value = repuesto.cantidad || 0;
        document.getElementById('repuesto-cantidad-minima').value = repuesto.cantidad_minima || 5;
        document.getElementById('repuesto-precio').value = repuesto.precio_unitario || 0;
        document.getElementById('repuesto-proveedor').value = repuesto.proveedor || '';
        document.getElementById('repuesto-estado').value = repuesto.estado || 'Activo';
        
        drawer.classList.add('open');
        drawerBackdrop.classList.add('open');
    }

    async function handleDeleteEvidencia(event) {
        const evidenciaId = parseInt(event.target.dataset.id);
        
        if (confirm('¿Estás seguro de que deseas eliminar esta evidencia? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${apiBase}/api/evidencias/${evidenciaId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() }
                });
                if (handleUnauthorized(response)) return;
                const data = await response.json();

                if (response.ok && data.success) {
                    alert('Evidencia eliminada correctamente.');
                    fetchEvidencias();
                    fetchMetrics();
                } else {
                    alert(data.message || 'Error al eliminar evidencia.');
                }
            } catch (error) {
                console.error('Error eliminando evidencia:', error);
                alert('Error de conexión al eliminar.');
            }
        }
    }

    function bindForms() {
        const clienteForm = document.getElementById('cliente-form');
        const equipoForm = document.getElementById('equipo-form');
        const tecnicoForm = document.getElementById('tecnico-form');
        const ordenForm = document.getElementById('orden-form');
        const cotizacionForm = document.getElementById('cotizacion-form');

        if (clienteForm) {
            clienteForm.addEventListener('submit', async event => {
                event.preventDefault();
                const mode = clienteForm.dataset.mode || 'create';
                const clienteId = parseInt(clienteForm.dataset.clienteId);

                const payload = {
                    empresa: document.getElementById('cliente-empresa').value.trim(),
                    telefono: document.getElementById('cliente-telefono').value.trim(),
                    direccion: document.getElementById('cliente-direccion').value.trim(),
                    ciudad: document.getElementById('cliente-ciudad').value.trim(),
                    pais: document.getElementById('cliente-pais').value.trim()
                };

                if (mode === 'edit') {
                    payload.id = clienteId;
                    payload.nombre = document.getElementById('cliente-nombre').value.trim();
                    payload.apellido = document.getElementById('cliente-apellido').value.trim();
                    payload.email = document.getElementById('cliente-email').value.trim();
                    console.log('[CLIENTE SUBMIT] modo:', mode, 'payload:', payload);
                    try {
                        const response = await fetch(`${apiBase}/api/clientes`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', ...authHeaders() },
                            body: JSON.stringify(payload)
                        });
                        const data = await response.json();
                        console.log('[CLIENTE SUBMIT] response:', data);
                        if (response.ok && data.success) {
                            setFormMessage('cliente-form-message', 'Cliente actualizado correctamente.', 'success');
                            clienteForm.dataset.mode = 'create';
                            delete clienteForm.dataset.clienteId;
                            setTimeout(() => {
                                closeDrawer('cliente');
                                fetchClientes();
                                fetchMetrics();
                            }, 1000);
                        } else {
                            setFormMessage('cliente-form-message', data.message || 'Error al actualizar cliente.', 'error');
                        }
                    } catch (error) {
                        console.error('Error actualizando cliente:', error);
                        setFormMessage('cliente-form-message', 'Error de conexión.', 'error');
                    }
                } else {
                    payload.nombre = document.getElementById('cliente-nombre').value.trim();
                    payload.apellido = document.getElementById('cliente-apellido').value.trim();
                    payload.email = document.getElementById('cliente-email').value.trim();
                    
                    submitForm('/api/clientes', payload, 'Cliente creado correctamente.', 'cliente-form', 'cliente-form-message', fetchClientes);
                }
            });
        }

        if (equipoForm) {
            equipoForm.addEventListener('submit', event => {
                event.preventDefault();
                submitForm('/api/equipos', {
                    cliente_id: Number(document.getElementById('equipo-cliente').value),
                    marca: document.getElementById('equipo-marca').value.trim(),
                    modelo: document.getElementById('equipo-modelo').value.trim(),
                    serial: document.getElementById('equipo-serial').value.trim(),
                    tipo: document.getElementById('equipo-tipo').value,
                    fecha_instalacion: document.getElementById('equipo-fecha').value || null,
                    ubicacion: document.getElementById('equipo-ubicacion').value.trim(),
                    estado: document.getElementById('equipo-estado').value
                }, 'Equipo creado correctamente.', 'equipo-form', 'equipo-form-message', fetchEquipos);
            });
        }

        if (tecnicoForm) {
            tecnicoForm.addEventListener('submit', async event => {
                event.preventDefault();
                const payload = {
                    nombre: document.getElementById('tecnico-nombre').value.trim(),
                    apellido: document.getElementById('tecnico-apellido').value.trim(),
                    email: document.getElementById('tecnico-email').value.trim(),
                    especialidad: document.getElementById('tecnico-especialidad').value.trim(),
                    telefono_contacto: document.getElementById('tecnico-telefono').value.trim()
                };

                try {
                    const response = await fetch(`${apiBase}/api/tecnicos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    if (response.ok && data.success) {
                        setFormMessage('tecnico-form-message', `Técnico creado correctamente. Contraseña temporal: ${data.generatedPassword}`, 'success');
                        document.getElementById('tecnico-form').reset();
                        fetchTecnicos();
                        fetchMetrics();
                    } else {
                        setFormMessage('tecnico-form-message', data.message || 'Error al guardar.', 'error');
                    }
                } catch (error) {
                    console.error('Error guardando técnico:', error);
                    setFormMessage('tecnico-form-message', 'Error de conexión al guardar.', 'error');
                }
            });
        }

        if (ordenForm) {
            ordenForm.addEventListener('submit', event => {
                event.preventDefault();
                submitForm('/api/ordenes', {
                    cliente_id: Number(document.getElementById('orden-cliente').value),
                    equipo_id: Number(document.getElementById('orden-equipo').value),
                    tecnico_id: Number(document.getElementById('orden-tecnico').value),
                    tipo: document.getElementById('orden-tipo').value,
                    descripcion: document.getElementById('orden-descripcion').value.trim(),
                    fecha_programada: document.getElementById('orden-fecha').value || null
                }, 'Orden creada correctamente.', 'orden-form', 'orden-form-message', fetchOrdenes);
            });
        }

        if (cotizacionForm) {
            cotizacionForm.addEventListener('submit', event => {
                event.preventDefault();
                submitForm('/api/cotizaciones', {
                    cliente_id: Number(document.getElementById('cotizacion-cliente').value),
                    descripcion: document.getElementById('cotizacion-descripcion').value.trim(),
                    monto_estimado: Number(document.getElementById('cotizacion-monto').value)
                }, 'Cotización creada correctamente.', 'cotizacion-form', 'cotizacion-form-message', fetchCotizaciones);
            });
        }

        const repuestoForm = document.getElementById('repuesto-form');
        if (repuestoForm) {
            repuestoForm.addEventListener('submit', async event => {
                event.preventDefault();
                const repuestoId = document.getElementById('repuesto-id').value;
                const payload = {
                    nombre: document.getElementById('repuesto-nombre').value.trim(),
                    codigo: document.getElementById('repuesto-codigo').value.trim() || null,
                    descripcion: document.getElementById('repuesto-descripcion').value.trim() || null,
                    cantidad: Number(document.getElementById('repuesto-cantidad').value) || 0,
                    cantidad_minima: Number(document.getElementById('repuesto-cantidad-minima').value) || 5,
                    precio_unitario: Number(document.getElementById('repuesto-precio').value) || 0,
                    proveedor: document.getElementById('repuesto-proveedor').value.trim() || null,
                    estado: document.getElementById('repuesto-estado').value
                };

                try {
                    const url = repuestoId ? `${apiBase}/api/repuestos/${repuestoId}` : `${apiBase}/api/repuestos`;
                    const method = repuestoId ? 'PUT' : 'POST';
                    const response = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify(payload)
                    });
                    if (handleUnauthorized(response)) return;
                    const data = await response.json();

                    if (response.ok && data.success) {
                        const message = repuestoId ? 'Repuesto actualizado correctamente.' : 'Repuesto creado correctamente.';
                        setFormMessage('repuesto-form-message', message, 'success');
                        repuestoForm.reset();
                        document.getElementById('repuesto-id').value = '';
                        document.getElementById('repuesto-form-title').textContent = 'Crear repuesto';
                        setTimeout(() => {
                            closeDrawer();
                            fetchRepuestos();
                            fetchMetrics();
                        }, 500);
                    } else {
                        setFormMessage('repuesto-form-message', data.message || 'Error al guardar repuesto.', 'error');
                    }
                } catch (error) {
                    console.error('Error guardando repuesto:', error);
                    setFormMessage('repuesto-form-message', 'Error de conexión al guardar.', 'error');
                }
            });
        }

        // Formularios de edición
        const editEquipoForm = document.getElementById('edit-equipo-form');
        if (editEquipoForm) {
            editEquipoForm.addEventListener('submit', async event => {
                event.preventDefault();
                const equipoId = parseInt(editEquipoForm.dataset.equipoId);

                const payload = {
                    id: equipoId,
                    cliente_id: Number(document.getElementById('edit-equipo-cliente').value),
                    marca: document.getElementById('edit-equipo-marca').value.trim(),
                    modelo: document.getElementById('edit-equipo-modelo').value.trim(),
                    serial: document.getElementById('edit-equipo-serial').value.trim(),
                    tipo: document.getElementById('edit-equipo-tipo').value,
                    fecha_instalacion: document.getElementById('edit-equipo-fecha').value || null,
                    ubicacion: document.getElementById('edit-equipo-ubicacion').value.trim(),
                    estado: document.getElementById('edit-equipo-estado').value
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
                        setFormMessage('edit-equipo-form-message', 'Equipo actualizado correctamente.', 'success');
                        setTimeout(() => {
                            closeDrawer();
                            fetchEquipos();
                            fetchMetrics();
                        }, 1000);
                    } else {
                        setFormMessage('edit-equipo-form-message', data.message || 'Error al actualizar equipo.', 'error');
                    }
                } catch (error) {
                    console.error('Error actualizando equipo:', error);
                    setFormMessage('edit-equipo-form-message', 'Error de conexión.', 'error');
                }
            });
        }

        const editTecnicoForm = document.getElementById('edit-tecnico-form');
        if (editTecnicoForm) {
            editTecnicoForm.addEventListener('submit', async event => {
                event.preventDefault();
                const tecnicoId = parseInt(editTecnicoForm.dataset.tecnicoId);

                const payload = {
                    id: tecnicoId,
                    especialidad: document.getElementById('edit-tecnico-especialidad').value.trim(),
                    telefono_contacto: document.getElementById('edit-tecnico-telefono').value.trim(),
                    disponible: document.getElementById('edit-tecnico-disponible').value === 'true'
                };

                try {
                    const response = await fetch(`${apiBase}/api/tecnicos`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify(payload)
                    });
                    if (handleUnauthorized(response)) return;
                    const data = await response.json();
                    if (response.ok && data.success) {
                        setFormMessage('edit-tecnico-form-message', 'Técnico actualizado correctamente.', 'success');
                        setTimeout(() => {
                            closeDrawer();
                            fetchTecnicos();
                            fetchMetrics();
                        }, 1000);
                    } else {
                        setFormMessage('edit-tecnico-form-message', data.message || 'Error al actualizar técnico.', 'error');
                    }
                } catch (error) {
                    console.error('Error actualizando técnico:', error);
                    setFormMessage('edit-tecnico-form-message', 'Error de conexión.', 'error');
                }
            });
        }

        const editOrdenForm = document.getElementById('edit-orden-form');
        if (editOrdenForm) {
            editOrdenForm.addEventListener('submit', async event => {
                event.preventDefault();
                const ordenId = parseInt(editOrdenForm.dataset.ordenId);

                const payload = {
                    id: ordenId,
                    cliente_id: Number(document.getElementById('edit-orden-cliente').value),
                    equipo_id: Number(document.getElementById('edit-orden-equipo').value),
                    tecnico_id: Number(document.getElementById('edit-orden-tecnico').value),
                    tipo: document.getElementById('edit-orden-tipo').value,
                    descripcion: document.getElementById('edit-orden-descripcion').value.trim(),
                    fecha_programada: document.getElementById('edit-orden-fecha').value || null,
                    estado: document.getElementById('edit-orden-estado').value
                };

                try {
                    const response = await fetch(`${apiBase}/api/ordenes/${ordenId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify(payload)
                    });
                    if (handleUnauthorized(response)) return;
                    const data = await response.json();
                    if (response.ok && data.success) {
                        setFormMessage('edit-orden-form-message', 'Orden actualizada correctamente.', 'success');
                        setTimeout(() => {
                            closeDrawer();
                            fetchOrdenes();
                            fetchMetrics();
                        }, 1000);
                    } else {
                        setFormMessage('edit-orden-form-message', data.message || 'Error al actualizar orden.', 'error');
                    }
                } catch (error) {
                    console.error('Error actualizando orden:', error);
                    setFormMessage('edit-orden-form-message', 'Error de conexión.', 'error');
                }
            });
        }

        const editCotizacionForm = document.getElementById('edit-cotizacion-form');
        if (editCotizacionForm) {
            editCotizacionForm.addEventListener('submit', async event => {
                event.preventDefault();
                const cotizacionId = parseInt(editCotizacionForm.dataset.cotizacionId);

                const payload = {
                    cliente_id: Number(document.getElementById('edit-cotizacion-cliente').value),
                    descripcion: document.getElementById('edit-cotizacion-descripcion').value.trim(),
                    monto_estimado: Number(document.getElementById('edit-cotizacion-monto').value),
                    estado: document.getElementById('edit-cotizacion-estado').value
                };

                try {
                    const response = await fetch(`${apiBase}/api/cotizaciones/${cotizacionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify(payload)
                    });
                    if (handleUnauthorized(response)) return;
                    const data = await response.json();
                    if (response.ok && data.success) {
                        setFormMessage('edit-cotizacion-form-message', 'Cotización actualizada correctamente.', 'success');
                        setTimeout(() => {
                            closeDrawer();
                            fetchCotizaciones();
                            fetchMetrics();
                        }, 1000);
                    } else {
                        setFormMessage('edit-cotizacion-form-message', data.message || 'Error al actualizar cotización.', 'error');
                    }
                } catch (error) {
                    console.error('Error actualizando cotización:', error);
                    setFormMessage('edit-cotizacion-form-message', 'Error de conexión.', 'error');
                }
            });
        }
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

    function openDrawer(formType, options = {}) {
        if (!drawer) return;
        drawerForms.forEach(form => {
            form.classList.remove('active');
            form.classList.add('hidden');
        });
        const activeForm = document.getElementById(`drawer-form-${formType}`);
        if (!activeForm) return;
        activeForm.classList.add('active');
        activeForm.classList.remove('hidden');
        
        if (formType === 'cliente') {
            const clienteForm = document.getElementById('cliente-form');
            const mode = options.mode || clienteForm.dataset.mode || 'create';
            clienteForm.dataset.mode = mode;
            console.log('[CLIENTE OPEN] modo:', mode, 'dataset:', { mode: clienteForm.dataset.mode, id: clienteForm.dataset.clienteId });

            if (mode === 'create') {
                drawerTitle.textContent = 'Crear Cliente';
                delete clienteForm.dataset.clienteId;
                clienteForm.reset();
                const messageEl = document.getElementById('cliente-form-message');
                if (messageEl) messageEl.textContent = '';
                // Limpiar los campos que no se resetean con reset()
                document.getElementById('cliente-nombre').value = '';
                document.getElementById('cliente-apellido').value = '';
                document.getElementById('cliente-email').value = '';
            } else {
                drawerTitle.textContent = 'Editar Cliente';
            }
        } else {
            drawerTitle.textContent = activeForm.dataset.title || 'Formulario';
        }
        
        drawer.classList.add('open');
        drawerBackdrop.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    function bindActionMenuEvents() {
        if (!elements.clientesTableBody) return;

        // Event listeners para clientes
        elements.clientesTableBody.addEventListener('click', event => {
            const trigger = event.target.closest('.action-menu-trigger');
            if (trigger) {
                event.stopPropagation();
                toggleActionMenu(trigger);
                return;
            }

            const editButton = event.target.closest('.action-menu-edit');
            if (editButton) {
                handleEditCliente({ target: editButton });
                closeActionMenus();
                return;
            }

            const deleteButton = event.target.closest('.action-menu-delete');
            if (deleteButton) {
                handleDeleteCliente({ target: deleteButton });
                closeActionMenus();
                return;
            }
        });

        // Event listeners para equipos
        if (elements.equiposTableBody) {
            elements.equiposTableBody.addEventListener('click', event => {
                const trigger = event.target.closest('.action-menu-trigger');
                if (trigger) {
                    event.stopPropagation();
                    toggleActionMenu(trigger);
                    return;
                }

                const editButton = event.target.closest('.action-menu-edit');
                if (editButton) {
                    handleEditEquipo({ target: editButton });
                    closeActionMenus();
                    return;
                }

                const deleteButton = event.target.closest('.action-menu-delete');
                if (deleteButton) {
                    handleDeleteEquipo({ target: deleteButton });
                    closeActionMenus();
                    return;
                }
            });
        }

        // Event listeners para técnicos
        if (elements.tecnicosTableBody) {
            elements.tecnicosTableBody.addEventListener('click', event => {
                const trigger = event.target.closest('.action-menu-trigger');
                if (trigger) {
                    event.stopPropagation();
                    toggleActionMenu(trigger);
                    return;
                }

                const editButton = event.target.closest('.action-menu-edit');
                if (editButton) {
                    handleEditTecnico({ target: editButton });
                    closeActionMenus();
                    return;
                }

                const deleteButton = event.target.closest('.action-menu-delete');
                if (deleteButton) {
                    handleDeleteTecnico({ target: deleteButton });
                    closeActionMenus();
                    return;
                }
            });
        }

        // Event listeners para órdenes
        if (elements.ordenesTableBody) {
            elements.ordenesTableBody.addEventListener('click', event => {
                const trigger = event.target.closest('.action-menu-trigger');
                if (trigger) {
                    event.stopPropagation();
                    toggleActionMenu(trigger);
                    return;
                }

                const editButton = event.target.closest('.action-menu-edit');
                if (editButton) {
                    handleEditOrden({ target: editButton });
                    closeActionMenus();
                    return;
                }

                const deleteButton = event.target.closest('.action-menu-delete');
                if (deleteButton) {
                    handleDeleteOrden({ target: deleteButton });
                    closeActionMenus();
                    return;
                }
            });
        }

        // Event listeners para cotizaciones
        if (elements.cotizacionesTableBody) {
            elements.cotizacionesTableBody.addEventListener('click', event => {
                const trigger = event.target.closest('.action-menu-trigger');
                if (trigger) {
                    event.stopPropagation();
                    toggleActionMenu(trigger);
                    return;
                }

                const editButton = event.target.closest('.action-menu-edit');
                if (editButton) {
                    handleEditCotizacion({ target: editButton });
                    closeActionMenus();
                    return;
                }

                const deleteButton = event.target.closest('.action-menu-delete');
                if (deleteButton) {
                    handleDeleteCotizacion({ target: deleteButton });
                    closeActionMenus();
                    return;
                }
            });
        }

        // Event listeners para repuestos
        if (elements.repuestosTableBody) {
            elements.repuestosTableBody.addEventListener('click', event => {
                const trigger = event.target.closest('.action-menu-trigger');
                if (trigger) {
                    event.stopPropagation();
                    toggleActionMenu(trigger);
                    return;
                }

                const editButton = event.target.closest('.action-menu-edit');
                if (editButton) {
                    handleEditRepuesto({ target: editButton });
                    closeActionMenus();
                    return;
                }

                const deleteButton = event.target.closest('.action-menu-delete');
                if (deleteButton) {
                    handleDeleteRepuesto({ target: deleteButton });
                    closeActionMenus();
                    return;
                }
            });
        }

        // Event listeners para evidencias
        if (elements.evidenciasTableBody) {
            elements.evidenciasTableBody.addEventListener('click', event => {
                const trigger = event.target.closest('.action-menu-trigger');
                if (trigger) {
                    event.stopPropagation();
                    toggleActionMenu(trigger);
                    return;
                }

                const deleteButton = event.target.closest('.action-menu-delete');
                if (deleteButton) {
                    handleDeleteEvidencia({ target: deleteButton });
                    closeActionMenus();
                    return;
                }
            });
        }

        document.addEventListener('click', event => {
            if (!event.target.closest('.action-menu')) {
                closeActionMenus();
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                closeActionMenus();
            }
        });
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

    function showAdminSection(sectionId) {
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => {
            section.classList.toggle('hidden', section.id !== sectionId);
        });

        adminTabs.forEach(tab => {
            tab.classList.toggle('active', `admin-${tab.dataset.section}` === sectionId);
        });

        closeDrawer();
    }

    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sectionId = `admin-${tab.dataset.section}`;
            showAdminSection(sectionId);
            if (tab.dataset.section === 'clientes') {
                fetchClientes();
            } else if (tab.dataset.section === 'equipos') {
                fetchClientes();
                fetchEquipos();
            } else if (tab.dataset.section === 'tecnicos') {
                fetchTecnicos();
            } else if (tab.dataset.section === 'ordenes') {
                fetchClientes();
                fetchEquipos();
                fetchTecnicos();
                fetchOrdenes();
            } else if (tab.dataset.section === 'cotizaciones') {
                fetchClientes();
                fetchCotizaciones();
            } else if (tab.dataset.section === 'repuestos') {
                fetchRepuestos();
            }
        });
    });

    fetchMetrics();
    fetchClientes();
    fetchEquipos();
    fetchTecnicos();
    fetchEvidencias();
    bindForms();
    bindFormDrawerButtons();
    bindActionMenuEvents();
    showAdminSection('admin-dashboard');
});
