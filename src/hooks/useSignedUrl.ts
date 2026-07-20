"use client";
/**
 * useSignedUrl — resolves a private-bucket storage key (e.g. bills.proof_url,
 * certifications.photo_url, coach_attendances.selfie_url) into a short-lived
 * signed URL for rendering.
 *
 * Usage:
 *   const url = useSignedUrl(bill.proof_url);
 *   <img src={url ?? undefined} />
 */
import { useEffect, useState } from "react";

export function useSignedUrl(key: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- fetches a signed URL for the given key, not derivable from props/state */
  useEffect(() => {
    if (!key) {
      setUrl(null);
      return;
    }
    let active = true;
    setUrl(null);
    fetch("/api/storage/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
      .then((res) => res.json())
      .then((data: { url?: string }) => {
        if (active) setUrl(data.url ?? null);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [key]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return url;
}
