const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const databaseUrl = match ? match[1].trim() : '';

const postgres = require('postgres');
const client = postgres(databaseUrl, { prepare: false });

async function runMigration() {
  console.log('=== STARTING DATABASE MIGRATION: PRIVATE EXTERNAL LOCATION ===');
  
  try {
    // 1. Drop NOT NULL constraint on classes.branch_id & members.branch_id
    console.log('1. Dropping NOT NULL on classes.branch_id & members.branch_id...');
    await client.unsafe(`
      ALTER TABLE public.classes ALTER COLUMN branch_id DROP NOT NULL;
      ALTER TABLE public.members ALTER COLUMN branch_id DROP NOT NULL;
    `);
    console.log('✅ Branch constraints updated successfully.');

    // 2. Add location metadata columns to classes
    console.log('2. Adding location columns to public.classes...');
    await client.unsafe(`
      ALTER TABLE public.classes 
        ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'branch' CHECK (location_type IN ('branch', 'external')),
        ADD COLUMN IF NOT EXISTS external_location_name text,
        ADD COLUMN IF NOT EXISTS external_location_address text,
        ADD COLUMN IF NOT EXISTS google_maps_url text;
    `);
    console.log('✅ Columns added to public.classes.');

    // 3. Add location metadata columns to registrations
    console.log('3. Adding location columns to public.registrations...');
    await client.unsafe(`
      ALTER TABLE public.registrations 
        ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'branch',
        ADD COLUMN IF NOT EXISTS external_location_name text,
        ADD COLUMN IF NOT EXISTS external_location_address text,
        ADD COLUMN IF NOT EXISTS google_maps_url text;
    `);
    console.log('✅ Columns added to public.registrations.');

    // 4. Backfill existing classes
    console.log('4. Backfilling existing classes...');
    await client.unsafe(`
      UPDATE public.classes SET location_type = 'branch' WHERE location_type IS NULL;
    `);
    console.log('✅ Backfill complete.');

    console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ MIGRATION FAILED:', err);
    await client.end();
    process.exit(1);
  }
}

runMigration();
