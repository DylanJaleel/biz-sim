export async function AuthErrorBanner({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;

  const message =
    error === "Verification"
      ? "Dieser Login-Link ist abgelaufen oder wurde bereits verwendet. Fordere einen neuen an."
      : "Die Anmeldung hat nicht geklappt. Bitte versuche es erneut.";

  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
    >
      {message}
    </p>
  );
}
