import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type RealtimeEvent = {
  type: 'notification' | 'message' | 'payment';
  data: Record<string, unknown>;
};

type Listener = (event: RealtimeEvent) => void;

/**
 * In-process fan-out for Server-Sent Events. Each API instance only delivers
 * events produced by itself; a multi-instance deployment must replace this
 * with Redis pub/sub behind the same publish/subscribe contract.
 */
@Injectable()
export class RealtimeService {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publish(userId: string, event: RealtimeEvent) {
    this.emitter.emit(this.channel(userId), event);
  }

  subscribe(userId: string, listener: Listener) {
    const channel = this.channel(userId);
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }

  connectionCount() {
    return this.emitter
      .eventNames()
      .reduce((total, name) => total + this.emitter.listenerCount(name), 0);
  }

  listenerCount(userId: string) {
    return this.emitter.listenerCount(this.channel(userId));
  }

  private channel(userId: string) {
    return `user:${userId}`;
  }
}
