/**
 * Migration Script: Import existing users from PostgreSQL to Firebase Auth
 *
 * This script imports bcrypt password hashes directly into Firebase Auth,
 * so existing users can log in with their current passwords.
 *
 * Prerequisites:
 * - Firebase project created with Authentication enabled
 * - Firebase Admin credentials configured in .env
 * - PostgreSQL running with existing user data
 *
 * Usage:
 *   npx tsx scripts/migrate-to-firebase.ts
 *   npx tsx scripts/migrate-to-firebase.ts --dry-run
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminAuth = getAuth();
const prisma = new PrismaClient();

interface MigrationResult {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

async function migrateUsers(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Fetch all active users without Firebase UID
  const users = await prisma.user.findMany({
    where: {
      sttsCd: 'ACTIVE',
      delYn: 'N',
      firebaseUid: null,
    },
    select: {
      id: true,
      email: true,
      passwdHash: true,
      displayName: true,
    },
  });

  result.total = users.length;
  process.stdout.write(`Found ${users.length} users to migrate${isDryRun ? ' (DRY RUN)' : ''}`);

  if (users.length === 0) {
    process.stdout.write('No users to migrate.\n');
    return result;
  }

  // Process in batches of 100 (Firebase importUsers limit is 1000)
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(users.length / batchSize);
    process.stdout.write(`\nProcessing batch ${batchNum}/${totalBatches}...\n`);

    // Filter users with password hashes
    const usersWithHash = batch.filter((u) => u.passwdHash);
    const usersWithoutHash = batch.filter((u) => !u.passwdHash);

    for (const user of usersWithoutHash) {
      process.stdout.write(`  SKIP: ${user.email} — no password hash\n`);
      result.skipped++;
    }

    if (isDryRun) {
      for (const user of usersWithHash) {
        process.stdout.write(`  DRY: ${user.email} — would import to Firebase\n`);
        result.success++;
      }
      continue;
    }

    if (usersWithHash.length === 0) continue;

    try {
      // Batch import to Firebase (up to 1000 users per call)
      const importResult = await adminAuth.importUsers(
        usersWithHash.map((u) => ({
          uid: u.id,
          email: u.email,
          displayName: u.displayName ?? undefined,
          passwordHash: Buffer.from(u.passwdHash!),
        })),
        { hash: { algorithm: 'BCRYPT' } },
      );

      // Process results
      const failedUids = new Set(
        importResult.errors.map((e) => {
          const email = usersWithHash[e.index]?.email ?? 'unknown';
          const message = e.error?.message ?? 'Unknown import error';
          process.stderr.write(`  FAIL: ${email} — ${message}\n`);
          result.failed++;
          result.errors.push({ email, error: message });
          return usersWithHash[e.index]?.id;
        }),
      );

      // Update DB for successfully imported users
      const successUsers = usersWithHash.filter((u) => !failedUids.has(u.id));
      for (const user of successUsers) {
        await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: user.id },
        });
        process.stdout.write(`  OK: ${user.email}\n`);
        result.success++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      process.stderr.write(`  BATCH FAIL: ${message}\n`);
      for (const user of usersWithHash) {
        result.failed++;
        result.errors.push({ email: user.email, error: message });
      }
    }
  }

  return result;
}

async function main() {
  process.stdout.write('=== Firebase Auth Migration Script ===\n');

  if (isDryRun) {
    process.stdout.write('*** DRY RUN MODE — no changes will be made ***\n');
  }

  try {
    const result = await migrateUsers();

    process.stdout.write('\n=== Migration Complete ===\n');
    process.stdout.write(`Total:   ${result.total}\n`);
    process.stdout.write(`Success: ${result.success}\n`);
    process.stdout.write(`Skipped: ${result.skipped}\n`);
    process.stdout.write(`Failed:  ${result.failed}\n`);

    if (result.errors.length > 0) {
      process.stdout.write('\nErrors:\n');
      for (const err of result.errors) {
        process.stdout.write(`  - ${err.email}: ${err.error}\n`);
      }
    }
  } catch (error) {
    process.stderr.write(`Migration failed: ${error}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
