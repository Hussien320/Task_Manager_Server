import DashboardNavbar from '@/components/ui/DashboardNavbar';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-900 px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-stretch">
        <DashboardNavbar />
        <section className="min-w-0 flex-1 rounded-2xl border border-gray-700 bg-gray-800/40 p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-gray-400">
            Choose a section from the navigation bar to manage your inventory.
          </p>
        </section>
      </div>
    </main>
  );
}
