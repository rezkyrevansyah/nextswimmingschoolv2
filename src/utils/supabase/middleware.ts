import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session — do NOT write logic between createServerClient and supabase.auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPaths = ["/", "/login", "/register"];
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith("/(public)")
  );

  // Redirect unauthenticated users away from protected pages.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login page.
  if (user && pathname === "/login") {
    const role = user.user_metadata?.role as string | undefined;
    const url = request.nextUrl.clone();
    url.pathname = role ? `/${role}` : "/member";
    return NextResponse.redirect(url);
  }

  // Block suspended members — redirect to /login with ?suspended=1
  if (user && pathname === "/member") {
    const { data: member } = await supabase
      .from("members")
      .select("status, suspend_until")
      .eq("profile_id", user.id)
      .single();

    if (member) {
      const isSuspended =
        member.status === "suspended" ||
        (member.suspend_until != null &&
          new Date(member.suspend_until) >= new Date());
      if (isSuspended) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("suspended", "1");
        return NextResponse.redirect(url);
      }
    }
  }

  // Block suspended coaches — show banner inside coach page (don't log out)
  // The coach page itself reads suspend_until and shows the banner.
  // No redirect needed here — coach can still login but features are locked.

  return supabaseResponse;
};
