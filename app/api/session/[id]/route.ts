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
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, scenario, user_id")
    .eq("id", params.id)
    .single();

  if (sessionError || !session || session.user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content")
    .eq("session_id", params.id)
    .order("created_at", { ascending: true });

  const { data: metrics } = await supabase
    .from("turn_metrics")
    .select("warmth, curiosity, empathy, behavior_flags, evidence, suggestion_minimal, suggestion_warmer, next_rule")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastMetrics = metrics
    ? {
        warmth: metrics.warmth,
        curiosity: metrics.curiosity,
        empathy: metrics.empathy,
        behavior_flags: metrics.behavior_flags || [],
        evidence: metrics.evidence || [],
        suggestions: {
          minimal: metrics.suggestion_minimal,
          warmer: metrics.suggestion_warmer
        },
        next_rule: metrics.next_rule
      }
    : null;

  return NextResponse.json({
    scenario: session.scenario,
    messages: messages || [],
    lastMetrics
  });
}
