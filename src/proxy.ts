import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (err) {
      console.error("[proxy] getUser failed:", err);
    }

    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (user && isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (err) {
    console.error("[proxy] unexpected error:", err);
    if (!isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|offline.html).*)",
  ],
};
