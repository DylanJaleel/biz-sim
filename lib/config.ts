// App-wide settings outside the game itself. The game's balancing lives in
// lib/game/config.ts.

// Login rate limits (magic link requests), see lib/rate-limit.ts.
export const LOGIN_EMAIL_LIMIT = 3;
export const LOGIN_EMAIL_WINDOW_SECONDS = 15 * 60;
export const LOGIN_IP_LIMIT = 10;
export const LOGIN_IP_WINDOW_SECONDS = 60 * 60;
