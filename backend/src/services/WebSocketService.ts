import WebSocket from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
}

export class WebSocketService {
  private wss: WebSocket.Server;
  private clients: Map<string, AuthenticatedWebSocket[]> = new Map();

  constructor(server: http.Server) {
    this.wss = new WebSocket.Server({ server });
    this.setupConnectionHandling();
    this.setupHeartbeat();
    logger.info('WebSocketService initialized.');
  }

  private setupConnectionHandling() {
    this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: http.IncomingMessage) => {
      ws.isAlive = true;

      // Authentication
      const token = req.url?.split('?token=')[1];
      if (!token) {
        ws.close(1008, 'Authentication token missing');
        logger.warn('WebSocket connection attempted without token.');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
        ws.userId = decoded.id;

        if (!this.clients.has(ws.userId)) {
          this.clients.set(ws.userId, []);
        }
        this.clients.get(ws.userId)?.push(ws);
        logger.info(`WebSocket client connected: ${ws.userId}. Total connections for user: ${this.clients.get(ws.userId)?.length}`);

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        ws.on('close', () => {
          this.removeClient(ws);
          logger.info(`WebSocket client disconnected: ${ws.userId || 'unknown'}. Remaining connections for user: ${this.clients.get(ws.userId || 'unknown')?.length || 0}`);
        });

        ws.on('error', (error) => {
          logger.error(`WebSocket error for user ${ws.userId}: ${error.message}`);
          this.removeClient(ws);
        });

      } catch (error) {
        ws.close(1008, 'Authentication failed');
        logger.error(`WebSocket authentication failed: ${(error as Error).message}`);
      }
    });

    this.wss.on('error', (error) => {
      logger.error(`WebSocket server error: ${error.message}`);
    });
  }

  private setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const client = ws as AuthenticatedWebSocket;
        if (!client.isAlive) {
          logger.warn(`Terminating dead WebSocket connection for user: ${client.userId}`);
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000); // Ping clients every 30 seconds
  }

  private removeClient(ws: AuthenticatedWebSocket) {
    if (ws.userId && this.clients.has(ws.userId)) {
      const userClients = this.clients.get(ws.userId)?.filter(client => client !== ws);
      if (userClients && userClients.length > 0) {
        this.clients.set(ws.userId, userClients);
      } else {
        this.clients.delete(ws.userId);
      }
    }
  }

  public broadcastToUser(userId: string, event: string, data: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ event, data }));
        }
      });
      logger.debug(`Broadcasted event '${event}' to user ${userId} with ${userClients.length} connections.`);
    } else {
      logger.debug(`No active WebSocket clients found for user ${userId}.`);
    }
  }

  public broadcastToAll(event: string, data: any) {
    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
      }
    });
    logger.debug(`Broadcasted event '${event}' to all ${this.wss.clients.size} connected clients.`);
  }

  public close() {
    this.wss.close(() => {
      logger.info('WebSocketService closed.');
    });
  }
}