import { useState } from 'react';
import FormError from './ui/FormError';
import { ProductType } from '@/app/generated/prisma/enums';
import { api } from '@/lib/api';
import { ApiException } from '@/utils/exceptions/ApiException';
import Input from './ui/Input';
;
import { Tag, Truck } from 'lucide-react';

import Button from './ui/Button';
function SupplierForm({ onCreated }: { onCreated?: () => void }){
    const [name,setName]=useState('')
    const[  product_type,setProduct_type]=useState<ProductType>(ProductType.PLASTIC);
     const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function handelCreateSupplier(e: React.SyntheticEvent<HTMLFormElement>){
    e.preventDefault()
      setError(null);
    setSuccess(null);

    if(!name || !product_type){
          setError('All fields are required');
      return;

    }
     setLoading(true);
     try{
        const response=await api.suppliers.add({
            name,
            product_type
        });
           setSuccess(`${response.data.name} added successfully.`);
           setName('');
           setProduct_type(ProductType.PLASTIC)
           onCreated?.();
           

     }
     catch(err){
         if (err instanceof ApiException) {
                setError(err.message);
              } else {
                setError('An unexpected error occurred');
              }

     }
     finally{
        setLoading(false);
     }

  }
    return(
 <form onSubmit={handelCreateSupplier} className="space-y-4">
      {/* Name */}
      <Input
        icon={Truck}
        type="text"
        placeholder="Supplier name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />

     

      {/* Category (dropdown) */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Tag className="size-5 text-gray-500" />
        </div>
        <select
          value={product_type}
          onChange={(e) => setProduct_type(e.target.value as ProductType)}
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

    
      
    
      
      {/* Error */}
      {error && <FormError message={error} />}
      {success && <p role="status" className="text-sm text-green-400">{success}</p>}

      {/* Submit */}
      <Button type="submit" fullWidth isLoading={loading}>
        {loading ? 'Creating...' : 'Create Supplier'}
      </Button>
    </form>
    )
}
export default SupplierForm