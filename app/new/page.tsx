"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const scenarios = [
  {
    title: "First meeting small talk",
    description: "Warm introduction with light topics and easy follow-ups."
  },
  {
    title: "Date / getting to know someone",
    description: "Curious, warm questions while keeping the vibe relaxed."
  },
  {
    title: "Classmate / colleague casual chat",
    description: "Friendly check-in that balances work and personal topics."
  }
];

export default function NewSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startSession(scenario: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario })
      });
      const data = await response.json();
      router.push(`/session/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Pick a scenario</h1>
        <p className="mt-2 text-muted-foreground">
          Choose the vibe you want to practice. The partner will stay in character and the coach will score every turn.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <Card key={scenario.title} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{scenario.title}</CardTitle>
                <CardDescription>{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={() => startSession(scenario.title)}
                >
                  Start session
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
