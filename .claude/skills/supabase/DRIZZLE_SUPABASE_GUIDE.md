# 🛢️ Drizzle ORM + Supabase Database Guide

> Complete setup guide for using **Drizzle ORM** with **Supabase PostgreSQL**

---

# Overview

This guide explains how to connect **Drizzle ORM** with a **Supabase PostgreSQL Database**, create schemas, generate migrations, and perform CRUD operations.

---

# Prerequisites

Before starting, install the required packages.

## 1. Install Drizzle ORM

```bash
npm i drizzle-orm@rc
```

## 2. Install Drizzle Kit

```bash
npm i -D drizzle-kit@rc
```

## 3. Install dotenv

Used for managing environment variables.

```bash
npm i dotenv
```

---

## 4. Install postgres driver

```bash
npm i postgres
```

---

## 5. Install Supabase CLI (Optional)

Only needed if you want to manage migrations using Supabase CLI.

Documentation:

https://supabase.com/docs/guides/cli

---

# Project Setup

## Step 1 — Create a Supabase Project

Create a new project from the Supabase Dashboard.

---

## Step 2 — Get Database Connection String

Navigate to

```
Project
└── Settings
    └── Database
```

Copy the **Connection String**.

**Important**

Use the **Connection Pooler** connection string.

Replace:

```
[YOUR-PASSWORD]
```

with your actual database password.

Example:

```env
DATABASE_URL=postgres://postgres:password@db.xxx.supabase.co:6543/postgres
```

---

## Step 3 — Create `.env`

```env
DATABASE_URL=YOUR_DATABASE_URL
```

---

# Connect Drizzle ORM

Create

```
src/db/index.ts
```

```ts
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

config({ path: '.env' });

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle({
    client,
});
```

---

# Create Database Schema

Create

```
src/db/schema.ts
```

Example:

```ts
import {
    integer,
    pgTable,
    serial,
    text,
    timestamp,
} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users_table', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    age: integer('age').notNull(),
    email: text('email').notNull().unique(),
});

export const postsTable = pgTable('posts_table', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content').notNull(),

    userId: integer('user_id')
        .notNull()
        .references(() => usersTable.id, {
            onDelete: 'cascade',
        }),

    createdAt: timestamp('created_at')
        .notNull()
        .defaultNow(),

    updatedAt: timestamp('updated_at')
        .notNull()
        .$onUpdate(() => new Date()),
});
```

---

## Export Types

```ts
export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertPost = typeof postsTable.$inferInsert;
export type SelectPost = typeof postsTable.$inferSelect;
```

---

# Configure Drizzle Kit

Create

```
drizzle.config.ts
```

```ts
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
    schema: './src/db/schema.ts',

    out: './supabase/migrations',

    dialect: 'postgresql',

    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
```

---

# Generate Migration

Generate SQL migration files.

```bash
npx drizzle-kit generate
```

Output:

```
supabase/
└── migrations/
```

Example generated SQL:

```sql
CREATE TABLE IF NOT EXISTS "users_table" (
    id serial PRIMARY KEY,
    name text NOT NULL,
    age integer NOT NULL,
    email text UNIQUE NOT NULL
);
```

---

# Apply Migration

Run:

```bash
npx drizzle-kit migrate
```

---

# Push Schema Directly

Instead of migrations:

```bash
npx drizzle-kit push
```

### Recommended Use

✅ Local Development

✅ Rapid schema iteration

❌ Production

---

# Using Supabase CLI

Generate migration

```bash
npx drizzle-kit generate
```

Initialize Supabase

```bash
supabase init
```

Link project

```bash
supabase link
```

Push migration

```bash
supabase db push
```

---

# Existing Database Warning

If your database already contains tables:

Review generated SQL before applying.

Unsafe example:

```sql
CREATE SCHEMA auth;
```

Safe example:

```sql
CREATE TABLE IF NOT EXISTS auth.users (...);
```

Always verify generated migration files before pushing to production.

---

# Recommended Project Structure

```
📦 project-root
│
├── src
│   └── db
│       ├── index.ts
│       ├── schema.ts
│       └── queries
│            ├── insert.ts
│            ├── select.ts
│            ├── update.ts
│            └── delete.ts
│
├── supabase
│   ├── config.toml
│   └── migrations
│        ├── meta
│        └── *.sql
│
├── .env
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

# CRUD Examples

---

# INSERT

```ts
import { db } from '../index';
import {
    InsertPost,
    InsertUser,
    postsTable,
    usersTable,
} from '../schema';

export async function createUser(data: InsertUser) {
    await db.insert(usersTable).values(data);
}

export async function createPost(data: InsertPost) {
    await db.insert(postsTable).values(data);
}
```

---

# SELECT

```ts
import {
    asc,
    between,
    count,
    eq,
    getColumns,
    sql,
} from 'drizzle-orm';

import { db } from '../index';

import {
    SelectUser,
    postsTable,
    usersTable,
} from '../schema';
```

## Get User by ID

```ts
export async function getUserById(id: SelectUser['id']) {
    return db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id));
}
```

---

## Get Users with Post Count

```ts
export async function getUsersWithPostsCount(
    page = 1,
    pageSize = 5,
) {
    return db
        .select({
            ...getColumns(usersTable),
            postsCount: count(postsTable.id),
        })
        .from(usersTable)
        .leftJoin(
            postsTable,
            eq(usersTable.id, postsTable.userId),
        )
        .groupBy(usersTable.id)
        .orderBy(asc(usersTable.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
}
```

---

## Posts in Last 24 Hours

```ts
export async function getPostsForLast24Hours(
    page = 1,
    pageSize = 5,
) {
    return db
        .select({
            id: postsTable.id,
            title: postsTable.title,
        })
        .from(postsTable)
        .where(
            between(
                postsTable.createdAt,
                sql`now() - interval '1 day'`,
                sql`now()`
            )
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize);
}
```

---

# UPDATE

```ts
import { eq } from 'drizzle-orm';

import { db } from '../index';

import {
    postsTable,
    SelectPost,
} from '../schema';

export async function updatePost(
    id: SelectPost['id'],
    data: Partial<Omit<SelectPost, 'id'>>
) {
    await db
        .update(postsTable)
        .set(data)
        .where(eq(postsTable.id, id));
}
```

---

# DELETE

```ts
import { eq } from 'drizzle-orm';

import { db } from '../index';

import {
    SelectUser,
    usersTable,
} from '../schema';

export async function deleteUser(
    id: SelectUser['id']
) {
    await db
        .delete(usersTable)
        .where(eq(usersTable.id, id));
}
```

---

# Workflow Summary

```text
Create Schema
      │
      ▼
drizzle-kit generate
      │
      ▼
SQL Migration Created
      │
      ▼
drizzle-kit migrate
      │
      ▼
Database Updated
      │
      ▼
Use db.insert()
Use db.select()
Use db.update()
Use db.delete()
```

---

# Best Practices

✅ Store all schemas inside `src/db/schema.ts`

✅ Store reusable queries in `src/db/queries`

✅ Never hardcode the database URL

✅ Always use `.env`

✅ Review generated SQL before production deployment

✅ Use `drizzle-kit push` only for local development

✅ Use migrations for production deployments

---

# Useful Commands

Generate migration

```bash
npx drizzle-kit generate
```

Apply migration

```bash
npx drizzle-kit migrate
```

Push schema

```bash
npx drizzle-kit push
```

Initialize Supabase

```bash
supabase init
```

Link project

```bash
supabase link
```

Push migration

```bash
supabase db push
```

---

# References

- Drizzle ORM Documentation
- Drizzle Kit Documentation
- Supabase Database Documentation
- Supabase CLI Documentation
