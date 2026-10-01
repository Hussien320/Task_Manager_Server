import ProductForm from '@/components/ProductForm';

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-gray-900 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
            Add Product
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Create a new product in your inventory
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-800/40 rounded-2xl border border-gray-700 p-6">
          <ProductForm />
        </div>
      </div>
    </div>
  );
}