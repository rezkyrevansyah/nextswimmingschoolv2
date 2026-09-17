"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
            layout?: number;
          },
          elementId: string
        ) => void;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

// Defensive monkey-patch for Google Translate DOM manipulation within React VDOM.
// When Google Translate translates the page, it modifies text nodes and wraps them in <font> tags.
// React's reconciliation engine throws NotFoundError on removeChild or insertBefore if the parent doesn't match.
if (typeof window !== "undefined" && !(Node.prototype as unknown as { __gt_patched?: boolean }).__gt_patched) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("GoogleTranslate: Prevented removeChild DOM crash on mismatched parent", child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("GoogleTranslate: Prevented insertBefore DOM crash on mismatched reference", newNode, referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };

  (Node.prototype as unknown as { __gt_patched?: boolean }).__gt_patched = true;
}

export function GoogleTranslate() {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,id",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      }
    };

    // If script was already loaded on a previous page transition
    if (window.google?.translate?.TranslateElement && !document.querySelector(".goog-te-combo")) {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,id",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      } catch {
        // Ignored if already initialized
      }
    }
  }, []);

  return (
    <>
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
      <style jsx global>{`
        /* Hide Google Translate top banner & widget frames */
        .goog-te-banner-frame.skiptranslate,
        .goog-te-banner-frame {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          top: 0px !important;
          position: static !important;
        }
        #google_translate_element {
          display: none !important;
        }
        .goog-tooltip,
        .goog-tooltip:hover {
          display: none !important;
        }
        .goog-text-highlight {
          background-color: transparent !important;
          box-shadow: none !important;
        }
        .skiptranslate:not(.goog-te-gadget) {
          display: none !important;
        }
        iframe.goog-te-banner-frame {
          display: none !important;
        }
        #goog-gt-tt,
        .VIpgJd-ZVi9od-ORHb-OEVmcd,
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf {
          display: none !important;
          visibility: hidden !important;
        }
      `}</style>
    </>
  );
}

export function GoogleLanguageSwitcher({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "pill";
}) {
  const [currentLang, setCurrentLang] = useState<"en" | "id">("en");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
    if (match) {
      const val = decodeURIComponent(match[1]);
      if (val.includes("/id")) {
        setCurrentLang("id");
        return;
      }
    }
    setCurrentLang("en");
  }, []);

  const changeLanguage = (lang: "en" | "id") => {
    if (lang === currentLang) return;
    setCurrentLang(lang);

    const cookieVal = `/en/${lang}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    if (typeof window !== "undefined" && window.location.hostname) {
      const parts = window.location.hostname.split(".");
      if (parts.length > 1) {
        document.cookie = `googtrans=${cookieVal}; path=/; domain=.${window.location.hostname};`;
      }
    }

    const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event("change"));
    } else {
      window.location.reload();
    }
  };

  if (variant === "pill") {
    return (
      <div
        translate="no"
        className={`notranslate flex items-center p-[3px] bg-paper-deep rounded-full gap-0.5 text-xs select-none shrink-0 ${className ?? ""}`}
        aria-label="Choose Language / Pilih Bahasa"
      >
        <button
          type="button"
          translate="no"
          onClick={() => changeLanguage("en")}
          className={`notranslate px-3 py-1 rounded-full transition-all text-xs cursor-pointer ${
            currentLang === "en"
              ? "bg-white text-ink shadow-xs font-bold"
              : "text-ink-mute hover:text-ink font-semibold"
          }`}
          title="English"
        >
          EN
        </button>
        <button
          type="button"
          translate="no"
          onClick={() => changeLanguage("id")}
          className={`notranslate px-3 py-1 rounded-full transition-all text-xs cursor-pointer ${
            currentLang === "id"
              ? "bg-white text-ink shadow-xs font-bold"
              : "text-ink-mute hover:text-ink font-semibold"
          }`}
          title="Bahasa Indonesia"
        >
          ID
        </button>
      </div>
    );
  }

  return (
    <div
      translate="no"
      className={`notranslate flex items-center p-0.5 bg-paper-tint/90 backdrop-blur-xs rounded-lg border border-line text-xs font-bold shrink-0 select-none ${className ?? ""}`}
      aria-label="Choose Language / Pilih Bahasa"
    >
      <button
        type="button"
        translate="no"
        onClick={() => changeLanguage("en")}
        className={`notranslate px-2.5 py-1 rounded-md transition-all text-xs cursor-pointer ${
          currentLang === "en"
            ? "bg-ocean-700 text-white shadow-xs font-extrabold"
            : "text-ink-mute hover:text-ink font-semibold"
        }`}
        title="English"
      >
        EN
      </button>
      <button
        type="button"
        translate="no"
        onClick={() => changeLanguage("id")}
        className={`notranslate px-2.5 py-1 rounded-md transition-all text-xs cursor-pointer ${
          currentLang === "id"
            ? "bg-ocean-700 text-white shadow-xs font-extrabold"
            : "text-ink-mute hover:text-ink font-semibold"
        }`}
        title="Bahasa Indonesia"
      >
        ID
      </button>
    </div>
  );
}
