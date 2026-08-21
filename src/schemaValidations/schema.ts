import { ProductType } from "@/app/generated/prisma/enums";
import z from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email format" })
    .max(255, { message: "Email is too long" }),
  password: z
    .string()
    .trim()
    .min(1, { message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" })
    .max(100, { message: "Password is too long" }),
});

export const ForgotPassSchema=z.object({
  email:z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email format" })
    .max(255, { message: "Email is too long" })
})
export const ResetPassSchema=z.object({
    email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email format" })
    .max(255, { message: "Email is too long" }),
  password: z
    .string()
    .trim()
    .min(1, { message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" })
    .max(100, { message: "Password is too long" }),
    token:z.
    string()
})
export const CreatSupplierSchema=z.object({
  name:  z
        .string()
        .trim()
        .min(1, { message: "Supplier name is required" })
        .min(2, { message: "Supplier name must be at least 2 characters" })
        .max(100, { message: "Supplier name is too long" }),
      product_type: z.enum(Object.values(ProductType) as [string, ...string[]]),  
    })
    