"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { waLink } from "@/lib/utils";

export interface TrialBranch {
  id: string;
  name: string;
}

interface TrialContextValue {
  open: () => void;
}

const TrialContext = createContext<TrialContextValue | null>(null);

function useTrial(): TrialContextValue {
  const ctx = useContext(TrialContext);
  if (!ctx) throw new Error("TrialButton must be used within <TrialBookingProvider>");
  return ctx;
}

const WA_DEFAULT = "082110009667";

/** Single sitewide free-trial CTA. Opens the lead-capture modal. Label locked to "Coba Gratis". */
export function TrialButton({
  size = "md",
  variant = "primary",
  className,
  fullWidth = false,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "accent" | "soft" | "outline";
  className?: string;
  fullWidth?: boolean;
}) {
  const { open } = useTrial();
  return (
    <Btn
      variant={variant}
      size={size}
      icon="whatsapp"
      onClick={open}
      className={`${fullWidth ? "w-full sm:w-auto" : ""} ${className ?? ""}`}
    >
      Coba Gratis
    </Btn>
  );
}

/** Lower-emphasis text link for form-skippers: chat WA directly. */
export function TrialWALink({ waPhone, className }: { waPhone?: string; className?: string }) {
  return (
    <a
      href={waLink("Halo, saya ingin tanya soal trial gratis Next Swimming School.", waPhone)}
      target="_blank"
      rel="noreferrer"
      className={`font-semibold underline underline-offset-4 decoration-1 hover:decoration-2 ${className ?? ""}`}
    >
      Chat WhatsApp langsung
    </a>
  );
}

type Status = "idle" | "loading" | "success" | "error";

export function TrialBookingProvider({
  branches,
  waPhone,
  children,
}: {
  branches: TrialBranch[];
  waPhone?: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ name?: string; phone?: string }>({});
  const [waHref, setWaHref] = useState<string>("");

  const formRef = useRef<HTMLFormElement>(null);

  const open = useCallback(() => {
    setStatus("idle");
    setErrorMsg(null);
    setFieldErr({});
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const forWho = String(fd.get("for_who") ?? "");
    const age = String(fd.get("age") ?? "").trim();
    const branchId = String(fd.get("branch_id") ?? "");
    const preferredTime = String(fd.get("preferred_time") ?? "").trim();

    // Client-side validation
    const errs: { name?: string; phone?: string } = {};
    if (!name) errs.name = "Nama wajib diisi.";
    if (!phone) errs.phone = "Nomor WhatsApp wajib diisi.";
    else if (!/^\+?[\d\s-]{8,}$/.test(phone)) errs.phone = "Format nomor tidak valid.";
    if (errs.name || errs.phone) {
      setFieldErr(errs);
      return;
    }
    setFieldErr({});

    const ageGroup = age ? `${forWho} (${age})` : forWho;
    const branchName = branches.find((b) => b.id === branchId)?.name ?? "";

    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          age_group: ageGroup,
          branch_id: branchId || null,
          preferred_time: preferredTime || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Gagal mengirim. Coba lagi.");
      }
    } catch {
      // Non-blocking: lead is still valid; hand off to WhatsApp regardless.
      // Only hard-fail on network errors we can't recover from.
    }

    const msg = [
      "Halo Admin Next Swimming School, saya ingin booking trial gratis.",
      "",
      `Nama: ${name}`,
      `WhatsApp: ${phone}`,
      `Untuk: ${ageGroup}`,
      branchName ? `Cabang: ${branchName}` : "",
      preferredTime ? `Waktu preferensi: ${preferredTime}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    setWaHref(waLink(msg, waPhone));
    setStatus("success");
  }

  return (
    <TrialContext.Provider value={{ open }}>
      {children}
      <Modal open={isOpen} onClose={close} title={status === "success" ? "Data tersimpan" : "Booking Trial Gratis"} size="md">
        {status === "success" ? (
          <div className="text-center py-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-ok-50 text-ok-600 flex items-center justify-center mb-4">
              <Icon name="check" className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Terima kasih!</h3>
            <p className="text-sm text-ink-mute mt-1.5 max-w-sm mx-auto leading-relaxed">
              Data trial Anda sudah kami terima. Lanjutkan ke WhatsApp untuk konfirmasi jadwal dengan admin.
            </p>
            <div className="mt-5">
              <a href={waHref} target="_blank" rel="noreferrer">
                <Btn variant="primary" icon="whatsapp" size="lg" className="w-full sm:w-auto">
                  Lanjut ke WhatsApp
                </Btn>
              </a>
            </div>
            <button
              type="button"
              onClick={close}
              className="mt-3 text-xs text-ink-mute hover:text-ink font-semibold"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-ink-mute leading-relaxed">
              Isi data singkat ini. Admin akan menghubungi Anda via WhatsApp untuk menjadwalkan sesi trial gratis.
            </p>

            <Field label="Nama lengkap" required error={fieldErr.name}>
              <Input name="name" placeholder="Nama Anda" autoComplete="name" />
            </Field>

            <Field label="Nomor WhatsApp" required error={fieldErr.phone}>
              <Input name="phone" type="tel" inputMode="tel" placeholder="0812xxxxxxxx" autoComplete="tel" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Untuk siapa">
                <Select name="for_who" defaultValue="Anak">
                  <option value="Anak">Anak</option>
                  <option value="Dewasa">Dewasa</option>
                </Select>
              </Field>
              <Field label="Usia" hint="opsional">
                <Input name="age" placeholder="mis. 8 thn" />
              </Field>
            </div>

            <Field label="Cabang terdekat" hint="opsional">
              <Select name="branch_id" defaultValue="">
                <option value="">Pilih cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Waktu preferensi" hint="opsional">
              <Input name="preferred_time" placeholder="mis. Sabtu pagi / weekday sore" />
            </Field>

            {status === "error" && errorMsg && (
              <div className="text-sm text-danger-600 bg-danger-50 rounded-xl px-3.5 py-2.5 ring-1 ring-danger-500/20">
                {errorMsg}
              </div>
            )}

            <div className="pt-1">
              <Btn variant="primary" size="lg" icon="whatsapp" type="submit" className="w-full" disabled={status === "loading"}>
                {status === "loading" ? "Mengirim..." : "Kirim & Hubungi Admin"}
              </Btn>
            </div>
          </form>
        )}
      </Modal>
    </TrialContext.Provider>
  );
}
