'use client';

import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import ProductForm from '@/components/ProductForm';
import ReloadProductForm from '@/components/ReloadProductForm';
import WithdrawProductForm from '@/components/WithdrawProductForm';
import LoggedOutButton from '@/components/LoggedOutButton';

export default function ProductsPage() {
  const [isWithdrawFormOpen, setIsWithdrawFormOpen] = useState(false);
  const [isReloadFormOpen, setIsReloadFormOpen] = useState(false);

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

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Reload Product</h2>
              <p className="mt-2 text-sm text-gray-400">Increase stock by product name</p>
            </div>
            <button
              type="button"
              aria-label={isReloadFormOpen ? 'Close reload form' : 'Open reload form'}
              aria-expanded={isReloadFormOpen}
              aria-controls="reload-product-form"
              title={isReloadFormOpen ? 'Close reload form' : 'Reload product'}
              onClick={() => setIsReloadFormOpen((isOpen) => !isOpen)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-700 text-gray-300 transition hover:border-green-500 hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {isReloadFormOpen ? <X aria-hidden="true" size={20} /> : <Plus aria-hidden="true" size={20} />}
            </button>
          </div>
          {isReloadFormOpen && (
            <div id="reload-product-form" className="bg-gray-800/40 rounded-2xl border border-gray-700 p-6">
              <ReloadProductForm />
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Withdraw Product</h2>
              <p className="mt-2 text-sm text-gray-400">Remove stock from your inventory</p>
            </div>
            <button
              type="button"
              aria-label={isWithdrawFormOpen ? 'Close withdraw form' : 'Open withdraw form'}
              aria-expanded={isWithdrawFormOpen}
              aria-controls="withdraw-product-form"
              title={isWithdrawFormOpen ? 'Close withdraw form' : 'Withdraw product'}
              onClick={() => setIsWithdrawFormOpen((isOpen) => !isOpen)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-700 text-gray-300 transition hover:border-red-500 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {isWithdrawFormOpen ? <X aria-hidden="true" size={20} /> : <Minus aria-hidden="true" size={20} />}
            </button>
          </div>
          {isWithdrawFormOpen && (
            <div id="withdraw-product-form" className="bg-gray-800/40 rounded-2xl border border-gray-700 p-6">
              <WithdrawProductForm />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}