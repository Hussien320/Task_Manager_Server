'use client'
import { api } from "@/lib/api"
import { ApiException } from "@/utils/exceptions/ApiException"
import { useRouter } from "next/navigation"
import {  useEffect, useState } from "react"
import Input from "./ui/Input"
import { Mail ,Lock} from "lucide-react"
import Button from "./ui/Button"
import FormError from "./ui/FormError"
import { LoginResponse } from "@/types/User"

function LoginForm(){
 //step1 define the usestates
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [error,setError]=useState<string |null>(null)
 const[loading,setLoading]=useState(false)

  const router = useRouter();
 async function handelLogin(e:React.SyntheticEvent<HTMLFormElement>){
    e.preventDefault()
      setError(null);
  
    if(!email || !password){
        setError('email and password are required');
        return
    }
      setLoading(true);
    try{
        const response=await api.auth.login({email:email,password:password});
        if(response.data.role==='ADMIN'){
            router.push('/dashboard')
        }
        else{

            
        router.push('/products')
        }
    


    }
    catch(err){
        if (err instanceof ApiException){
            setError(err.message)
        }
        else{
            setError('something went wrong')
        }

    }
    finally{
        setLoading(false)
    }

 }

    return(
        <form onSubmit={handelLogin} className="space-y-4">
            <Input
            icon={Mail}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            disabled={loading}
            
            />
            <Input 

            icon={Lock}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            disabled={loading}
            togglePassword
            />
             {error && <FormError message={error} />}

      <Button type="submit" fullWidth isLoading={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </Button>

        </form>
    )
}
export default LoginForm