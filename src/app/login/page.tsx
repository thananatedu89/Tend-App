import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; notice?: string }>;
}) {
  const { error, mode, notice } = await searchParams;
  const isSignup = mode === "signup";

  if (notice === "confirm-email") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-3xl mb-1">Check your email</h1>
          <p className="font-body text-sm text-ink/60">
            We sent you a link to confirm your account. Once you click it,
            come back and log in.
          </p>
          <a
            href="/login"
            className="font-body mt-6 inline-block text-sm text-sage underline"
          >
            Back to log in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">
          {isSignup ? "Let's get a clear picture" : "Welcome back"}
        </h1>
        <p className="font-body text-sm text-ink/60 mb-8">
          {isSignup
            ? "Create an account to start tending your money."
            : "Know where you stand."}
        </p>

        <form
          action={isSignup ? signup : login}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-body text-sm text-ink/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-body text-sm text-ink/70"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="font-body rounded-md border border-mist bg-paper px-3 py-2 text-ink outline-none focus:border-sage"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-ink/70">{error}</p>
          )}

          <button
            type="submit"
            className="font-body mt-2 rounded-md bg-ink px-3 py-2 text-paper transition-opacity hover:opacity-90"
          >
            {isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="font-body mt-6 text-sm text-ink/60">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <a href="/login" className="text-sage underline">
                Log in
              </a>
            </>
          ) : (
            <>
              New to Tend?{" "}
              <a href="/login?mode=signup" className="text-sage underline">
                Create an account
              </a>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
