'use client';

import { api } from "@/lib/api";
import SupplierForm from "@/components/SupplierForm";
import type { SupplierResponse } from "@/types/Supplier";
import { ApiException } from "@/utils/exceptions/ApiException";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function SupplierTable() {
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [inactivatingSupplierId, setInactivatingSupplierId] = useState<string | null>(null);
  const supplierDialogRef = useRef<HTMLDialogElement>(null);

  async function handleInactivateSupplier(supplier: SupplierResponse) {
    setError(null);
    setInactivatingSupplierId(supplier.id);

    try {
      await api.suppliers.inactivate(supplier.id);
      setSuppliers((currentSuppliers) =>
        currentSuppliers.map((currentSupplier) =>
          currentSupplier.id === supplier.id
            ? { ...currentSupplier, is_active: false }
            : currentSupplier
        )
      );
    } catch (err) {
      setError(
        err instanceof ApiException
          ? err.message
          : `Failed to inactivate ${supplier.name}`
      );
    } finally {
      setInactivatingSupplierId(null);
    }
  }

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const response = await api.suppliers.getAll();
        setSuppliers(response.data.suppliers);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError('Failed to load suppliers');
        }
      } finally {
        setLoadingSuppliers(false);
      }
    }

    loadSuppliers();
  }, [refreshKey]);

  useEffect(() => {
    const dialog = supplierDialogRef.current;
    if (!dialog) return;

    if (showSupplierForm && !dialog.open) {
      dialog.showModal();
    } else if (!showSupplierForm && dialog.open) {
      dialog.close();
    }
  }, [showSupplierForm]);

  return (
    <section className="min-w-0 flex-1 rounded-2xl border border-gray-700 bg-gray-800/40 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Suppliers</h1>
        <button
          type="button"
          aria-label={showSupplierForm ? "Close supplier form" : "Add supplier"}
          title={showSupplierForm ? "Close supplier form" : "Add supplier"}
          aria-expanded={showSupplierForm}
          onClick={() => setShowSupplierForm((isVisible) => !isVisible)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-600 text-gray-200 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {showSupplierForm ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>
      </div>
      <dialog
        ref={supplierDialogRef}
        aria-labelledby="add-supplier-title"
        onClose={() => setShowSupplierForm(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            supplierDialogRef.current?.close();
          }
        }}
        className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-gray-700 bg-gray-800 p-6 text-white shadow-2xl backdrop:bg-black/70"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="add-supplier-title" className="text-lg font-semibold">
            Add supplier
          </h2>
          <button
            type="button"
            aria-label="Close supplier form"
            onClick={() => setShowSupplierForm(false)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-600 text-gray-200 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <SupplierForm onCreated={() => setRefreshKey((key) => key + 1)} />
      </dialog>
      {error && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}
      {loadingSuppliers ? (
        <p role="status" className="text-gray-400">Loading suppliers...</p>
      ) : suppliers.length === 0 ? (
        <p className="text-gray-400">No suppliers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-300">
            <thead>
              <tr className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-400">
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Product type</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-gray-700/70 last:border-0">
                  <td className="px-4 py-3 font-medium text-white">{supplier.name}</td>
                  <td className="px-4 py-3">{supplier.product_type}</td>
                  <td className={`px-4 py-3 ${supplier.is_active ? 'text-gray-300' : 'font-medium text-red-400'}`}>
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="px-4 py-3">
                    {supplier.is_active && (
                      <button
                        type="button"
                        aria-label={`Inactivate ${supplier.name}`}
                        title={`Inactivate ${supplier.name}`}
                        disabled={inactivatingSupplierId !== null}
                        onClick={() => handleInactivateSupplier(supplier)}
                        className="inline-flex size-9 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}