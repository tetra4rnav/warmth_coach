import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase";
import { chatCompletion, streamChatTokens } from "@/lib/llm";
import {
  PARTNER_SYSTEM_PROMPT,
  COACH_SYSTEM_PROMPT,
  buildCoachUserPrompt
} from "@/lib/prompts";

function buildTranscriptSnippet(messages: Array<{ role: string; content: string }>) {
  return messages
    .map((message) => `${message.role === "user" ? "User" : "Partner"}: ${message.content}`)
    .join("\n");
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const content: string = body.content;
  const draftOnly: boolean = body.draftOnly === true;

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
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", params.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const transcript = buildTranscriptSnippet([...(recentMessages || [])].reverse());
  const lastPartnerMessage = [...(recentMessages || [])]
    .find((message) => message.role === "partner")?.content ?? null;

  if (draftOnly) {
    const coachPayload = await chatCompletion({
      system: COACH_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildCoachUserPrompt({
            scenario: session.scenario,
            lastPartnerMessage,
            userMessage: content,
            transcript
          })
        }
      ],
      jsonMode: true
    });
    return NextResponse.json(coachPayload);
  }

  const { data: userMessage, error: userError } = await supabase
    .from("messages")
    .insert({
      session_id: params.id,
      role: "user",
      content
    })
    .select("id")
    .single();

  if (userError || !userMessage) {
    return NextResponse.json({ error: "Failed to store message" }, { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      let partnerContent = "";
      try {
        const partnerMessages = [
          {
            role: "user" as const,
            content: `Scenario: ${session.scenario}. Stay in character.`
          },
          ...[...(recentMessages || [])]
            .reverse()
            .map((message) => ({
              role: message.role === "user" ? ("user" as const) : ("assistant" as const),
              content: message.content
            })),
          { role: "user" as const, content }
        ];

        const tokenStream = await streamChatTokens({
          system: PARTNER_SYSTEM_PROMPT,
          messages: partnerMessages
        });

        for await (const token of tokenStream) {
          partnerContent += token;
          controller.enqueue(`data: ${token}\n\n`);
        }

        const { data: partnerMessage, error: partnerError } = await supabase
          .from("messages")
          .insert({
            session_id: params.id,
            role: "partner",
            content: partnerContent
          })
          .select("id")
          .single();

        if (partnerError || !partnerMessage) {
          controller.enqueue(`event: coach\ndata: ${JSON.stringify({ error: "Partner message failed" })}\n\n`);
          controller.close();
          return;
        }

        const coachPayload = await chatCompletion({
          system: COACH_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: buildCoachUserPrompt({
                scenario: session.scenario,
                lastPartnerMessage,
                userMessage: content,
                transcript
              })
            }
          ],
          jsonMode: true
        });

        await supabase.from("turn_metrics").insert({
          message_id: userMessage.id,
          warmth: coachPayload.warmth,
          curiosity: coachPayload.curiosity,
          empathy: coachPayload.empathy,
          behavior_flags: coachPayload.behavior_flags,
          evidence: coachPayload.evidence,
          suggestion_minimal: coachPayload.suggestions?.minimal,
          suggestion_warmer: coachPayload.suggestions?.warmer,
          next_rule: coachPayload.next_rule
        });

        controller.enqueue(`event: coach\ndata: ${JSON.stringify(coachPayload)}\n\n`);
      } catch (error) {
        controller.enqueue(`event: coach\ndata: ${JSON.stringify({ error: "Coach unavailable" })}\n\n`);
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
