import DashboardNavbar from '@/components/ui/DashboardNavbar';
import UserTable from '@/components/UserTable';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-900 px-4 py-4">
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-stretch">
        <DashboardNavbar />
        <UserTable />
      </div>
    </main>
  );
}
