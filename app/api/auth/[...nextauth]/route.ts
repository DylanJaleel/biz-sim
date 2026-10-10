import { handlers } from "@/auth";

// GET only (magic-link callback, CSRF token). Sign-in and sign-out run through
// server actions, so there is deliberately no POST endpoint that could send
// login emails while bypassing the rate limit in app/login/actions.ts.
export const { GET } = handlers;
