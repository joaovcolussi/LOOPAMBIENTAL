import { Controller, MessageEvent, Req, Sse, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  concatMap,
  filter,
  interval,
  map,
  merge,
  Observable,
  share,
  takeUntil,
} from 'rxjs';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { readSessionToken } from '../auth/session';
import { RealtimeService } from '../../infrastructure/realtime.service';

const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events stream for the authenticated user. It only carries
 * events addressed to that user (new notifications, messages and payment
 * confirmations); clients fall back to polling when the stream drops.
 */
@Controller('events')
export class RealtimeController {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly auth: AuthService,
  ) {}

  @Sse('stream')
  @SkipThrottle()
  @UseGuards(AuthGuard)
  stream(@Req() request: AuthenticatedRequest): Observable<MessageEvent> {
    const userId = request.user.id;
    const token = readSessionToken(request);
    const events = new Observable<MessageEvent>((subscriber) => {
      subscriber.next({ type: 'ready', data: { userId } });
      return this.realtime.subscribe(userId, (event) =>
        subscriber.next({ type: event.type, data: event.data }),
      );
    });
    // The guard only runs at connect, so every heartbeat re-checks the
    // session: logout, revocation or expiry closes the stream.
    const sessionChecks = interval(HEARTBEAT_MS).pipe(
      concatMap(() =>
        token
          ? this.auth.isSessionActive(token, userId).catch(() => false)
          : Promise.resolve(false),
      ),
      share(),
    );
    const heartbeat = sessionChecks.pipe(
      filter(Boolean),
      map((): MessageEvent => ({ type: 'ping', data: { at: Date.now() } })),
    );
    return merge(events, heartbeat).pipe(
      takeUntil(sessionChecks.pipe(filter((active) => !active))),
    );
  }
}
