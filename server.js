const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    if (req.url === "/health" || req.url === "/" || req.url === "/api") {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: "OK",
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not found" }));
    }
});

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

process.on("uncaughtException", (err) => {
    console.error("Error:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("Rejection:", reason);
});
