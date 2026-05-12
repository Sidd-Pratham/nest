/**
 * seed.ts — Seeds an initial SUPER_ADMIN account if none exists.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/seeder/seed.ts
 *
 * Reads environment from .env (MONGO_URI, SEED_ADMIN_*)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/ems_db';

const AdminSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN'] },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

async function seed() {
  console.log('🌱  Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);

  const AdminModel = mongoose.model('Admin', AdminSchema);

  const email = (process.env.SEED_ADMIN_EMAIL ?? 'superadmin@ems.com').toLowerCase();
  const name = process.env.SEED_ADMIN_NAME ?? 'Super Admin';
  const rawPassword = process.env.SEED_ADMIN_PASSWORD ?? 'SuperAdmin@123';

  const existing = await AdminModel.findOne({ email, isDeleted: false });
  if (existing) {
    console.log(`✅  Super Admin already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 12);

  await AdminModel.create({
    name,
    email,
    password: hashedPassword,
    role: 'SUPER_ADMIN',
    isDeleted: false,
  });

  console.log(`✅  Super Admin seeded successfully!`);
  console.log(`    Email   : ${email}`);
  console.log(`    Password: ${rawPassword}`);
  console.log(`\n⚠️   Please change the default password after first login.\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seeding failed:', err.message);
  process.exit(1);
});
