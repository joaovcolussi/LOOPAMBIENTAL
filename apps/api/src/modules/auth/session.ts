import type { Request } from 'express';
import { SESSION_COOKIE } from './auth.service';

export function readSessionToken(request: Request) {
  const cookie = (request.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(`${SESSION_COOKIE}=`.length) || null;
}
