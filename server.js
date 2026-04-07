const http = require("http");
const url = require("url");

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }

    if (pathname === "/api") {
        res.writeHead(200);
        res.end(JSON.stringify({
            mensaje: "API de Climatizacion - Sistema de Mantenimiento",
            version: "1.0.0",
            estado: "En desarrollo",
            timestamp: new Date().toISOString()
        }));
    } else if (pathname === "/health") {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: "OK",
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Ruta no encontrada" }));
    }
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
    console.log(`http://0.0.0.0:${PORT}/api`);
});
