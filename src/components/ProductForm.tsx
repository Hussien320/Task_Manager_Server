'use client';

import { useState, useEffect } from 'react';
import { Package, DollarSign, Tag, Calendar, AlertTriangle, Truck } from 'lucide-react';
import { ProductType } from '@/app/generated/prisma/enums';
import { api } from '@/lib/api';
import { ApiException } from '@/utils/exceptions/ApiException';
import type { SupplierResponse } from '@/types/Supplier';
import Input from './ui/Input';
import Button from './ui/Button';
import FormError from './ui/FormError';

function ProductForm() {
  // ═══ FORM STATE ═══
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState<ProductType>(ProductType.PLASTIC);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [lowStockThreshold, setLowStockThreshold] = useState(0);
  const [supplierName, setSupplierName] = useState('');

  // ═══ UI STATE ═══
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // ═══ FETCH SUPPLIERS ON MOUNT ═══
  useEffect(() => {
    async function loadSuppliers() {
      try {
        const response = await api.suppliers.getactive();
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
  }, []);

  // ═══ HANDLE SUBMIT ═══
  async function handleCreateProduct(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name || !quantity || !price || !category || !supplierName) {
      setError('All fields are required');
      return;
    }

    setLoading(true);

    try {
      await api.products.add({
        name,
        quantity,
        price,
        category,
        expiry_date: expiryDate ? new Date(expiryDate) : null,
       
        supplier_name: supplierName,
      });

      // Reset form
      setName('');
      setQuantity(0);
      setPrice(0);
      setCategory(ProductType.PLASTIC);
      setExpiryDate('');
      setLowStockThreshold(0);
      setSupplierName('');
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  // ═══ RENDER ═══
  return (
    <form onSubmit={handleCreateProduct} className="space-y-4">
      {/* Name */}
      <Input
        icon={Package}
        type="text"
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />

      {/* Quantity */}
      <Input
        icon={Package}
        type="number"
        placeholder="Quantity"
        value={quantity || ''}
        onChange={(e) => setQuantity(Number(e.target.value))}
        disabled={loading}
      />

      {/* Price */}
      <Input
        icon={DollarSign}
        type="number"
        step="0.01"
        placeholder="Price"
        value={price || ''}
        onChange={(e) => setPrice(Number(e.target.value))}
        disabled={loading}
      />

      {/* Category (dropdown) */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Tag className="size-5 text-gray-500" />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductType)}
          disabled={loading}
          className="w-full pl-10 pr-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white transition duration-200"
        >
          {Object.values(ProductType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Expiry date (optional) */}
      <Input
        icon={Calendar}
        type="date"
        placeholder="Expiry date (optional)"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
        disabled={loading}
      />

      
      {/* Supplier (dropdown) */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Truck className="size-5 text-gray-500" />
        </div>
        <select
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          disabled={loading || loadingSuppliers}
          className="w-full pl-10 pr-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white transition duration-200"
        >
          <option value="">
            {loadingSuppliers ? 'Loading suppliers...' : 'Select a supplier'}
          </option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.name}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && <FormError message={error} />}

      {/* Submit */}
      <Button type="submit" fullWidth isLoading={loading}>
        {loading ? 'Creating...' : 'Create Product'}
      </Button>
    </form>
  );
}

export default ProductForm;