'use client';

import { useState } from 'react';
import { Minus, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { ApiException } from '@/utils/exceptions/ApiException';
import Input from './ui/Input';
import Button from './ui/Button';
import FormError from './ui/FormError';

function WithdrawProductForm() {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleWithdraw(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await api.products.withdraw({ name: name.trim(), quantity: Number(quantity) });
      setSuccess(`${response.data.name}: ${response.data.quantity} remaining in stock.`);
      setName('');
      setQuantity('');
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleWithdraw} className="space-y-4">
      <Input
        icon={Package}
        type="text"
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        minLength={2}
        maxLength={100}
        required
        disabled={loading}
      />

      <Input
        icon={Minus}
        type="number"
        placeholder="Quantity to withdraw"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        min={1}
        max={999999}
        step={1}
        required
        disabled={loading}
      />

      {error && <FormError message={error} />}
      {success && <p role="status" className="text-sm text-green-400">{success}</p>}

      <Button type="submit" fullWidth isLoading={loading}>
        {loading ? 'Withdrawing...' : 'Withdraw Product'}
      </Button>
    </form>
  );
}

export default WithdrawProductForm;