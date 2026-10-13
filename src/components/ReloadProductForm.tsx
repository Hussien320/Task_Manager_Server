'use client';

import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { ApiException } from '@/utils/exceptions/ApiException';
import Input from './ui/Input';
import Button from './ui/Button';
import FormError from './ui/FormError';

function ReloadProductForm() {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productId, setProductId] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function handleLookup(e?: React.SyntheticEvent<HTMLFormElement>) {
    e?.preventDefault();
    setError(null);
    setSuccess(null);
    setProductId('');
    setCurrentQuantity(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a product name');
      return;
    }

    setLookupLoading(true);

    try {
      const response = await api.products.getByName(trimmedName);
      setProductId(response.data.id);
      setCurrentQuantity(response.data.quantity);
      setSuccess(`Found ${response.data.name}. Current stock: ${response.data.quantity}`);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Unable to find product');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleReload(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!productId) {
      setError('Find the product before reloading stock');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Reload quantity must be greater than zero');
      return;
    }

    setLoading(true);

    try {
      const response = await api.products.reload(productId, parsedQuantity);
      setCurrentQuantity(response.data.quantity);
      setQuantity('');
      setSuccess(`${response.data.name}: stock increased to ${response.data.quantity}`);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleLookup} className="space-y-4">
        <Input
          icon={Package}
          type="text"
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={100}
          required
          disabled={lookupLoading || loading}
        />

        <Button type="submit" fullWidth isLoading={lookupLoading}>
          {lookupLoading ? 'Finding product...' : 'Find Product'}
        </Button>
      </form>

      {productId && currentQuantity !== null && (
        <div className="rounded-xl border border-green-700/60 bg-green-950/20 p-4 text-sm text-green-200">
          Product found: <span className="font-semibold">{name.trim()}</span>
          <div className="mt-1">Current quantity: {currentQuantity}</div>
        </div>
      )}

      <form onSubmit={handleReload} className="space-y-4">
        <Input
          icon={Plus}
          type="number"
          placeholder="Quantity to add"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min={1}
          max={999999}
          step={1}
          required
          disabled={loading || !productId}
        />

        {error && <FormError message={error} />}
        {success && <p role="status" className="text-sm text-green-400">{success}</p>}

        <Button type="submit" fullWidth isLoading={loading} disabled={!productId}>
          {loading ? 'Reloading...' : 'Reload Product'}
        </Button>
      </form>
    </div>
  );
}

export default ReloadProductForm;
