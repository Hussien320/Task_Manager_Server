'use client'

import { api } from "@/lib/api"
import { ApiException } from "@/utils/exceptions/ApiException"
import { useState } from "react"
import Input from "./ui/Input"
import { Mail } from "lucide-react"
import FormError from "./ui/FormError"
import Button from "./ui/Button"

function ForgetPass(){
    const [email,setEmail]=useState('')
    const [loading,setLoading]=useState(false)
    const [error,setError]=useState<string|null>(null)
    const [submitted,setSubmitted]=useState(false)
     async function handelforget(e:React.SyntheticEvent<HTMLFormElement>){
        e.preventDefault();
        setError(null);
        if(!email){
            setError('Email is required');
            return
        }
        setLoading(true)
        try{
            await api.auth.forgetpass(email)
            setSubmitted(true)

        }
        catch(error){
             if (error instanceof ApiException){
                        setError(error.message)
                    }
                    else{
                        setError('Something went wrong')
                    }
        }
        finally{
            setLoading(false)
        }
     }

    if (submitted) {
        return (
            <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                If an account exists for that email, a password reset code has been sent.
            </p>
        )
    }

    return(
          <form onSubmit={handelforget} className="space-y-4">
            <Input
             icon={Mail}
             type="email"
             placeholder="Email address"
             value={email}
             onChange={(e)=>setEmail(e.target.value)}
             disabled={loading}
            />
              {error && <FormError message={error} />}

      <Button type="submit" fullWidth isLoading={loading}>
                {loading ? 'Sending...' : 'Send reset code'}
      </Button>
          </form>

    )
}
export default ForgetPass