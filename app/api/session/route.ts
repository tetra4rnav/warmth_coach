import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase";

const SCENARIOS = [
  "First meeting small talk",
  "Date / getting to know someone",
  "Classmate / colleague casual chat"
];

export async function POST(request: Request) {
  const { scenario } = await request.json();
  if (!SCENARIOS.includes(scenario)) {
    return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
  }
  const userId = cookies().get("wc_user_id")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: userId, scenario })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
