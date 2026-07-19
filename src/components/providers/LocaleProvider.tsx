"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { DEFAULT_LOCALE, translate, translateArray, type Locale } from "@/i18n/dictionaries";

const NS_LOCALE_KEY = "ns_locale";

interface LocaleApi {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
}

const LocaleCtx = createContext<LocaleApi | null>(null);

export function useLocale(): LocaleApi {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "id";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  /* eslint-disable react-hooks/set-state-in-effect -- resolve persisted locale once on mount */
  useEffect(() => {
    const stored = localStorage.getItem(NS_LOCALE_KEY);
    if (isLocale(stored)) {
      setLocaleState(stored);
      return;
    }
    // No device-local preference yet — check the account's saved preference.
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("locale").eq("id", user.id).single();
      if (isLocale(data?.locale ?? null)) {
        setLocaleState(data!.locale as Locale);
        localStorage.setItem(NS_LOCALE_KEY, data!.locale as Locale);
      }
    })();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(NS_LOCALE_KEY, next);
    // Non-blocking cross-device sync — never delays the UI toggle.
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("profiles").update({ locale: next }).eq("id", user.id);
    })();
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );
  const tArray = useCallback((key: string) => translateArray(locale, key), [locale]);

  const api = useMemo<LocaleApi>(() => ({ locale, setLocale, t, tArray }), [locale, setLocale, t, tArray]);

  return <LocaleCtx.Provider value={api}>{children}</LocaleCtx.Provider>;
}
