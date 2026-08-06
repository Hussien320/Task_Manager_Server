import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { Role, ProductType, TransactionType } from "@/app/generated/prisma/enums";
import bcrypt from "bcrypt";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL || "",
  }),
});

const hashValue = (value: string | null) => (value ? bcrypt.hashSync(value, 10) : null);
const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

async function main() {
  await prisma.inventoryLog.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      username: "hussien",
      email: "husssienzoughaib@gmail.com",
      pass_hash: hashPassword("123456"),
      role: Role.ADMIN,
      is_verified: true,
      last_login: new Date("2026-08-01T09:15:00.000Z"),
      refresh_token: hashValue("refresh-admin-token"),
      refresh_token_expires_at: new Date("2026-08-10T09:15:00.000Z"),
      reset_password_token: null,
      reset_password_expires_at: null,
    },
  });

  const manager = await prisma.user.create({
    data: {
      username: "maria",
      email: "maria@inventory.local",
      pass_hash: hashPassword("123456"),
      role: Role.EMPLOYEE,
      is_verified: true,
      last_login: new Date("2026-08-02T08:00:00.000Z"),
      refresh_token: hashValue("refresh-manager-token"),
      refresh_token_expires_at: new Date("2026-08-11T08:00:00.000Z"),
    },
  });

  const employee = await prisma.user.create({
    data: {
      username: "employee",
      email: "employee@gmail.com",
      pass_hash: hashPassword("123456"),
      role: Role.EMPLOYEE,
      is_verified: false,
      last_login: null,
      refresh_token: null,
      refresh_token_expires_at: null,
    },
  });

  const warehouseClerk = await prisma.user.create({
    data: {
      username: "ahmed",
      email: "ahmed@inventory.local",
      pass_hash: hashPassword("123456"),
      role: Role.EMPLOYEE,
      is_verified: true,
      last_login: new Date("2026-08-03T14:45:00.000Z"),
      refresh_token: hashValue("refresh-clerk-token"),
      refresh_token_expires_at: new Date("2026-08-12T14:45:00.000Z"),
      reset_password_token: hashValue("reset-token-for-ahmed"),
      reset_password_expires_at: new Date("2026-08-04T14:45:00.000Z"),
    },
  });

  const plasticSupplier = await prisma.supplier.create({
    data: {
      name: "GreenPack Plastics",
      product_type: ProductType.PLASTIC,
      is_active: true,
    },
  });

  const vegetablesSupplier = await prisma.supplier.create({
    data: {
      name: "Organic Harvest Hub",
      product_type: ProductType.VEGETABLES,
      is_active: true,
    },
  });

  const cleaningSupplier = await prisma.supplier.create({
    data: {
      name: "PureClean Supplies",
      product_type: ProductType.CLEANING,
      is_active: false,
    },
  });

  const bucket = await prisma.product.create({
    data: {
      supplier_id: plasticSupplier.id,
      name: "HDPE Storage Bucket",
      type: ProductType.PLASTIC,
      quantity: 120,
      price: 6.75,
      expiry_date: null,
      low_stock_threshold: 10,
    },
  });

  const crate = await prisma.product.create({
    data: {
      supplier_id: plasticSupplier.id,
      name: "Plastic Produce Crate",
      type: ProductType.PLASTIC,
      quantity: 15,
      price: 8.25,
      expiry_date: null,
      low_stock_threshold: 10,
    },
  });

  const tomatoBoxes = await prisma.product.create({
    data: {
      supplier_id: vegetablesSupplier.id,
      name: "Tomato Boxes",
      type: ProductType.VEGETABLES,
      quantity: 40,
      price: 2.5,
      expiry_date: new Date("2026-08-12T00:00:00.000Z"),
      low_stock_threshold: 20,
    },
  });

  const lettuceBatch = await prisma.product.create({
    data: {
      supplier_id: vegetablesSupplier.id,
      name: "Lettuce Batch",
      type: ProductType.VEGETABLES,
      quantity: 6,
      price: 1.8,
      expiry_date: new Date("2026-08-07T00:00:00.000Z"),
      low_stock_threshold: 5,
    },
  });

  const glassCleaner = await prisma.product.create({
    data: {
      supplier_id: cleaningSupplier.id,
      name: "Glass Cleaner 500ml",
      type: ProductType.CLEANING,
      quantity: 30,
      price: 4.9,
      expiry_date: new Date("2027-01-10T00:00:00.000Z"),
      low_stock_threshold: 10,
    },
  });

  await prisma.inventoryLog.create({
    data: {
      user_id: admin.id,
      product_id: bucket.id,
      transaction_type: TransactionType.ADDITION,
      quantity_changed: 100,
      unit_price_at_time: 6.75,
      logged_at: new Date("2026-08-01T10:30:00.000Z"),
    },
  });

  await prisma.inventoryLog.create({
    data: {
      user_id: manager.id,
      product_id: crate.id,
      transaction_type: TransactionType.REMOVAL,
      quantity_changed: 5,
      unit_price_at_time: 8.25,
      logged_at: new Date("2026-08-02T11:00:00.000Z"),
    },
  });

  await prisma.inventoryLog.create({
    data: {
      user_id: employee.id,
      product_id: tomatoBoxes.id,
      transaction_type: TransactionType.ADDITION,
      quantity_changed: 20,
      unit_price_at_time: 2.5,
      logged_at: new Date("2026-08-02T13:45:00.000Z"),
    },
  });

  await prisma.inventoryLog.create({
    data: {
      user_id: warehouseClerk.id,
      product_id: lettuceBatch.id,
      transaction_type: TransactionType.REMOVAL,
      quantity_changed: 2,
      unit_price_at_time: 1.8,
      logged_at: new Date("2026-08-03T09:50:00.000Z"),
    },
  });

  await prisma.inventoryLog.create({
    data: {
      user_id: admin.id,
      product_id: glassCleaner.id,
      transaction_type: TransactionType.ADDITION,
      quantity_changed: 15,
      unit_price_at_time: 4.9,
      logged_at: new Date("2026-08-03T15:10:00.000Z"),
    },
  });

  await prisma.appSetting.upsert({
    where: { setting_key: "inventory_low_stock_threshold" },
    update: {
      setting_value: "10",
      updated_by: admin.id,
      updated_at: new Date("2026-08-01T12:00:00.000Z"),
    },
    create: {
      updated_by: admin.id,
      setting_key: "inventory_low_stock_threshold",
      setting_value: "10",
      updated_at: new Date("2026-08-01T12:00:00.000Z"),
    },
  });

  await prisma.appSetting.create({
    data: {
      updated_by: manager.id,
      setting_key: "auto_reorder_enabled",
      setting_value: "true",
      updated_at: new Date("2026-08-02T12:00:00.000Z"),
    },
  });

  await prisma.appSetting.create({
    data: {
      updated_by: null,
      setting_key: "default_currency",
      setting_value: "USD",
      updated_at: new Date("2026-08-03T12:00:00.000Z"),
    },
  });
}

main()
  .then(async () => {
    console.log("seeded successfully");
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });