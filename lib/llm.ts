export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";

function getConfig() {
  const baseUrl = process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  if (!apiKey) {
    throw new Error("LLM_API_KEY is missing.");
  }
  return { baseUrl, apiKey, model };
}

async function callOnce({
  system,
  messages,
  stream,
  jsonMode
}: {
  system?: string;
  messages: ChatMessage[];
  stream?: boolean;
  jsonMode?: boolean;
}) {
  const { baseUrl, apiKey, model } = getConfig();
  const payload: Record<string, unknown> = {
    model,
    messages: system
      ? [{ role: "system", content: system }, ...messages]
      : messages,
    stream: !!stream
  };
  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${text}`);
  }

  return response;
}

export async function chatCompletion({
  system,
  messages,
  stream = false,
  jsonMode = false
}: {
  system?: string;
  messages: ChatMessage[];
  stream?: boolean;
  jsonMode?: boolean;
}) {
  const response = await callOnce({ system, messages, stream, jsonMode });
  if (stream) {
    return response.body;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!jsonMode) {
    return content as string;
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    const retryResponse = await callOnce({
      system,
      messages: [
        ...messages,
        { role: "user", content: "Output ONLY valid JSON for the requested schema." }
      ],
      stream: false,
      jsonMode: false
    });
    const retryData = await retryResponse.json();
    const retryContent = retryData.choices?.[0]?.message?.content ?? "";
    return JSON.parse(retryContent);
  }
}

export async function streamChatTokens({
  system,
  messages
}: {
  system?: string;
  messages: ChatMessage[];
}) {
  const body = await chatCompletion({ system, messages, stream: true });
  if (!body) {
    throw new Error("No stream body returned from LLM.");
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  async function* iterator() {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.replace(/^data:\s*/, "");
        if (data === "[DONE]") {
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            yield token as string;
          }
        } catch {
          continue;
        }
      }
    }
  }

  return iterator();
}
