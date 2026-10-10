"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(requestMagicLink, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        E-Mail-Adresse
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        placeholder="du@beispiel.de"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "email-error" : undefined}
        className="h-12 rounded-xl border border-black/15 bg-white px-4 text-base text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {state.error && (
        <p id="email-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-12 rounded-xl bg-blue-600 text-base font-semibold text-white transition-colors active:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Wird gesendet…" : "Login-Link senden"}
      </button>
    </form>
  );
}
