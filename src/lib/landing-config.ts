import { createClient } from "@/utils/supabase/server";
import { WA_NUMBER, SCHOOL_EMAIL } from "./data";

/** Returns the admin WA number from landing_config (server-side). Falls back to hardcoded WA_NUMBER. */
export async function getAdminWaPhone(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_config")
    .select("footer_wa_number")
    .single();
  return data?.footer_wa_number ?? WA_NUMBER;
}

/** Returns the school's contact email from landing_config (server-side). Falls back to hardcoded SCHOOL_EMAIL. */
export async function getAdminContactEmail(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("landing_config")
    .select("contact_email")
    .single();
  return data?.contact_email || SCHOOL_EMAIL;
}
