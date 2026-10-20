import DashboardNavbar from '@/components/ui/DashboardNavbar';
import SupplierTable from '@/components/SupplierTabel';

export default function SuppliersPage() {
  return (
    <main className="min-h-screen bg-gray-900 px-4 py-4">
      <div className="flex w-full flex-col gap-6 md:flex-row md:items-stretch">
        <DashboardNavbar />
        <SupplierTable />
      </div>
    </main>
  );
}
