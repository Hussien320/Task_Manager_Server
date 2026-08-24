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

/** Route param `[id]` — every supplier id is a uuid (`schema.prisma`: `@default(uuid())`). */
export const SupplierIdSchema = z
  .string()
  .trim()
  .min(1, { message: "Supplier id is required" })
  .uuid({ message: "Supplier id must be a valid uuid" });

/**
 * Partial update: the manager may send any subset of the three editable fields,
 * but sending none of them is a bad request rather than a silent no-op.
 */
export const UpdateSupplierSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "Supplier name must be at least 2 characters" })
      .max(100, { message: "Supplier name is too long" })
      .optional(),
    product_type: z
      .enum(Object.values(ProductType) as [string, ...string[]])
      .optional(),
    is_active: z.boolean({ message: "is_active must be a boolean" }).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.product_type !== undefined ||
      data.is_active !== undefined,
    {
      message:
        "At least one of name, product_type or is_active must be provided",
    }
  );
