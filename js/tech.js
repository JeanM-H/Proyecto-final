document.addEventListener('DOMContentLoaded', async function () {
    const apiBase = window.location.origin;
    const token = localStorage.getItem('coolcare_token');
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

    const tokenRole = token ? (parseJwt(token)?.rol || parseJwt(token)?.role) : null;
    const role = tokenRole || storedRole;

    if (!token || !tokenRole || role !== 'Técnico') {
        localStorage.removeItem('coolcare_token');
        localStorage.removeItem('coolcare_role');
        window.location.href = 'login.html';
        return;
    }

    const authHeaders = () => ({
        Authorization: `Bearer ${token}`
    });

    const messageBox = document.getElementById('tech-message');
    const ordersTableBody = document.getElementById('orders-table-body');
    const orderSelect = document.getElementById('tech-order-select');
    const orderSummary = document.getElementById('order-summary');
    const maintenanceForm = document.getElementById('maintenance-form');
    const maintenanceHistoryBody = document.getElementById('maintenance-history-body');
    const evidenciasInput = document.getElementById('maintenance-evidencias');
    const evidenciasList = document.getElementById('evidencias-list');

    let assignedOrders = [];
    let selectedOrder = null;
    let tecnicoId = null;
    let selectedEvidencias = [];

    const setMessage = (message, type = 'info') => {
        if (!messageBox) return;
        messageBox.textContent = message;
        messageBox.className = `form-message ${type}`;
    };

    const handleUnauthorized = () => {
        localStorage.removeItem('coolcare_token');
        localStorage.removeItem('coolcare_role');
        window.location.href = 'login.html';
    };

    const fetchTechnician = async () => {
        try {
            const response = await fetch(`${apiBase}/api/tecnicos/me`, {
                headers: authHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();
            if (!response.ok || !data || !data.success || !data.tecnico || !data.tecnico.id) {
                console.error('fetchTechnician response error:', response.status, data);
                setMessage('No se pudo cargar los datos del técnico.', 'error');
                return;
            }

            tecnicoId = data.tecnico.id;
            return tecnicoId;
        } catch (error) {
            console.error('Error cargando técnico:', error);
            setMessage('Error de conexión al cargar técnico.', 'error');
        }
    };

    const fetchAssignedOrders = async () => {
        if (!ordersTableBody || !orderSelect) return;

        try {
            const response = await fetch(`${apiBase}/api/ordenes/assigned`, {
                headers: authHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();
            if (!response.ok || !data.success) {
                ordersTableBody.innerHTML = '<tr><td colspan="7">No fue posible cargar las órdenes.</td></tr>';
                return;
            }

            assignedOrders = data.ordenes || [];
            tecnicoId = data.tecnico_id || tecnicoId;
            renderAssignedOrders();
            renderOrderSelect();
            if (assignedOrders.length > 0) {
                selectOrder(assignedOrders[0].id);
            } else {
                selectOrder(null);
                ordersTableBody.innerHTML = '<tr><td colspan="7">No tienes órdenes asignadas.</td></tr>';
            }
        } catch (error) {
            console.error('Error cargando órdenes asignadas:', error);
            ordersTableBody.innerHTML = '<tr><td colspan="7">Error de conexión.</td></tr>';
        }
    };

    const updateMetrics = () => {
        const metricOrdenes = document.getElementById('metric-tech-ordenes');
        const metricCompletadas = document.getElementById('metric-tech-completadas');
        const metricEquipos = document.getElementById('metric-tech-equipos');

        // Órdenes pendientes
        if (metricOrdenes) {
            const pendingCount = assignedOrders.filter(o => o.estado !== 'Completado' && o.estado !== 'Cancelado').length;
            metricOrdenes.textContent = pendingCount;
        }

        // Órdenes completadas
        if (metricCompletadas) {
            const completedCount = assignedOrders.filter(o => o.estado === 'Completado').length;
            metricCompletadas.textContent = completedCount;
        }

        // Equipos mantenidos (contar únicos)
        if (metricEquipos && maintenanceHistoryBody) {
            const equiposUnicos = new Set();
            const rows = maintenanceHistoryBody.querySelectorAll('tr');
            rows.forEach(row => {
                const equipoCell = row.cells[2];
                if (equipoCell) equiposUnicos.add(equipoCell.textContent);
            });
            metricEquipos.textContent = equiposUnicos.size;
        }
    };

    const renderAssignedOrders = () => {
        if (!ordersTableBody) return;

        if (assignedOrders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="7">No tienes órdenes asignadas.</td></tr>';
            return;
        }

        ordersTableBody.innerHTML = '';
        assignedOrders.forEach(order => {
            const row = document.createElement('tr');
            const estadoClass = `badge-${order.estado.toLowerCase().replace(/\s+/g, '-')}`;
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.cliente?.empresa || 'N/A'}</td>
                <td>${order.equipo?.marca || 'N/A'} ${order.equipo?.modelo || ''}</td>
                <td>${order.tipo}</td>
                <td><span class="badge ${estadoClass}">${order.estado}</span></td>
                <td>${order.fecha_programada ? new Date(order.fecha_programada).toLocaleString('es-CO') : 'No definida'}</td>
            `;
            row.addEventListener('click', () => selectOrder(order.id));
            ordersTableBody.appendChild(row);
        });
        updateMetrics();
    };

    const renderOrderSelect = () => {
        if (!orderSelect) return;

        const options = assignedOrders.map(order => `
            <option value="${order.id}">Orden #${order.id} - ${order.equipo?.marca || 'Equipo'} ${order.equipo?.modelo || ''}</option>
        `).join('');

        orderSelect.innerHTML = '<option value="">Selecciona una orden</option>' + options;
    };

    const selectOrder = orderId => {
        selectedOrder = assignedOrders.find(order => order.id === Number(orderId)) || null;
        if (orderSelect) {
            orderSelect.value = orderId || '';
        }

        if (!selectedOrder) {
            orderSummary.innerHTML = '<p>No hay orden seleccionada.</p>';
            return;
        }

        orderSummary.innerHTML = `
            <p><strong>Orden:</strong> ${selectedOrder.id}</p>
            <p><strong>Cliente:</strong> ${selectedOrder.cliente?.empresa || 'N/A'}</p>
            <p><strong>Equipo:</strong> ${selectedOrder.equipo?.marca || 'N/A'} ${selectedOrder.equipo?.modelo || 'N/A'}</p>
            <p><strong>Tipo de servicio:</strong> ${selectedOrder.tipo}</p>
            <p><strong>Descripción:</strong> ${selectedOrder.descripcion || 'N/A'}</p>
            <p><strong>Estado actual:</strong> ${selectedOrder.estado}</p>
            <p><strong>Fecha programada:</strong> ${selectedOrder.fecha_programada ? new Date(selectedOrder.fecha_programada).toLocaleString('es-CO') : 'No definida'}</p>
        `;
    };

    const fetchMaintenanceHistory = async () => {
        if (!maintenanceHistoryBody || !tecnicoId) return;

        try {
            const response = await fetch(`${apiBase}/api/mantenimientos/tecnico/${tecnicoId}`, {
                headers: authHeaders()
            });

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();
            if (!response.ok || !data.success) {
                maintenanceHistoryBody.innerHTML = '<tr><td colspan="6">No fue posible cargar el historial.</td></tr>';
                return;
            }

            const history = data.mantenimientos || [];
            if (history.length === 0) {
                maintenanceHistoryBody.innerHTML = '<tr><td colspan="6">No hay mantenimientos registrados.</td></tr>';
                return;
            }

            maintenanceHistoryBody.innerHTML = history.map(item => `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.orden_id}</td>
                    <td>${item.notas}</td>
                    <td>${item.tiempo_dedicado || 'N/A'}</td>
                    <td>${item.repuestos_utilizados || 'N/A'}</td>
                    <td>${item.fecha_fin ? new Date(item.fecha_fin).toLocaleString('es-CO') : 'No finalizado'}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error cargando historial de mantenimientos:', error);
            maintenanceHistoryBody.innerHTML = '<tr><td colspan="6">Error de conexión.</td></tr>';
        }
    };

    if (orderSelect) {
        orderSelect.addEventListener('change', event => {
            selectOrder(event.target.value);
        });
    }

    // Manejar selección de evidencias
    const renderEvidenciasList = () => {
        if (!evidenciasList) return;

        if (selectedEvidencias.length === 0) {
            evidenciasList.innerHTML = '';
            return;
        }

        evidenciasList.innerHTML = selectedEvidencias.map((file, index) => `
            <div class="evidencia-item">
                <span class="evidencia-file-name">${file.name}</span>
                <span class="evidencia-file-size">${(file.size / 1024).toFixed(2)} KB</span>
                <button type="button" class="evidencia-remove-btn" onclick="removeEvidencia(${index})">Eliminar</button>
            </div>
        `).join('');
    };

    const removeEvidencia = (index) => {
        selectedEvidencias.splice(index, 1);
        renderEvidenciasList();
    };

    window.removeEvidencia = removeEvidencia;

    if (evidenciasInput) {
        evidenciasInput.addEventListener('change', event => {
            selectedEvidencias = Array.from(event.target.files);
            renderEvidenciasList();
        });
    }

    const uploadEvidencias = async (maintenanceId) => {
        if (selectedEvidencias.length === 0) {
            return [];
        }

        const uploadedEvidencias = [];

        for (const file of selectedEvidencias) {
            try {
                // Convertir archivo a base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                });

                // Enviar metadata de evidencia a la API
                const response = await fetch(`${apiBase}/api/evidencias`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders()
                    },
                    body: JSON.stringify({
                        mantenimiento_id: maintenanceId,
                        archivo_nombre: file.name,
                        archivo_ruta: `evidencias/${maintenanceId}/${Date.now()}_${file.name}`,
                        tipo: file.type.includes('image') ? 'Foto' : (file.type.includes('pdf') ? 'Documento' : 'Documento'),
                        descripcion: `Evidencia: ${file.name}`
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    uploadedEvidencias.push(data.evidencia || data.data);
                }
            } catch (error) {
                console.error('Error subiendo evidencia:', error);
            }
        }

        return uploadedEvidencias;
    };

    if (maintenanceForm) {
        maintenanceForm.addEventListener('submit', async event => {
            event.preventDefault();

            if (!selectedOrder) {
                setMessage('Selecciona una orden antes de registrar el mantenimiento.', 'error');
                return;
            }

            const notas = document.getElementById('maintenance-notes').value.trim();
            const tiempo = Number(document.getElementById('maintenance-time').value);
            const repuestos = document.getElementById('maintenance-parts').value.trim();
            const fechaInicio = document.getElementById('maintenance-start').value;
            const fechaFin = document.getElementById('maintenance-end').value;
            const observaciones = document.getElementById('maintenance-observations').value.trim();

            if (!notas || !tiempo) {
                setMessage('Ingresa notas y tiempo dedicado.', 'error');
                return;
            }

            try {
                const response = await fetch(`${apiBase}/api/mantenimientos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders()
                    },
                    body: JSON.stringify({
                        orden_id: selectedOrder.id,
                        notas,
                        tiempo_dedicado: tiempo,
                        repuestos_utilizados: repuestos,
                        fecha_inicio: fechaInicio || new Date().toISOString(),
                        fecha_fin: fechaFin || null,
                        observaciones
                    })
                });

                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }

                const data = await response.json();
                if (!response.ok || !data.success) {
                    console.error('Error registrando mantenimiento:', response.status, data);
                    setMessage(data.message || 'Error registrando mantenimiento.', 'error');
                    return;
                }

                // Subir evidencias si las hay
                if (selectedEvidencias.length > 0) {
                    const maintenanceId = data.mantenimiento?.id || data.data?.id || data.data?.[0]?.id;
                    if (!maintenanceId) {
                        setMessage('No se pudo obtener el ID del mantenimiento para subir evidencias.', 'error');
                        return;
                    }
                    setMessage('Mantenimiento registrado. Subiendo evidencias...', 'info');
                    await uploadEvidencias(maintenanceId);
                }

                setMessage('Mantenimiento y evidencias registrados correctamente.', 'success');
                maintenanceForm.reset();
                selectedEvidencias = [];
                renderEvidenciasList();
                await fetchAssignedOrders();
                await fetchMaintenanceHistory();
            } catch (error) {
                console.error('Error guardando mantenimiento:', error);
                setMessage('Error de conexión al registrar mantenimiento.', 'error');
            }
        });
    }

    await fetchTechnician();
    await fetchAssignedOrders();
    await fetchMaintenanceHistory();
});
