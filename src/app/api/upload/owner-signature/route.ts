import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { uploadToBucket, keys } from '@/utils/supabase-storage/upload';
import { BUCKET_PUBLIC } from '@/utils/supabase-storage/client';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = user.user_metadata?.role;
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: Owner only' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP.' }, { status: 400 });
  }
  if (file.size / (1024 * 1024) > 2) {
    return NextResponse.json({ error: 'Ukuran file terlalu besar. Maksimum 2MB.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.ownerSignature();
  const url = await uploadToBucket(BUCKET_PUBLIC, key, buffer, file.type || 'image/png');

  await supabase.from('owner_settings').upsert({
    id: 'default',
    head_signature_url: url,
    updated_at: new Date().toISOString(),
  } as any);

  return NextResponse.json({ url });
}
