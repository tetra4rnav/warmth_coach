"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

  useEffect(() => {
    if (devBypass) {
      const existing = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("wc_user_id="));
      if (!existing) {
        const userId = uuidv4();
        document.cookie = `wc_user_id=${userId}; path=/; max-age=31536000`;
      }
      setReady(true);
      return;
    }

    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id;
      if (userId) {
        document.cookie = `wc_user_id=${userId}; path=/; max-age=31536000`;
        setReady(true);
      } else {
        setReady(false);
      }
    });
  }, [devBypass]);

  if (devBypass && ready) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Sign in to Warmth Coach</CardTitle>
            <CardDescription>
              We use Supabase magic links. Enter your email to receive a sign-in link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button
              onClick={async () => {
                try {
                  const supabase = createSupabaseBrowser();
                  const { error } = await supabase.auth.signInWithOtp({ email });
                  if (error) throw error;
                  setStatus("Check your email for a magic link.");
                } catch (error) {
                  setStatus("Unable to send magic link. Check configuration.");
                }
              }}
            >
              Send magic link
            </Button>
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
