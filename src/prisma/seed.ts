import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { ProductType, TransactionType, UserRole } from "@/app/generated/prisma/enums";
import bcrypt from "bcrypt";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  await prisma.inventoryLog.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash("password123", 10);
  const employeePassword = await bcrypt.hash("password123", 10);
  const adminRefreshToken = await bcrypt.hash("admin-refresh-token", 10);
  const employeeRefreshToken = await bcrypt.hash("employee-refresh-token", 10);

  const adminUser = await prisma.user.create({
    data: {
      username: "ali",
      email: "ali@example.com",
      pass_hash: adminPassword,
      role: UserRole.ADMIN,
      is_verified: true,
      last_login: new Date(),
      refresh_token: adminRefreshToken,
      refresh_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      username: "sara",
      email: "sara@example.com",
      pass_hash: employeePassword,
      role: UserRole.EMPLOYEE,
      is_verified: true,
      last_login: new Date(),
      refresh_token: employeeRefreshToken,
      refresh_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const supplierOne = await prisma.supplier.create({
    data: {
      name: "Fresh Farm Co.",
      product_type: ProductType.VEGTABLE,
      is_active: true,
    },
  });

  const supplierTwo = await prisma.supplier.create({
    data: {
      name: "Plastic Hub",
      product_type: ProductType.PLASTIC,
      is_active: true,
    },
  });

  const supplierThree = await prisma.supplier.create({
    data: {
      name: "CleanPro Supplies",
      product_type: ProductType.CLEANING,
      is_active: true,
    },
  });

  const products = await prisma.$transaction([
    prisma.product.create({
      data: {
        supplier_id: supplierOne.id,
        name: "Tomatoes",
        category: ProductType.VEGTABLE,
        quantity: 24,
        price: 3.5,
        expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        low_stock_threshold: 5,
      },
    }),
    prisma.product.create({
      data: {
        supplier_id: supplierOne.id,
        name: "Carrots",
        category: ProductType.VEGTABLE,
        quantity: 8,
        price: 2.2,
        expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        low_stock_threshold: 3,
      },
    }),
    prisma.product.create({
      data: {
        supplier_id: supplierTwo.id,
        name: "Plastic Bottles",
        category: ProductType.PLASTIC,
        quantity: 15,
        price: 6.75,
        low_stock_threshold: 4,
      },
    }),
    prisma.product.create({
      data: {
        supplier_id: supplierThree.id,
        name: "Disinfectant Spray",
        category: ProductType.CLEANING,
        quantity: 6,
        price: 9.9,
        low_stock_threshold: 2,
      },
    }),
  ]);

  await prisma.inventoryLog.createMany({
    data: [
      {
        user_id: adminUser.id,
        product_id: products[0].id,
        transaction_type: TransactionType.ADDITION,
        quantity_changed: 10,
        unit_price_at_time: 3.5,
      },
      {
        user_id: employeeUser.id,
        product_id: products[2].id,
        transaction_type: TransactionType.WITHDRAWAL,
        quantity_changed: 3,
        unit_price_at_time: 6.75,
      },
      {
        user_id: adminUser.id,
        product_id: products[3].id,
        transaction_type: TransactionType.ADDITION,
        quantity_changed: 4,
        unit_price_at_time: 9.9,
      },
    ],
  });

  await prisma.appSetting.createMany({
    data: [
      {
        updated_by: adminUser.id,
        setting_key: "low_stock_threshold_test",
        setting_value: "5",
      },
      {
        updated_by: adminUser.id,
        setting_key: "expiry_date",
        setting_value: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  });
}

main()
  .then(async () => {
    console.log("Seed data created successfully.");
  })
  .catch(async (e) => {
    console.error("Error seeding data:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });