import { Server } from 'socket.io';
import { EventBus } from '../events';
import { ILogger } from '@pjtaudirabot/core';

export interface LiveChatMessage {
  platform: 'whatsapp' | 'telegram';
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  imageUrl?: string;
}

export class LiveChatService {
  private io: Server;
  private logger: ILogger;

  constructor(
    private eventBus: EventBus,
    logger: ILogger,
    port: number = 4005 // Using 4005 to avoid common port conflicts
  ) {
    this.logger = logger.child({ service: 'live-chat' });
    this.io = new Server(port, {
      cors: {
        origin: '*', // Allow all for now, refined in production
        methods: ['GET', 'POST']
      }
    });

    this.logger.info(`LiveChat WebSocket Signal Bridge active on port ${port}`);

    this.setupListeners();
  }

  private setupListeners() {
    this.io.on('connection', (socket) => {
      this.logger.debug('Dashboard connected to bridge', { socketId: socket.id });

      socket.on('disconnect', () => {
        this.logger.debug('Dashboard disconnected from bridge', { socketId: socket.id });
      });

      // Handle Admin Takeover commands from the dashboard
      socket.on('agent:takeover', async (data: { platform: string, userId: string, text: string }) => {
        this.logger.info('Strategic Agent Takeover received from Dashboard', data);
        // Emit for bots to catch and send to WhatsApp/Telegram
        await this.eventBus.emit('agent.takeover', data);
      });
    });

    // Pipe ALL bot events to the dashboard for real-time monitoring
    this.eventBus.on('*', (event) => {
      this.io.emit('bot:event', event);
    });
    
    // Specifically handle message received events for the live chat terminal
    this.eventBus.on('message.received', (event) => {
      this.io.emit('chat:message', event.data);
    });
  }

  public getIO() {
    return this.io;
  }
}
