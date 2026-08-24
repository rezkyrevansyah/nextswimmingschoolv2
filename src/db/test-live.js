const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const databaseUrl = match ? match[1].trim() : '';

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { pgTable, serial, text, timestamp } = require('drizzle-orm/pg-core');

const drizzleTestNotes = pgTable('drizzle_test_notes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
});

const client = postgres(databaseUrl, { prepare: false });
const db = drizzle(client, { schema: { drizzleTestNotes } });

async function runTest() {
  console.log('=== STARTING DRIZZLE ORM LIVE TEST ===');
  
  // 1. Eksekusi DDL Penambahan Tabel Baru ke Supabase Cloud
  console.log('\n1. Membuat tabel baru "drizzle_test_notes" di Supabase Cloud...');
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS drizzle_test_notes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ TABEL BERHASIL DIBUAT DI SUPABASE CLOUD!');

  // 2. Insert Data Baru Menggunakan Drizzle ORM API
  console.log('\n2. Memasukkan data baru menggunakan Drizzle ORM (db.insert)...');
  const inserted = await db.insert(drizzleTestNotes).values({
    title: 'Tes Penambahan Tabel & Data via Drizzle ORM',
    content: 'Tabel dibuat dan diisi secara otomatis dari terminal CLI!'
  }).returning();
  console.log('✅ DATA BERHASIL DIMASUKKAN KE SUPABASE!');
  console.log('Record Terbuat:', inserted[0]);

  // 3. Query (SELECT) Data Menggunakan Drizzle ORM API
  console.log('\n3. Membaca data menggunakan Drizzle ORM (db.select)...');
  const allNotes = await db.select().from(drizzleTestNotes);
  console.log(`✅ TOTAL RECORD DI TABEL "drizzle_test_notes": ${allNotes.length}`);
  console.log('Semua Record:', JSON.stringify(allNotes, null, 2));

  await client.end();
  console.log('\n=== TEST FINISHED WITH 100% SUCCESS ===');
  process.exit(0);
}

runTest().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
