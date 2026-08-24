import postgres from 'postgres';
import 'dotenv/config';

const run = async () => {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    console.log("Adding logo_url to schools...");
    await sql`ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;`;

    console.log("Creating school_signatures table...");
    await sql`
      CREATE TABLE IF NOT EXISTS public.school_signatures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_school_signatures_school_id ON public.school_signatures(school_id);`;
    
    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed", err);
  } finally {
    await sql.end();
  }
};
run();
