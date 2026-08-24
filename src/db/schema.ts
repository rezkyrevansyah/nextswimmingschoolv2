import { pgTable, serial, text, varchar, timestamp, uuid, integer, boolean } from "drizzle-orm/pg-core";

// Sample users table from user instructions
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name'),
  phone: varchar('phone', { length: 256 }),
});

// Next Swimming School core profiles table
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: varchar('phone', { length: 50 }),
  role: text('role').notNull(), // 'owner' | 'admin' | 'coach' | 'member' | 'school'
  avatarUrl: text('avatar_url'),
  branchId: uuid('branch_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Branches table
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  city: text('city'),
  address: text('address'),
  phone: text('phone'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Programs table
export const programs = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  monthlyFee: integer('monthly_fee').notNull(),
  sessionsPerMonth: integer('sessions_per_month').default(4),
  createdAt: timestamp('created_at').defaultNow(),
});

// Classes table
export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id'), // Nullable for external locations
  name: text('name').notNull(),
  description: text('description'),
  classType: text('class_type').notNull().default('reguler'), // 'reguler' | 'private'
  locationType: text('location_type').notNull().default('branch'), // 'branch' | 'external'
  externalLocationName: text('external_location_name'),
  externalLocationAddress: text('external_location_address'),
  googleMapsUrl: text('google_maps_url'),
  capacity: integer('capacity').notNull().default(15),
  enrolled: integer('enrolled').notNull().default(0),
  priceMonthly: integer('price_monthly').notNull().default(0),
  pricePerSession: integer('price_per_session'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Test table for Drizzle Kit Push validation
export const drizzleTestNotes = pgTable('drizzle_test_notes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Competitions table
export const competitions = pgTable('competitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  organizer: text('organizer'),
  location: text('location'),
  city: text('city'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  level: text('level').default('local'),
  description: text('description'),
  createdById: uuid('created_by_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Competition Participations table
export const competitionParticipations = pgTable('competition_participations', {
  id: uuid('id').primaryKey().defaultRandom(),
  competitionId: uuid('competition_id').notNull(),
  memberId: uuid('member_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  coachId: uuid('coach_id'),
  category: text('category').notNull(),
  stroke: text('stroke'),
  distanceMeters: integer('distance_meters'),
  ageGroup: text('age_group'),
  timeSeconds: text('time_seconds'),
  timeFormatted: text('time_formatted'),
  rank: integer('rank'),
  resultStatus: text('result_status').default('finished'),
  award: text('award').default('participant'),
  customAwardLabel: text('custom_award_label'),
  certificateUrl: text('certificate_url'),
  photoUrl: text('photo_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});



