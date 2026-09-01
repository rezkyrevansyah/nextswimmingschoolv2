const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/DATABASE_URL=(.*)/);
const databaseUrl = match ? match[1].trim() : '';

const postgres = require('postgres');
const client = postgres(databaseUrl, { prepare: false });

async function runMigration() {
  console.log('=== STARTING DATABASE MIGRATION: ATTENDANCE UNIQUE CONSTRAINTS ===');

  try {
    console.log('1. Counting duplicate coach_attendances rows...');
    const coachDupes = await client.unsafe(`
      SELECT coach_id, class_id, session_date, COUNT(*) AS cnt
      FROM coach_attendances
      GROUP BY coach_id, class_id, session_date
      HAVING COUNT(*) > 1;
    `);
    console.log(`   Found ${coachDupes.length} duplicate group(s) in coach_attendances.`);

    console.log('2. Counting duplicate member_attendances rows...');
    const memberDupes = await client.unsafe(`
      SELECT class_id, member_id, session_date, COUNT(*) AS cnt
      FROM member_attendances
      GROUP BY class_id, member_id, session_date
      HAVING COUNT(*) > 1;
    `);
    console.log(`   Found ${memberDupes.length} duplicate group(s) in member_attendances.`);

    console.log('3. Deleting duplicate coach_attendances rows (keeping earliest id)...');
    const coachDeleted = await client.unsafe(`
      DELETE FROM coach_attendances a
      USING coach_attendances b
      WHERE a.coach_id = b.coach_id
        AND a.class_id = b.class_id
        AND a.session_date = b.session_date
        AND a.id > b.id
      RETURNING a.id;
    `);
    console.log(`✅ Deleted ${coachDeleted.length} duplicate coach_attendances row(s).`);

    console.log('4. Deleting duplicate member_attendances rows (keeping earliest id)...');
    const memberDeleted = await client.unsafe(`
      DELETE FROM member_attendances a
      USING member_attendances b
      WHERE a.class_id = b.class_id
        AND a.member_id = b.member_id
        AND a.session_date = b.session_date
        AND a.id > b.id
      RETURNING a.id;
    `);
    console.log(`✅ Deleted ${memberDeleted.length} duplicate member_attendances row(s).`);

    console.log('5. Adding unique constraint on coach_attendances(coach_id, class_id, session_date)...');
    await client.unsafe(`
      ALTER TABLE coach_attendances
        ADD CONSTRAINT coach_attendances_coach_class_date_key
        UNIQUE (coach_id, class_id, session_date);
    `);
    console.log('✅ coach_attendances constraint added.');

    console.log('6. Adding unique constraint on member_attendances(class_id, member_id, session_date)...');
    await client.unsafe(`
      ALTER TABLE member_attendances
        ADD CONSTRAINT member_attendances_class_member_date_key
        UNIQUE (class_id, member_id, session_date);
    `);
    console.log('✅ member_attendances constraint added.');

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
