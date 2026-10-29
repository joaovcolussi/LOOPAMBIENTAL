import { Controller, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { interval, map, merge, Observable } from 'rxjs';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RealtimeService } from '../../infrastructure/realtime.service';

const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events stream for the authenticated user. It only carries
 * events addressed to that user (new notifications, messages and payment
 * confirmations); clients fall back to polling when the stream drops.
 */
@Controller('events')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Sse('stream')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  stream(@Req() request: AuthenticatedRequest): Observable<MessageEvent> {
    const userId = request.user.id;
    const events = new Observable<MessageEvent>((subscriber) => {
      subscriber.next({ type: 'ready', data: { userId } });
      return this.realtime.subscribe(userId, (event) =>
        subscriber.next({ type: event.type, data: event.data }),
      );
    });
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: { at: Date.now() } })),
    );
    return merge(events, heartbeat);
  }
}
