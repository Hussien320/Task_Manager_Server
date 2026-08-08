import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { UserRole } from "@/app/generated/prisma/enums";
import bcrypt from "bcrypt";
const prisma=new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});
async function main() {
    await prisma.user.deleteMany();
    await prisma.user.create({
        data:{
             username  :"ali",
             email: "ali@example.com",
             pass_hash:await bcrypt.hash("password", 10),
             role:UserRole.ADMIN,


        }
    })};
    main().then(async () => {
        console.log("Seed data created successfully.");
    }).catch(async (e) => {
        console.error("Error seeding data:", e);
    }).finally(async () => {
        await prisma.$disconnect();
    });