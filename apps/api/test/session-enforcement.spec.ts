import { ModerationGuard } from '../src/modules/auth/moderation.guard';
import { RealtimeController } from '../src/modules/realtime/realtime.controller';

function httpContext(user: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

describe('ModerationGuard', () => {
  const original = process.env.REQUIRE_ADMIN_MFA;
  afterEach(() => {
    if (original === undefined) delete process.env.REQUIRE_ADMIN_MFA;
    else process.env.REQUIRE_ADMIN_MFA = original;
  });

  it('applies the staff MFA policy to moderation routes', () => {
    process.env.REQUIRE_ADMIN_MFA = 'true';
    const moderator = {
      platformRole: 'MODERATOR',
      email: 'moderacao@example.com',
      emailVerifiedAt: new Date(),
      mfaEnabledAt: null,
    };
    const guard = new ModerationGuard();
    expect(() => guard.canActivate(httpContext(moderator))).toThrow(
      'ADMIN_MFA_REQUIRED',
    );
    expect(
      guard.canActivate(
        httpContext({ ...moderator, mfaEnabledAt: new Date() }),
      ),
    ).toBe(true);
  });
});

describe('RealtimeController', () => {
  afterEach(() => jest.useRealTimers());

  it('closes the stream once the session is revoked or expires', async () => {
    jest.useFakeTimers();
    const unsubscribe = jest.fn();
    const realtime = { subscribe: jest.fn(() => unsubscribe) };
    const auth = {
      isSessionActive: jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false),
    };
    const controller = new RealtimeController(realtime as never, auth as never);
    const request = {
      user: { id: 'user-1' },
      headers: { cookie: 'loopambiental_session=token-1' },
    };
    const received: unknown[] = [];
    let completed = false;
    controller.stream(request as never).subscribe({
      next: (event) => received.push(event.type),
      complete: () => {
        completed = true;
      },
    });

    await jest.advanceTimersByTimeAsync(25_000);
    await jest.advanceTimersByTimeAsync(25_000);

    expect(received).toEqual(['ready', 'ping']);
    expect(completed).toBe(true);
    expect(unsubscribe).toHaveBeenCalled();
    expect(auth.isSessionActive).toHaveBeenCalledWith('token-1', 'user-1');
  });
});
