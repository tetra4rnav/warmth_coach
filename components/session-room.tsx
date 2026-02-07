"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollAreaViewport } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "partner";
  content: string;
}

interface CoachMetrics {
  warmth: number;
  curiosity: number;
  empathy: number;
  behavior_flags: string[];
  evidence: string[];
  suggestions: { minimal: string; warmer: string };
  next_rule: string;
}

interface SessionData {
  scenario: string;
  messages: Message[];
  lastMetrics: CoachMetrics | null;
}

export function SessionRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [coachMetrics, setCoachMetrics] = useState<CoachMetrics | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<CoachMetrics["suggestions"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data: SessionData) => {
        setSession(data);
        setMessages(data.messages || []);
        setCoachMetrics(data.lastMetrics || null);
      });
  }, [sessionId]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const lastPartnerMessage = useMemo(() => {
    const reversed = [...messages].reverse();
    return reversed.find((message) => message.role === "partner")?.content ?? "";
  }, [messages]);

  async function handlePreflight() {
    if (!draft.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, draftOnly: true })
      });
      const data = await response.json();
      setSuggestions(data.suggestions ?? null);
    } catch (error) {
      setSuggestions(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(content: string) {
    if (!content.trim() || streaming) return;
    setLoading(true);
    setStreaming(true);
    setCoachError(null);
    setSuggestions(null);

    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content
    };
    const partnerMessage: Message = {
      id: `temp-partner-${Date.now()}`,
      role: "partner",
      content: ""
    };

    setMessages((prev) => [...prev, userMessage, partnerMessage]);
    setDraft("");

    try {
      const response = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, useSuggestion: "none" })
      });

      if (!response.body) {
        throw new Error("No response stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              event = line.replace("event:", "").trim();
            }
            if (line.startsWith("data:")) {
              data += line.replace("data:", "").trim();
            }
          }

          if (event === "coach") {
            try {
              const parsed = JSON.parse(data);
              if (parsed?.error) {
                setCoachError("Coach unavailable.");
              } else {
                setCoachMetrics(parsed);
              }
            } catch (error) {
              setCoachError("Coach unavailable.");
            }
            continue;
          }

          if (data) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === partnerMessage.id
                  ? { ...msg, content: msg.content + data }
                  : msg
              )
            );
          }
        }
      }
    } catch (error) {
      setCoachError("Coach unavailable.");
    } finally {
      setStreaming(false);
      setLoading(false);
    }
  }

  async function handleEndSession() {
    setLoading(true);
    try {
      await fetch(`/api/session/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      router.push(`/session/${sessionId}/review`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Scenario</p>
            <h1 className="text-2xl font-semibold">{session?.scenario ?? "Session"}</h1>
          </div>
          <Button variant="outline" onClick={handleEndSession} disabled={loading}>
            End Session
          </Button>
        </header>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="flex h-[70vh] flex-col">
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4">
              <ScrollArea className="flex-1">
                <ScrollAreaViewport className="h-full pr-4" ref={transcriptRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "rounded-lg border p-3 text-sm",
                          message.role === "user" ? "bg-background" : "bg-secondary"
                        )}
                      >
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {message.role === "user" ? "You" : "Partner"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                    {streaming && !lastPartnerMessage ? (
                      <p className="text-sm text-muted-foreground">Partner is typing...</p>
                    ) : null}
                  </div>
                </ScrollAreaViewport>
              </ScrollArea>
              <Separator />
              <div className="space-y-2">
                <Textarea
                  placeholder="Type your message..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={handlePreflight} disabled={loading}>
                    Preflight rewrite
                  </Button>
                  <Button onClick={() => handleSend(draft)} disabled={loading || streaming}>
                    Send original
                  </Button>
                  {suggestions ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleSend(suggestions.minimal)}
                        disabled={loading || streaming}
                      >
                        Send Option A
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSend(suggestions.warmer)}
                        disabled={loading || streaming}
                      >
                        Send Option B
                      </Button>
                    </>
                  ) : null}
                </div>
                {suggestions ? (
                  <div className="rounded-md border bg-background p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Preflight suggestions</p>
                    <p className="mt-2"><span className="font-semibold">Option A:</span> {suggestions.minimal}</p>
                    <p className="mt-2"><span className="font-semibold">Option B:</span> {suggestions.warmer}</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card className="flex h-[70vh] flex-col">
            <CardHeader>
              <CardTitle>Coach Panel</CardTitle>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4">
              {coachMetrics ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Warmth {coachMetrics.warmth}</Badge>
                    <Badge variant="secondary">Curiosity {coachMetrics.curiosity}</Badge>
                    <Badge variant="outline">Empathy {coachMetrics.empathy}</Badge>
                  </div>
                  <Tabs defaultValue="insights" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="insights" className="flex-1">Insights</TabsTrigger>
                      <TabsTrigger value="rewrites" className="flex-1">Rewrites</TabsTrigger>
                    </TabsList>
                    <TabsContent value="insights" className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold">Why</h3>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                          {coachMetrics.evidence.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">One rule for next turn</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{coachMetrics.next_rule}</p>
                      </div>
                    </TabsContent>
                    <TabsContent value="rewrites" className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold">Rewrite suggestions</h3>
                        <div className="mt-2 space-y-2 text-sm">
                          <p><span className="font-semibold">Option A:</span> {coachMetrics.suggestions.minimal}</p>
                          <p><span className="font-semibold">Option B:</span> {coachMetrics.suggestions.warmer}</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Coach will appear after your first message.</p>
              )}
              {coachError ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  {coachError}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
