"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type JokeResponse = {
  error?: boolean;
  joke?: string;
  setup?: string;
  delivery?: string;
};

export function JokeGenerator() {
  const [joke, setJoke] = useState("Loading a joke...");
  const [loading, setLoading] = useState(false);

  const fetchJoke = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("https://v2.jokeapi.dev/joke/Any?type=single", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load joke");
      }

      const data = (await response.json()) as JokeResponse;

      if (data.error) {
        throw new Error("Joke API error");
      }

      const nextJoke = data.joke ?? `${data.setup ?? ""} ${data.delivery ?? ""}`.trim();
      setJoke(nextJoke || "No joke loaded. Please try again.");
    } catch {
      setJoke("Could not fetch a joke right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJoke();
  }, [fetchJoke]);

  return (
    <Card>
      <CardHeader
        title="Random joke generator"
        description="A quick laugh from an external joke API."
      />
      <CardBody className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-slate-700">
          “{joke}”
        </div>
        <button
          type="button"
          onClick={() => void fetchJoke()}
          disabled={loading}
          className={buttonClasses("secondary", "md")}
        >
          {loading ? "Loading..." : "Get another joke"}
        </button>
      </CardBody>
    </Card>
  );
}
