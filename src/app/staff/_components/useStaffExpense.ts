"use client";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import type { User } from "@supabase/supabase-js";
import type { StaffProfile } from "../_types";

export function useStaffExpense({ user, profile, onSaved }: { user: User | null; profile: StaffProfile | null; onSaved: () => void }) {
  const toast = useToast();
  const supabase = createClient();
  const { upload, uploading } = useUpload();

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    "Operasional",
    "Perlengkapan",
    "Konsumsi",
    "Lainnya",
  ]);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "Operasional",
    occurred_at: new Date().toISOString().slice(0, 10),
    proof_url: "",
    notes: "",
  });
  const [expenseProofFile, setExpenseProofFile] = useState<File | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);

  // Load expense categories from manual_transaction_categories (CRUD by Owner in Owner Panel)
  const loadExpenseCategories = useCallback(async () => {
    const { data } = await supabase
      .from("manual_transaction_categories")
      .select("name")
      .eq("kind", "expense")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (data && data.length > 0) {
      const names = data.map(c => c.name);
      setExpenseCategories(names);
      setExpenseForm(prev => ({
        ...prev,
        category: prev.category && names.includes(prev.category) ? prev.category : names[0],
      }));
    }
  }, [supabase]);

  useEffect(() => {
    if (showExpenseModal) {
      loadExpenseCategories();
    }
  }, [showExpenseModal, loadExpenseCategories]);

  // Handle Save Expense Reimburse
  const handleSaveExpense = async () => {
    if (!profile?.branch_id || !user) return toast.error("Center is not defined in your profile");
    if (!expenseForm.description.trim()) return toast.error("Expense description is required");
    const amountNum = Number(expenseForm.amount);
    if (!amountNum || amountNum <= 0) return toast.error("Expense amount is invalid");

    setSavingExpense(true);

    const { data: periodRows } = await supabase
      .from("invoice_periods")
      .select("id")
      .eq("is_open", true)
      .order("date_to", { ascending: true })
      .limit(1);
    const activePeriodId = periodRows?.[0]?.id;
    if (!activePeriodId) {
      setSavingExpense(false);
      return toast.error("Reimbursement submission is closed", "Currently there is no open submission period from management.");
    }

    let proofUrl = expenseForm.proof_url;
    if (expenseProofFile) {
      try {
        const uploaded = await upload.paymentProof(expenseProofFile, `staff-${user.id}-${Date.now()}`);
        if (uploaded) proofUrl = uploaded;
      } catch (err) {
        toast.error("Failed to upload expense receipt", err instanceof Error ? err.message : undefined);
        setSavingExpense(false);
        return;
      }
    }

    const invoiceNumber = `RB-${expenseForm.occurred_at.replace(/-/g, "").slice(0, 6)}-${user.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const bankInfo = profile.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : null;

    const chosenCategory = expenseForm.category || expenseCategories[0] || "Operasional";

    const { error } = await supabase.from("staff_reimbursements").insert({
      profile_id: user.id,
      branch_id: profile.branch_id,
      period_id: activePeriodId,
      invoice_number: invoiceNumber,
      description: `[${chosenCategory}] ${expenseForm.description.trim()}`,
      amount: amountNum,
      proof_url: proofUrl || null,
      bank_info: bankInfo,
    });

    setSavingExpense(false);
    if (error) {
      toast.error("Failed to submit reimbursement claim", error.message);
      return;
    }

    toast.success("Reimbursement claim submitted successfully", "Awaiting confirmation from Management / Owner");
    setShowExpenseModal(false);
    setExpenseForm({
      description: "",
      amount: "",
      category: expenseCategories[0] || "Operasional",
      occurred_at: new Date().toISOString().slice(0, 10),
      proof_url: "",
      notes: "",
    });
    setExpenseProofFile(null);
    onSaved();
  };

  return {
    uploading,
    showExpenseModal, setShowExpenseModal, expenseCategories, loadExpenseCategories,
    expenseForm, setExpenseForm, setExpenseProofFile, savingExpense,
    handleSaveExpense,
  };
}
