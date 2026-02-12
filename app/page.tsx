import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold">Warmth Coach</h1>
          <p className="text-lg text-muted-foreground">
            Practice conversations that feel curious, empathetic, and engaged. You will chat with a realistic
            partner while a coach scores each message and suggests warmer rewrites.
          </p>
          <Button asChild size="lg">
            <Link href="/new">Start Session</Link>
          </Button>
        </header>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Live partner",
              body: "Streamed responses keep the role-play feeling natural and paced."
            },
            {
              title: "Coach insights",
              body: "See warmth, curiosity, and empathy scores plus grounded feedback."
            },
            {
              title: "End-of-session review",
              body: "Get three specific cold moments and a focused practice objective."
            }
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Designed for quick practice before dates, meetings, or casual chats.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
