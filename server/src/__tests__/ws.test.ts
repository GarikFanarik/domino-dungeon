import http from 'http';
import { WebSocket } from 'ws';
import { app, server } from '../index';
import { setupWebSocket } from '../ws/game-ws';

jest.mock('../../../src/lib/prisma', () => ({
  default: {
    leaderboardEntry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('../../../src/lib/redis', () => ({
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn(),
    on: jest.fn(),
  },
}));

describe('WebSocket server', () => {
  let testServer: http.Server;
  let port: number;

  beforeAll((done) => {
    testServer = http.createServer(app);
    setupWebSocket(testServer);
    testServer.listen(0, () => {
      port = (testServer.address() as any).port;
      done();
    });
  });

  afterAll((done) => {
    testServer.close(done);
  });

  it('accepts WebSocket connections', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws?runId=test-run`);
    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });
    ws.on('error', done);
  });

  it('sends a connected message on open', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws?runId=test-run`);
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      expect(msg.type).toBe('connected');
      ws.close();
      done();
    });
    ws.on('error', done);
  });
});
