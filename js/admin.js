document.addEventListener('DOMContentLoaded', function () {
    const apiBase = window.location.origin;
    const adminTabs = document.querySelectorAll('.admin-tab');

    const elements = {
        metricClientes: document.getElementById('metric-clientes'),
        metricEquipos: document.getElementById('metric-equipos'),
        metricTecnicos: document.getElementById('metric-tecnicos'),
        metricOrdenes: document.getElementById('metric-ordenes'),
        metricCotizaciones: document.getElementById('metric-cotizaciones'),
        clientesTableBody: document.getElementById('clientes-table-body'),
        equiposTableBody: document.getElementById('equipos-table-body'),
        tecnicosTableBody: document.getElementById('tecnicos-table-body'),
        ordenesTableBody: document.getElementById('ordenes-table-body'),
        cotizacionesTableBody: document.getElementById('cotizaciones-table-body')
    };

    const options = {
        clientes: [],
        equipos: [],
        tecnicos: []
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
            const response = await fetch(`${apiBase}/api/dashboard-metrics`);
            const data = await response.json();
            if (response.ok && data.success && data.counts) {
                elements.metricClientes.textContent = data.counts.clientes || 0;
                elements.metricEquipos.textContent = data.counts.equipos || 0;
                elements.metricTecnicos.textContent = data.counts.tecnicos || 0;
                elements.metricOrdenes.textContent = data.counts.ordenes || 0;
                elements.metricCotizaciones.textContent = data.counts.cotizaciones || 0;
            }
        } catch (error) {
            console.error('Error cargando métricas:', error);
        }
    }

    async function fetchClientes() {
        if (!elements.clientesTableBody) return;
        elements.clientesTableBody.innerHTML = '<tr><td colspan="7">Cargando clientes...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/clientes`);
            const data = await response.json();
            if (!response.ok || !data.success) {
                elements.clientesTableBody.innerHTML = '<tr><td colspan="7">No se pudieron cargar los clientes.</td></tr>';
                return;
            }
            options.clientes = data.clientes || [];
            if (options.clientes.length === 0) {
                elements.clientesTableBody.innerHTML = '<tr><td colspan="7">No hay clientes registrados.</td></tr>';
                return;
            }
            elements.clientesTableBody.innerHTML = '';
            options.clientes.forEach(cliente => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${cliente.id}</td>
                    <td>${cliente.empresa || 'N/A'}</td>
                    <td>${cliente.telefono || 'N/A'}</td>
                    <td>${cliente.ciudad || 'N/A'}</td>
                    <td>${cliente.pais || 'N/A'}</td>
                    <td>${new Date(cliente.created_at).toLocaleDateString('es-CO')}</td>
                    <td class="table-actions">
                        <button class="btn-edit-cliente" data-id="${cliente.id}">Editar</button>
                        <button class="btn-delete-cliente" data-id="${cliente.id}">Eliminar</button>
                    </td>
                `;
                elements.clientesTableBody.appendChild(row);
            });

            document.querySelectorAll('.btn-edit-cliente').forEach(btn => {
                btn.addEventListener('click', handleEditCliente);
            });

            document.querySelectorAll('.btn-delete-cliente').forEach(btn => {
                btn.addEventListener('click', handleDeleteCliente);
            });

            populateSelectOptions();
        } catch (error) {
            console.error('Error cargando clientes:', error);
            elements.clientesTableBody.innerHTML = '<tr><td colspan="8">Error al cargar clientes.</td></tr>';
        }
    }

    async function handleEditCliente(event) {
        const clienteId = parseInt(event.target.dataset.id);
        const cliente = options.clientes.find(c => c.id === clienteId);

        if (!cliente) return;

        document.getElementById('cliente-nombre').value = '';
        document.getElementById('cliente-apellido').value = '';
        document.getElementById('cliente-email').value = '';
        document.getElementById('cliente-empresa').value = cliente.empresa || '';
        document.getElementById('cliente-telefono').value = cliente.telefono || '';
        document.getElementById('cliente-direccion').value = cliente.direccion || '';
        document.getElementById('cliente-ciudad').value = cliente.ciudad || '';
        document.getElementById('cliente-pais').value = cliente.pais || '';

        const drawerTitle = document.getElementById('drawer-title');
        const clienteForm = document.getElementById('cliente-form');
        
        drawerTitle.textContent = `Editar Cliente - ID: ${clienteId}`;
        clienteForm.dataset.mode = 'edit';
        clienteForm.dataset.clienteId = clienteId;

        openDrawer('cliente');
    }

    async function handleDeleteCliente(event) {
        const clienteId = parseInt(event.target.dataset.id);
        
        if (confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${apiBase}/api/clientes`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: clienteId })
                });
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

    async function fetchEquipos() {
        if (!elements.equiposTableBody) return;
        elements.equiposTableBody.innerHTML = '<tr><td colspan="7">Cargando equipos...</td></tr>';

        try {
            const response = await fetch(`${apiBase}/api/equipos`);
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
            const response = await fetch(`${apiBase}/api/tecnicos`);
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
            const response = await fetch(`${apiBase}/api/ordenes`);
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
                row.innerHTML = `
                    <td>${orden.id}</td>
                    <td>${orden.cliente?.empresa || 'N/A'}</td>
                    <td>${orden.equipo?.modelo || 'N/A'}</td>
                    <td>${orden.tecnico?.especialidad || 'N/A'}</td>
                    <td>${orden.tipo}</td>
                    <td>${orden.estado}</td>
                    <td>${orden.fecha_programada ? new Date(orden.fecha_programada).toLocaleDateString('es-CO') : 'No definida'}</td>
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
            const response = await fetch(`${apiBase}/api/cotizaciones`);
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
                row.innerHTML = `
                    <td>${cotizacion.id}</td>
                    <td>${cotizacion.cliente?.empresa || 'N/A'}</td>
                    <td>${cotizacion.descripcion}</td>
                    <td>${Number(cotizacion.monto_estimado).toFixed(2)}</td>
                    <td>${cotizacion.estado}</td>
                    <td>${cotizacion.fecha_solicitud ? new Date(cotizacion.fecha_solicitud).toLocaleDateString('es-CO') : 'N/A'}</td>
                `;
                elements.cotizacionesTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando cotizaciones:', error);
            elements.cotizacionesTableBody.innerHTML = '<tr><td colspan="6">Error al cargar cotizaciones.</td></tr>';
        }
    }

    function populateSelectOptions() {
        const clienteSelects = [
            document.getElementById('equipo-cliente'),
            document.getElementById('orden-cliente'),
            document.getElementById('cotizacion-cliente')
        ].filter(Boolean);
        const tecnicoSelect = document.getElementById('orden-tecnico');
        const equipoSelect = document.getElementById('orden-equipo');

        const clienteOptions = options.clientes.map(cliente => `<option value="${cliente.id}">${cliente.empresa || `Cliente ${cliente.id}`}</option>`).join('');
        clienteSelects.forEach(select => {
            if (select) select.innerHTML = '<option value="">Seleccione un cliente</option>' + clienteOptions;
        });

        if (equipoSelect) {
            equipoSelect.innerHTML = '<option value="">Seleccione un equipo</option>' + options.equipos.map(e => `<option value="${e.id}">${e.marca} ${e.modelo} (${e.serial})</option>`).join('');
        }

        if (tecnicoSelect) {
            tecnicoSelect.innerHTML = '<option value="">Seleccione un técnico</option>' + options.tecnicos.map(t => `<option value="${t.id}">${t.usuario?.nombre || `Técnico ${t.id}`}</option>`).join('');
        }
    }

    async function submitForm(url, payload, successMessage, formId, messageId, refreshCallback) {
        try {
            const response = await fetch(`${apiBase}${url}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
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
                    try {
                        const response = await fetch(`${apiBase}/api/clientes`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const data = await response.json();
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
    }

    function closeDrawer() {
        if (!drawer) return;
        drawer.classList.remove('open');
        drawerBackdrop.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
    }

    function openDrawer(formType) {
        if (!drawer) return;
        drawerForms.forEach(form => form.classList.remove('active'));
        const activeForm = document.getElementById(`drawer-form-${formType}`);
        if (!activeForm) return;
        activeForm.classList.add('active');
        
        // Resetear formulario de cliente si está en modo crear
        if (formType === 'cliente') {
            const clienteForm = document.getElementById('cliente-form');
            const mode = clienteForm.dataset.mode || 'create';
            
            if (mode === 'create') {
                drawerTitle.textContent = 'Crear Cliente';
                clienteForm.reset();
                const messageEl = document.getElementById('cliente-form-message');
                if (messageEl) messageEl.textContent = '';
                // Limpiar los campos que no se resetean con reset()
                document.getElementById('cliente-nombre').value = '';
                document.getElementById('cliente-apellido').value = '';
                document.getElementById('cliente-email').value = '';
            }
        } else {
            drawerTitle.textContent = activeForm.dataset.title || 'Formulario';
        }
        
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
            }
        });
    });

    fetchMetrics();
    fetchClientes();
    fetchEquipos();
    fetchTecnicos();
    bindForms();
    bindFormDrawerButtons();
    showAdminSection('admin-dashboard');
});
