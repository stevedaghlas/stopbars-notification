const express = require("express");
const WebSocket = require("ws");


const app = express();
const port = process.env.PORT || 3000; // Use Render's dynamic port

let lastStatus = "";

// Serve static files
app.use(express.static("public"));

// WebSocket server setup
const wss = new WebSocket.Server({ noServer: true });

async function checkControllers() {
    try {
        const response = await fetch("https://api.stopbars.com/all");
        const data = await response.json();

        const runways = data.runways || [];
        const stopbars = data.stopbars || [];
        const totalControllers = runways.length + stopbars.length;

        if (totalControllers > 0) {
            let icaoCodes = new Set();
            
            runways.forEach(r => icaoCodes.add(r.airportICAO));
            stopbars.forEach(s => icaoCodes.add(s.airportICAO));

            let message = Array.from(icaoCodes).join(", ");

            if (message !== lastStatus) {
                lastStatus = message;
                notifyClients(message);
            }
        }
    } catch (error) {
        console.error("Error fetching STOPBARS API:", error);
    }
}

// Send messages to WebSocket clients
function notifyClients(message) {
    console.log("🔔 Sending notification:", message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Poll API every 30 seconds
setInterval(checkControllers, 30000);

// Start Express server
const server = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port} or Render's assigned domain`);
});

// WebSocket Upgrade Handling (needed for Render)
server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit("connection", ws, request);
    });
});
