import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server } from 'ws';
import { ORDER_EVENTS } from '../orders/orders.service';

@WebSocketGateway({
  path: '/api/ws',
  cors: { origin: '*' },
})
export class EventsGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  onModuleInit() {
    ORDER_EVENTS.on('order:updated', (data: any) => {
      if (this.server) {
        this.server.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ event: 'order:updated', data }));
          }
        });
      }
    });
  }
}
