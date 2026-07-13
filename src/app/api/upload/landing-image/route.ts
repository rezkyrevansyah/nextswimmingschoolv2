/**
 * POST /api/upload/landing-image
 * Body: multipart/form-data { file: File, target: string, id?: string }
 * Returns: { url: string }
 *
 * Owner only. Uploads a landing-page image to R2 and writes its URL to the
 * matching landing table/column. Targets are a hardcoded allowlist: the client
 * never supplies table or column names.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadBuffer, keys } from "@/utils/r2/upload";

type Target = "hero" | "safety" | "facility" | "testimonial" | "gallery";

const ROW_TARGETS: Target[] = ["facility", "testimonial", "gallery"];
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
  if (!target || !["hero", "safety", "facility", "testimonial", "gallery"].includes(target)) {
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
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  let url: string;
  switch (target) {
    case "hero":
      url = await uploadBuffer(keys.landingHero(), buffer, contentType);
      await supabase.from("landing_hero").update({ bg_image_url: url }).eq("id", 1);
      break;
    case "safety":
      url = await uploadBuffer(keys.landingSafety(), buffer, contentType);
      await supabase.from("landing_safety").update({ photo_url: url }).eq("id", 1);
      break;
    case "facility":
      url = await uploadBuffer(keys.landingFacility(id!), buffer, contentType);
      await supabase.from("landing_facility_items").update({ photo_url: url }).eq("id", id!);
      break;
    case "testimonial":
      url = await uploadBuffer(keys.landingTestimonial(id!), buffer, contentType);
      await supabase.from("landing_testimonials").update({ avatar_url: url }).eq("id", id!);
      break;
    case "gallery":
      url = await uploadBuffer(keys.landingGallery(id!), buffer, contentType);
      await supabase.from("landing_gallery").update({ photo_url: url }).eq("id", id!);
      break;
  }

  return NextResponse.json({ url });
}
