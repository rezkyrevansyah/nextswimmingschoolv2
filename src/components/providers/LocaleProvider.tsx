"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { DEFAULT_LOCALE, getTemplate, translate, translateArray, type Locale } from "@/i18n/dictionaries";
import { NoTranslate } from "@/components/ui/NoTranslate";

const NS_LOCALE_KEY = "ns_locale";

interface LocaleApi {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
  /** Like `t()`, but every interpolated `{var}` is wrapped in `<NoTranslate>` instead of
   * inlined into the plain string. Use this instead of `t()` wherever a translated
   * sentence embeds a live database value (a name, a free-text description, etc.) that
   * must not be rewritten by Google Translate — e.g. confirm-dialog titles/bodies, modal
   * titles, toast messages. Returns `ReactNode`, so the caller (or the prop it flows
   * into) must accept `ReactNode`, not `string`. */
  tNode: (key: string, vars?: Record<string, ReactNode>) => ReactNode;
}

/** Splits a template like "Archive {name}?" into ["Archive ", "{name}", "?"] and swaps
 * each `{var}` placeholder for its value wrapped in `<NoTranslate>` — everything else
 * stays plain text so Google Translate still translates it normally. */
function interpolateNode(template: string, vars?: Record<string, ReactNode>): ReactNode {
  if (!vars) return template;
  const segments = template.split(/(\{\w+\})/g);
  return segments.map((segment, i) => {
    const match = /^\{(\w+)\}$/.exec(segment);
    if (match && match[1] in vars) {
      return <NoTranslate key={i}>{vars[match[1]]}</NoTranslate>;
    }
    return segment;
  });
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

export function LocaleProvider({ children, forcedLocale }: { children: React.ReactNode; forcedLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(forcedLocale ?? DEFAULT_LOCALE);

  /* eslint-disable react-hooks/set-state-in-effect -- resolve persisted locale once on mount */
  useEffect(() => {
    // Pinned locale (e.g. owner panel, which drives translation via Google
    // Translate instead) — never read the cross-panel persisted preference.
    if (forcedLocale) return;
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
  }, [forcedLocale]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (forcedLocale) return; // pinned — ignore attempts to switch
    setLocaleState(next);
    localStorage.setItem(NS_LOCALE_KEY, next);
    // Non-blocking cross-device sync — never delays the UI toggle.
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("profiles").update({ locale: next }).eq("id", user.id);
    })();
  }, [forcedLocale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );
  const tArray = useCallback((key: string) => translateArray(locale, key), [locale]);
  const tNode = useCallback(
    (key: string, vars?: Record<string, ReactNode>) => interpolateNode(getTemplate(locale, key), vars),
    [locale]
  );

  const api = useMemo<LocaleApi>(() => ({ locale, setLocale, t, tArray, tNode }), [locale, setLocale, t, tArray, tNode]);

  return <LocaleCtx.Provider value={api}>{children}</LocaleCtx.Provider>;
}
