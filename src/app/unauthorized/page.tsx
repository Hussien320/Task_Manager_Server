import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-10">
      <section
        role="alert"
        className="w-full max-w-md border-l-4 border-amber-400 bg-gray-800 px-6 py-8"
      >
        <p className="text-sm font-semibold uppercase text-amber-300">
          Access denied
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white">
          You can’t view this page
        </h1>
        <p className="mt-2 text-sm text-gray-300">
          Your account role does not have permission to access this page.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-10 items-center justify-center bg-cyan-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          Return to login
        </Link>
      </section>
    </main>
  );
}