-- School-affiliated members need to record which grade/class they're in at
-- their partner day-school (e.g. "Kelas 5 SD") -- distinct from `classes`,
-- which is this app's swim-class concept. Free text: Indonesian day-school
-- grade naming varies too much ("Kelas 5 SD", "2 SMP", "VI B") for an enum.
ALTER TABLE members ADD COLUMN IF NOT EXISTS school_grade text;
