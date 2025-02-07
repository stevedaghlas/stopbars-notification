const express = require("express");
const WebSocket = require("ws");
// const fetch = require("node-fetch");

const app = express();
const port = 3000;
let lastStatus = ""; // Track last known controller status

// Serve static files (Frontend)
app.use(express.static("public"));

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// API polling function
async function checkControllers() {
    try {
        const response = await fetch("https://api.stopbars.com/all");
        const data = await response.json();

        const runways = data.runways || [];
        const stopbars = data.stopbars || [];
        const totalControllers = runways.length + stopbars.length;

        if (totalControllers > 0) {
            let icaoCodes = new Set(); // Use a Set to avoid duplicates
            
            runways.forEach(r => {
                icaoCodes.add(r.airportICAO);
            });

            stopbars.forEach(s => {
                icaoCodes.add(s.airportICAO);
            });

            let message = Array.from(icaoCodes).join(", "); // Convert Set to comma-separated string

            console.log("Full Controller List:", Array.from(icaoCodes).join(", ")); // Debug full list
            if (message !== lastStatus) {
                lastStatus = message;
                notifyClients(message);
            }
        }
    } catch (error) {
        console.error("Error fetching STOPBARS API:", error);
    }
}

// Send message to all connected WebSocket clients
function notifyClients(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Poll API every 30 seconds
setInterval(checkControllers, 30000);

// Upgrade HTTP to WebSocket
const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit("connection", ws, request);
    });
});
