// prisma/seed.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { ProductType, TransactionType, UserRole } from "@/app/generated/prisma/enums";
import bcrypt from "bcrypt";

// ✅ Define thresholds once as constants (single source of truth)
const THRESHOLDS = {
  VEGTABLE: 10,
  PLASTIC: 20,
  CLEANING: 5,
  EXPIRY_WARNING_DAYS: 7,
};

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

  // ✅ Create AppSettings FIRST (using constants)
  await prisma.appSetting.createMany({
    data: [
      {
        updated_by: adminUser.id,
        setting_key: "threshold_PLASTIC",
        setting_value: String(THRESHOLDS.PLASTIC),
      },
      {
        updated_by: adminUser.id,
        setting_key: "threshold_CLEANING",
        setting_value: String(THRESHOLDS.CLEANING),
      },
      {
        updated_by: adminUser.id,
        setting_key: "threshold_VEGTABLE",
        setting_value: String(THRESHOLDS.VEGTABLE),
      },
      {
        updated_by: adminUser.id,
        setting_key: "expiry_warning_days",
        setting_value: String(THRESHOLDS.EXPIRY_WARNING_DAYS),
      },
    ],
  });

  // ✅ Create products using the same constants
  const products = await prisma.$transaction([
    // VEGTABLE products
    prisma.product.create({
      data: {
        supplier_id: supplierOne.id,
        name: "Tomatoes",
        category: ProductType.VEGTABLE,
        quantity: 24,
        price: 3.5,
        expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        low_stock_threshold: THRESHOLDS.VEGTABLE,
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
        low_stock_threshold: THRESHOLDS.VEGTABLE,
      },
    }),
    // PLASTIC products
    prisma.product.create({
      data: {
        supplier_id: supplierTwo.id,
        name: "Plastic Bottles",
        category: ProductType.PLASTIC,
        quantity: 15,
        price: 6.75,
        low_stock_threshold: THRESHOLDS.PLASTIC,
      },
    }),
    prisma.product.create({
      data: {
        supplier_id: supplierTwo.id,
        name: "Plastic Bags",
        category: ProductType.PLASTIC,
        quantity: 30,
        price: 2.5,
        low_stock_threshold: THRESHOLDS.PLASTIC,
      },
    }),
    // CLEANING products
    prisma.product.create({
      data: {
        supplier_id: supplierThree.id,
        name: "Disinfectant Spray",
        category: ProductType.CLEANING,
        quantity: 6,
        price: 9.9,
        low_stock_threshold: THRESHOLDS.CLEANING,
      },
    }),
    prisma.product.create({
      data: {
        supplier_id: supplierThree.id,
        name: "Glass Cleaner",
        category: ProductType.CLEANING,
        quantity: 3,
        price: 7.5,
        low_stock_threshold: THRESHOLDS.CLEANING,
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

  console.log("✅ Seed data created successfully!");
  console.log("📊 Summary:");
  console.log(`   - ${products.length} products created`);
  console.log(`   - 2 users created (ADMIN + EMPLOYEE)`);
  console.log(`   - 3 suppliers created`);
  console.log(`   - 4 app settings created`);
  console.log(`📋 Thresholds:`, THRESHOLDS);
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