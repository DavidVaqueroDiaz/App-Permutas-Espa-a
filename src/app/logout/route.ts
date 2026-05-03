import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierre de sesión. Lo hacemos como Route Handler (POST) en lugar
 * de Server Action porque desde un <form action="/logout" method="POST">
 * el flujo es más sencillo y no requiere componente cliente.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
