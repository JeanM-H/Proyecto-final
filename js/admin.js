document.addEventListener('DOMContentLoaded', function () {
    const adminTabs = document.querySelectorAll('.admin-tab');
    const clientesTableBody = document.getElementById('clientes-table-body');
    let clientsLoaded = false;

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
            const response = await fetch('/api/dashboard-metrics');
            const data = await response.json();

            if (response.ok && data.success && data.counts) {
                document.getElementById('metric-clientes').textContent = data.counts.clientes || 0;
                document.getElementById('metric-equipos').textContent = data.counts.equipos || 0;
                document.getElementById('metric-tecnicos').textContent = data.counts.tecnicos || 0;
                document.getElementById('metric-ordenes').textContent = data.counts.ordenes || 0;
            }
        } catch (error) {
            console.error('Error cargando métricas:', error);
        }
    }

    async function fetchClientes() {
        if (clientsLoaded) {
            return;
        }

        if (!clientesTableBody) {
            return;
        }

        clientesTableBody.innerHTML = '<tr><td colspan="6">Cargando clientes...</td></tr>';

        try {
            const response = await fetch('/api/clientes');
            const data = await response.json();

            if (!response.ok || !data.success) {
                clientesTableBody.innerHTML = '<tr><td colspan="6">No se pudieron cargar los clientes.</td></tr>';
                return;
            }

            if (!data.clientes || data.clientes.length === 0) {
                clientesTableBody.innerHTML = '<tr><td colspan="6">No hay clientes registrados.</td></tr>';
                clientsLoaded = true;
                return;
            }

            clientesTableBody.innerHTML = '';
            data.clientes.forEach(cliente => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${cliente.id}</td>
                    <td>${cliente.empresa || 'N/A'}</td>
                    <td>${cliente.telefono || 'N/A'}</td>
                    <td>${cliente.ciudad || 'N/A'}</td>
                    <td>${cliente.pais || 'N/A'}</td>
                    <td>${new Date(cliente.created_at).toLocaleDateString('es-CO')}</td>
                `;
                clientesTableBody.appendChild(row);
            });
            clientsLoaded = true;
        } catch (error) {
            console.error('Error cargando clientes:', error);
            clientesTableBody.innerHTML = '<tr><td colspan="6">Error al cargar clientes.</td></tr>';
        }
    }

    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sectionId = `admin-${tab.dataset.section}`;
            showAdminSection(sectionId);
            if (tab.dataset.section === 'clientes') {
                fetchClientes();
            }
        });
    });

    fetchMetrics();
    showAdminSection('admin-dashboard');
});
