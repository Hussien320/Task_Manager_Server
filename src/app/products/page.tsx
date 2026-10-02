'use client';

import ProductForm from '@/components/ProductForm';
import LoggedOutButton from '@/components/LoggedOutButton';

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-gray-900 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
              Add Product
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Create a new product in your inventory
            </p>
          </div>

          <div className="self-start sm:self-auto">
            <LoggedOutButton className="bg-red-600 hover:bg-red-700 focus:ring-red-500" />
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-800/40 rounded-2xl border border-gray-700 p-6">
          <ProductForm />
        </div>
      </div>
    </div>
  );
}