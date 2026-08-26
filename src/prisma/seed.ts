// prisma/seed.ts
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
  // Clean existing data
  await prisma.inventoryLog.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminPassword = await bcrypt.hash("password123", 10);
  const employeePassword = await bcrypt.hash("password123", 10);

  const adminUser = await prisma.user.create({
    data: {
      username: "hussien",
      email: "husssienzoughaib@gmail.com",
      pass_hash: adminPassword,
      role: UserRole.ADMIN,
      is_verified: false,
      last_login: new Date()
    }
  });

  const employeeUser = await prisma.user.create({
    data: {
      username: "sara",
      email: "sara@example.com",
      pass_hash: employeePassword,
      role: UserRole.EMPLOYEE,
      is_verified: false,
      last_login: new Date(),
    },
  });

  // Create suppliers
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

  // Create products with thresholds
  const products = await prisma.$transaction([
    // ✅ VEGTABLE products (threshold: 10)
    prisma.product.create({
      data: {
        supplier_id: supplierOne.id,
        name: "Tomatoes",
        category: ProductType.VEGTABLE,
        quantity: 24,
        price: 3.5,
        expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        low_stock_threshold: 10, // ← Default for VEGTABLE
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
        low_stock_threshold: 10, // ← Default for VEGTABLE
      },
    }),
    // ✅ PLASTIC products (threshold: 20)
    prisma.product.create({
      data: {
        supplier_id: supplierTwo.id,
        name: "Plastic Bottles",
        category: ProductType.PLASTIC,
        quantity: 15,
        price: 6.75,
        low_stock_threshold: 20, // ← Default for PLASTIC
      },
    }),
    prisma.product.create({
      data: {
        supplier_id: supplierTwo.id,
        name: "Plastic Bags",
        category: ProductType.PLASTIC,
        quantity: 30,
        price: 2.5,
        low_stock_threshold: 20, // ← Default for PLASTIC
      },
    }),
    // ✅ CLEANING products (threshold: 5)
    prisma.product.create({
      data: {
        supplier_id: supplierThree.id,
        name: "Disinfectant Spray",
        category: ProductType.CLEANING,
        quantity: 6,
        price: 9.9,
        low_stock_threshold: 5, // ← Default for CLEANING
      },
    }),
    prisma.product.create({
      data: {
        supplier_id: supplierThree.id,
        name: "Glass Cleaner",
        category: ProductType.CLEANING,
        quantity: 3,
        price: 7.5,
        low_stock_threshold: 5, // ← Default for CLEANING
      },
    }),
  ]);

  // Create inventory logs
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
        product_id: products[4].id,
        transaction_type: TransactionType.ADDITION,
        quantity_changed: 4,
        unit_price_at_time: 9.9,
      },
    ],
  });

  // ✅ Create AppSettings for thresholds
  await prisma.appSetting.createMany({
    data: [
      {
        updated_by: adminUser.id,
        setting_key: "threshold_PLASTIC",
        setting_value: "20",
      },
      {
        updated_by: adminUser.id,
        setting_key: "threshold_CLEANING",
        setting_value: "5",
      },
      {
        updated_by: adminUser.id,
        setting_key: "threshold_VEGTABLE",
        setting_value: "10",
      },
      {
        updated_by: adminUser.id,
        setting_key: "expiry_warning_days",
        setting_value: "7",
      },
    ],
  });

  console.log("✅ Seed data created successfully!");
  console.log("📊 Summary:");
  console.log(`   - ${products.length} products created`);
  console.log(`   - 2 users created (ADMIN + EMPLOYEE)`);
  console.log(`   - 3 suppliers created`);
  console.log(`   - 4 app settings created`);
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