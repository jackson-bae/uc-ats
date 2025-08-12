#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function makeAdmin(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.log('💡 Make sure the user has registered first.');
      return;
    }

    // Check if user is already admin
    if (user.role === 'ADMIN') {
      console.log(`✅ User ${user.fullName} (${email}) is already an admin.`);
      return;
    }

    // Update user role to admin
    const updatedUser = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { role: 'ADMIN' }
    });

    console.log(`✅ Success! ${updatedUser.fullName} (${email}) is now an admin.`);
    console.log(`📝 User details:
      - Name: ${updatedUser.fullName}
      - Email: ${updatedUser.email}
      - Role: ${updatedUser.role}
      - Created: ${updatedUser.createdAt.toLocaleDateString()}
    `);

  } catch (error) {
    console.error('❌ Error updating user role:', error);
    if (error.code === 'P2002') {
      console.error('💡 This might be a duplicate email issue.');
    }
  }
}

async function listAdmins() {
  try {
    console.log('🔍 Fetching all admin users...\n');
    
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (admins.length === 0) {
      console.log('❌ No admin users found.');
      return;
    }

    console.log(`✅ Found ${admins.length} admin user(s):\n`);
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.fullName}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Created: ${admin.createdAt.toLocaleDateString()}`);
      console.log(`   ID: ${admin.id}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error fetching admin users:', error);
  }
}

async function removeAdmin(email) {
  try {
    console.log(`🔍 Looking for admin user with email: ${email}`);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      return;
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      console.log(`ℹ️  User ${user.fullName} (${email}) is not an admin.`);
      return;
    }

    // Update user role to regular user
    const updatedUser = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { role: 'USER' }
    });

    console.log(`✅ Success! ${updatedUser.fullName} (${email}) is no longer an admin.`);

  } catch (error) {
    console.error('❌ Error updating user role:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const email = args[1];

  console.log('🚀 UC ATS Admin Management Script\n');

  if (command === 'make' && email) {
    await makeAdmin(email);
  } else if (command === 'list') {
    await listAdmins();
  } else if (command === 'remove' && email) {
    await removeAdmin(email);
  } else {
    console.log('📋 Usage:');
    console.log('  node scripts/make-admin.js make <email>     - Make a user admin');
    console.log('  node scripts/make-admin.js remove <email>   - Remove admin privileges');
    console.log('  node scripts/make-admin.js list            - List all admin users');
    console.log('\n💡 Examples:');
    console.log('  node scripts/make-admin.js make john@example.com');
    console.log('  node scripts/make-admin.js remove john@example.com');
    console.log('  node scripts/make-admin.js list');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 