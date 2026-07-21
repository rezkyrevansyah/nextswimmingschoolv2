/**
 * POST /api/upload/landing-image
 * Body: multipart/form-data { file: File, target: string, id?: string }
 * Returns: { url: string }
 *
 * Owner only. Uploads a landing-page image to Supabase Storage and writes its
 * URL to the matching landing table/column. Targets are a hardcoded allowlist:
 * the client never supplies table or column names.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadToBucket, keys } from "@/utils/supabase-storage/upload";
import { BUCKET_PUBLIC } from "@/utils/supabase-storage/client";

type Target = "hero" | "safety" | "facility" | "testimonial" | "gallery" | "partner" | "program" | "coach" | "testimonial-v2";

const ROW_TARGETS: Target[] = ["facility", "testimonial", "gallery", "partner", "program", "coach", "testimonial-v2"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const target = form.get("target") as Target | null;
  const id = (form.get("id") as string | null) ?? null;

  if (!file) return NextResponse.json({ error: "File wajib diunggah." }, { status: 400 });
  if (!target || !["hero", "safety", "facility", "testimonial", "gallery", "partner", "program", "coach", "testimonial-v2"].includes(target)) {
    return NextResponse.json({ error: "Target tidak valid." }, { status: 400 });
  }
  if (ROW_TARGETS.includes(target) && (!id || !UUID_RE.test(id))) {
    return NextResponse.json({ error: "ID baris tidak valid." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP." }, { status: 400 });
  }
  if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
    return NextResponse.json({ error: `Ukuran file terlalu besar. Maksimum ${MAX_SIZE_MB}MB.` }, { status: 400 });
  }

  // Verify the target row exists before uploading.
  if (target === "facility") {
    const { data } = await supabase.from("landing_facility_items").select("id").eq("id", id!).single();
    if (!data) return NextResponse.json({ error: "Baris fasilitas tidak ditemukan." }, { status: 404 });
  } else if (target === "testimonial") {
    const { data } = await supabase.from("landing_testimonials").select("id").eq("id", id!).single();
    if (!data) return NextResponse.json({ error: "Testimoni tidak ditemukan." }, { status: 404 });
  } else if (target === "gallery") {
    const { data } = await supabase.from("landing_gallery").select("id").eq("id", id!).single();
    if (!data) return NextResponse.json({ error: "Foto galeri tidak ditemukan." }, { status: 404 });
  } else if (target === "partner") {
    const { data } = await supabase.from("landing_partners").select("id").eq("id", id!).single();
    if (!data) return NextResponse.json({ error: "Partner tidak ditemukan." }, { status: 404 });
  } else if (target === "program") {
    const { data } = await supabase.from("landing_programs").select("id").eq("id", id!).single();
    if (!data) return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
  } else if (target === "coach") {
    const { data } = await supabase.from("landing_coaches").select("id").eq("id", id!).single();
    if (!data) return NextResponse.json({ error: "Coach tidak ditemukan." }, { status: 404 });
  } else if (target === "testimonial-v2") {
    const { data } = await supabase.from("landing_testimonials_v2").select("id").eq("id", id!).single();
    if (!data) return NextResponse.json({ error: "Testimoni tidak ditemukan." }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  let url: string;
  let dbError: { message: string } | null = null;
  switch (target) {
    case "hero":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingHero(), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_hero").update({ bg_image_url: url }).eq("id", 1));
      break;
    case "safety":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingSafety(), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_safety").update({ photo_url: url }).eq("id", 1));
      break;
    case "facility":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingFacility(id!), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_facility_items").update({ photo_url: url }).eq("id", id!));
      break;
    case "testimonial":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingTestimonial(id!), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_testimonials").update({ avatar_url: url }).eq("id", id!));
      break;
    case "gallery":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingGallery(id!), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_gallery").update({ photo_url: url }).eq("id", id!));
      break;
    case "partner":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingPartner(id!), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_partners").update({ logo_url: url }).eq("id", id!));
      break;
    case "program":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingProgram(id!), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_programs").update({ photo_url: url }).eq("id", id!));
      break;
    case "coach":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingCoach(id!), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_coaches").update({ photo_url: url }).eq("id", id!));
      break;
    case "testimonial-v2":
      url = await uploadToBucket(BUCKET_PUBLIC, keys.landingTestimonialV2(id!), buffer, contentType);
      ({ error: dbError } = await supabase.from("landing_testimonials_v2").update({ avatar_url: url }).eq("id", id!));
      break;
  }

  if (dbError) {
    return NextResponse.json({ error: `Gagal menyimpan URL gambar: ${dbError.message}` }, { status: 500 });
  }

  return NextResponse.json({ url });
}
