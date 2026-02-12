"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Review {
  cold_moments: Array<{
    message_id: string;
    user_quote: string;
    reason: string;
    alternative: string;
  }>;
  objective: string;
}

export default function ReviewPage({ params }: { params: { id: string } }) {
  const [review, setReview] = useState<Review | null>(null);

  useEffect(() => {
    fetch(`/api/session/${params.id}/review`)
      .then((res) => res.json())
      .then((data) => setReview(data));
  }, [params.id]);

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-4xl px-6 py-12 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Session review</p>
            <h1 className="text-3xl font-semibold">Your warmth review</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/new">Start another session</Link>
          </Button>
        </header>
        {review ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cold moments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.cold_moments.map((moment) => (
                  <div key={moment.message_id} className="rounded-md border p-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">User message</p>
                    <p className="mt-1 text-sm">“{moment.user_quote}”</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Reason:</span> {moment.reason}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Better alternative:</span> {moment.alternative}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Next practice objective</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{review.objective}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading review...</p>
        )}
      </div>
    </main>
  );
}
