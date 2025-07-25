const { WebSocketServer } = require('ws');
const http = require('http');

function setupWebSocket(server) {
  // WebSocket for real-time updates
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      console.log('WebSocket message:', message.toString());
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast function for file changes
  function broadcast(data) {
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(data));
      }
    });
  }

  return { wss, broadcast };
}

module.exports = setupWebSocket;