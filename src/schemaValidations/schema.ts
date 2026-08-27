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

export const forgotPasswordSchema=z.object({
  email:z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email format" })
    .max(255, { message: "Email is too long" })
})
export const resetPasswordSchema=z.object({
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
export const createSupplierSchema=z.object({
  name:  z
        .string()
        .trim()
        .min(1, { message: "Supplier name is required" })
        .min(2, { message: "Supplier name must be at least 2 characters" })
        .max(100, { message: "Supplier name is too long" }),
      product_type: z.enum(Object.values(ProductType) as [string, ...string[]]),
    })

/** Route param `[id]` — every supplier id is a uuid (`schema.prisma`: `@default(uuid())`). */
export const supplierIdSchema = z
  .string()
  .trim()
  .min(1, { message: "Supplier id is required" })
  .uuid({ message: "Supplier id must be a valid uuid" });

/**
 * Partial update: the manager may send any subset of the three editable fields,
 * but sending none of them is a bad request rather than a silent no-op.
 */
export const updateSupplierSchema = z
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
  export const addProductSchema=z.object({
  name:z.string()
      .trim()
      .min(2, { message: "product name must be at least 2 characters" })
      .max(100, { message: "product name is too long" }),
    supplier_name:z.string()
      .trim()
      .min(2, { message: "supplier name must be at least 2 characters" })
      .max(100, { message: "supplier name is too long" }),
      category:z.enum(Object.values(ProductType) as [string, ...string[]]),
      
quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0")
    .min(1, "Quantity must be at least 1")
    .max(999999, "Quantity is too large"),

price: z
    .number()
    .positive("Price must be greater than 0")
    .min(0.01, "Price must be at least 0.01")
    .max(999999.99, "Price is too high"),
  expiry_date: z
    .string()
    .refine(
        (val) => {
            // Check if it's a valid date string
            const date = new Date(val);
            return !isNaN(date.getTime());
        },
        { message: "Invalid date format. Use YYYY-MM-DD or ISO format" }
    )
    .transform((str) => new Date(str))
    .refine(
        (date) => date > new Date(),
        { message: "Expiry date must be in the future" }
    )
    .optional(),

  });
