import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = cookies().get("wc_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdmin();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id")
    .eq("id", params.id)
    .single();

  if (!session || session.user_id !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: review } = await supabase
    .from("session_reviews")
    .select("cold_moments, objective")
    .eq("session_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json(review);
}
