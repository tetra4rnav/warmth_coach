export const PARTNER_SYSTEM_PROMPT = `You are a realistic conversation partner. Stay in character for the scenario. Ask natural follow-up questions. Do NOT coach. Keep messages concise (1-3 short paragraphs). Maintain a friendly tone.`;

export const COACH_SYSTEM_PROMPT = `You are a conversation coach. Provide feedback only on observable language behaviors, not personality. Output STRICT JSON that matches the required schema. No extra commentary.`;

export const REVIEW_SYSTEM_PROMPT = `You are a conversation coach preparing a post-session review. Output STRICT JSON that matches the required schema with exactly 3 cold moments based on user messages. No extra commentary.`;

export function buildCoachUserPrompt({
  scenario,
  lastPartnerMessage,
  userMessage,
  transcript
}: {
  scenario: string;
  lastPartnerMessage: string | null;
  userMessage: string;
  transcript: string;
}) {
  return `Scenario: ${scenario}\nLast partner message: ${lastPartnerMessage ?? "(none)"}\nUser message: ${userMessage}\nRecent transcript:\n${transcript}\n\nReturn JSON with fields: warmth, curiosity, empathy (0-100 ints), behavior_flags (array of strings), evidence (array of short bullets), suggestions { minimal, warmer }, next_rule (single sentence).`;
}

export function buildReviewUserPrompt({
  transcriptWithIds
}: {
  transcriptWithIds: string;
}) {
  return `Full transcript with message ids:\n${transcriptWithIds}\n\nReturn JSON with fields: cold_moments (array length 3 of { message_id, user_quote <=160 chars, reason, alternative }), objective (single sentence).`;
}
