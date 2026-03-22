import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';

interface Client {
  ws: WebSocket;
  runId: string;
}

const clients: Client[] = [];

export function setupWebSocket(server: http.Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const query = parse(req.url || '', true).query;
    const runId = String(query['runId'] || '');

    clients.push({ ws, runId });

    // Send connected acknowledgment
    ws.send(JSON.stringify({ type: 'connected', runId }));

    ws.on('close', () => {
      const idx = clients.findIndex((c) => c.ws === ws);
      if (idx !== -1) clients.splice(idx, 1);
    });
  });
}

export function broadcastToRun(runId: string, message: object): void {
  const payload = JSON.stringify(message);
  clients
    .filter((c) => c.runId === runId && c.ws.readyState === WebSocket.OPEN)
    .forEach((c) => c.ws.send(payload));
}
