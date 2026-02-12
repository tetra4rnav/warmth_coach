import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase";
import { chatCompletion } from "@/lib/llm";
import { REVIEW_SYSTEM_PROMPT, buildReviewUserPrompt } from "@/lib/prompts";

function buildTranscriptWithIds(messages: Array<{ id: string; role: string; content: string }>) {
  return messages
    .map((message) => `${message.id} | ${message.role}: ${message.content}`)
    .join("\n");
}

export async function POST(
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
    .select("id, user_id")
    .eq("id", params.id)
    .single();

  if (sessionError || !session || session.user_id !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await supabase.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", params.id);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content")
    .eq("session_id", params.id)
    .order("created_at", { ascending: true });

  const transcriptWithIds = buildTranscriptWithIds(messages || []);

  const reviewPayload = await chatCompletion({
    system: REVIEW_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildReviewUserPrompt({ transcriptWithIds })
      }
    ],
    jsonMode: true
  });

  await supabase.from("session_reviews").insert({
    session_id: params.id,
    cold_moments: reviewPayload.cold_moments,
    objective: reviewPayload.objective
  });

  return NextResponse.json(reviewPayload);
}
