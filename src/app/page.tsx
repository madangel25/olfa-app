import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        {/* Hero */}
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/90">
            Islamic Marriage Platform
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
            Olfa
          </h1>
          <p className="mt-3 text-xl font-medium text-amber-200/95 sm:text-2xl">
            Intentional Islamic Marriage
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300/90">
            A serious, ad-free space for those seeking a spouse with clarity and
            respect. Built on safety, identity verification, and Islamic values.
          </p>
        </header>

        {/* Safety features */}
        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 px-6 py-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold uppercase tracking-wider text-amber-200/90">
              Identity verification
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
              Three-angle photo verification and device fingerprinting help keep
              profiles real and reduce fake or duplicate accounts.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 px-6 py-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold uppercase tracking-wider text-violet-200/90">
              Psychological quiz
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
              A short gatekeeper quiz on values, conflict, and lifestyle so
              matches start from a place of alignment and intention.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 px-6 py-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold uppercase tracking-wider text-sky-200/90">
              Role-based moderation
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
              Dedicated admins and moderators review verifications and monitor
              conversations so the community stays safe and serious.
            </p>
          </div>
        </section>

        {/* CTAs */}
        <section className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-amber-900/30 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900 sm:w-auto"
          >
            Join Olfa
          </Link>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-slate-500/80 bg-slate-900/50 px-6 py-4 text-base font-semibold text-slate-100 backdrop-blur transition hover:border-amber-500/60 hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 sm:w-auto"
          >
            Login
          </Link>
        </section>

        <p className="mt-10 text-center text-xs text-slate-500">
          By joining, you agree to Olfa’s values of respect, sincerity, and
          safety. No ads. No games. Just intention.
        </p>
      </div>
    </div>
  );
}
