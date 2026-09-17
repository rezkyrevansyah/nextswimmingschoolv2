"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/FormFields";
import { useUpload } from "@/hooks/useUpload";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  kind: "income" | "expense";
  name: string;
  sort_order: number;
}

export default function OwnerMasterData() {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, tNode } = useLocale();
  const { upload, uploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Head of NEXT State
  const [headName, setHeadName] = useState("Syahril Sidik");
  const [headTitle, setHeadTitle] = useState("HEAD OF NEXT SWIMMING");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [savingOwner, setSavingOwner] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [activeCatTab, setActiveCatTab] = useState<"income" | "expense">("income");
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Load Owner Settings
  const loadOwnerSettings = useCallback(async () => {
    setLoadingOwner(true);
    const { data } = await supabase
      .from("owner_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (data) {
      setHeadName(data.head_name || "Syahril Sidik");
      setHeadTitle(data.head_title || "HEAD OF NEXT SWIMMING");
      setSignatureUrl(data.head_signature_url || null);
    }
    setLoadingOwner(false);
  }, [supabase]);

  // Load Categories
  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    const { data } = await supabase
      .from("manual_transaction_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (data) {
      setCategories(data as Category[]);
    }
    setCatLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadOwnerSettings();
    loadCategories();
  }, [loadOwnerSettings, loadCategories]);

  // Save Head Info
  const handleSaveHeadInfo = async () => {
    if (!headName.trim()) {
      return toast.error(t("owner.masterData.fieldHeadName"));
    }
    setSavingOwner(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("owner_settings")
      .upsert({
        id: "default",
        head_name: headName.trim(),
        head_title: headTitle.trim() || "HEAD OF NEXT SWIMMING",
        head_signature_url: signatureUrl,
        updated_at: new Date().toISOString(),
      } as any);

    setSavingOwner(false);
    if (error) {
      toast.error(t("owner.masterData.saveHeadFailed"), error.message);
    } else {
      toast.success(t("owner.masterData.headProfileSaved"));
    }
  };

  // Upload Signature
  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload.ownerSignature(file);
      setSignatureUrl(url);
      toast.success(t("owner.masterData.headProfileSaved"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload error";
      toast.error(t("owner.masterData.saveHeadFailed"), message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove Signature
  const handleRemoveSignature = async () => {
    const ok = await confirm({
      title: t("common.actions.delete"),
      body: t("owner.masterData.headSectionSub"),
      danger: true,
    });
    if (!ok) return;

    setSignatureUrl(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase
      .from("owner_settings")
      .upsert({
        id: "default",
        head_name: headName,
        head_title: headTitle,
        head_signature_url: null,
        updated_at: new Date().toISOString(),
      } as any);
    toast.success(t("owner.masterData.headProfileSaved"));
  };

  // Add Category
  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setAddingCat(true);
    const currentList = categories.filter((c) => c.kind === activeCatTab);
    const { error } = await supabase.from("manual_transaction_categories").insert({
      kind: activeCatTab,
      name,
      sort_order: currentList.length + 1,
    });
    setAddingCat(false);
    if (error) {
      toast.error(t("owner.masterData.addCategoryFailed"), error.message);
    } else {
      setNewCatName("");
      toast.success(t("owner.masterData.categoryAdded"));
      loadCategories();
    }
  };

  // Save Edit Category
  const handleSaveEditCat = async () => {
    const name = editCatName.trim();
    if (!name || !editCatId) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("manual_transaction_categories")
      .update({ name })
      .eq("id", editCatId);
    setSavingEdit(false);
    if (error) {
      toast.error(t("owner.masterData.updateCategoryFailed"), error.message);
    } else {
      setEditCatId(null);
      toast.success(t("owner.masterData.categoryUpdated"));
      loadCategories();
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat: Category) => {
    const ok = await confirm({
      title: tNode("owner.masterData.deleteCategoryConfirm", { name: cat.name }),
      body: t("common.actions.delete"),
      danger: true,
    });
    if (!ok) return;

    const { error } = await supabase
      .from("manual_transaction_categories")
      .delete()
      .eq("id", cat.id);

    if (error) {
      toast.error(t("owner.masterData.deleteCategoryFailed"), error.message);
    } else {
      toast.success(t("owner.masterData.categoryDeleted"));
      loadCategories();
    }
  };

  const filteredCategories = categories.filter((c) => c.kind === activeCatTab);

  return (
    <div className="space-y-6">
      {/* 2-Column Responsive Layout matching pen.dev owner/master */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Transaction Categories (fill_container) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
            {/* Card Header */}
            <div className="p-5 border-b border-line">
              <h3 className="font-display font-bold text-lg text-ink leading-tight">
                Transaction categories
              </h3>
              <p className="text-xs text-ink-mute mt-1">
                One global list. Owner Financial and Manager Center Financial both read from it.
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Category Kind Tabs (Pills) */}
              <div className="flex items-center gap-1.5 p-1 bg-paper-deep rounded-full border border-line w-fit">
                <button
                  type="button"
                  onClick={() => { setActiveCatTab("income"); setEditCatId(null); }}
                  className={cn(
                    "px-4 h-[34px] rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                    activeCatTab === "income"
                      ? "bg-ocean-600 text-white shadow-xs"
                      : "text-ink-soft hover:bg-white/60"
                  )}
                >
                  <span>{t("owner.masterData.tabIncome")}</span>
                  <span className={cn("text-[11px] font-mono", activeCatTab === "income" ? "text-white/80" : "text-ink-mute")}>
                    {categories.filter(c => c.kind === "income").length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCatTab("expense"); setEditCatId(null); }}
                  className={cn(
                    "px-4 h-[34px] rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                    activeCatTab === "expense"
                      ? "bg-ocean-600 text-white shadow-xs"
                      : "text-ink-soft hover:bg-white/60"
                  )}
                >
                  <span>{t("owner.masterData.tabExpense")}</span>
                  <span className={cn("text-[11px] font-mono", activeCatTab === "expense" ? "text-white/80" : "text-ink-mute")}>
                    {categories.filter(c => c.kind === "expense").length}
                  </span>
                </button>
              </div>

              {/* Add New Category Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder={t("owner.masterData.addCategoryPlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
                  className="flex-1 h-11 px-3.5 rounded-xl border border-line bg-paper text-sm text-ink outline-none focus:border-ocean-500 transition placeholder:text-ink-faint"
                />
                <button
                  type="button"
                  disabled={!newCatName.trim() || addingCat}
                  onClick={handleAddCategory}
                  className="h-11 px-4 rounded-xl bg-ocean-600 hover:bg-ocean-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                >
                  <Icon name="plus" className="w-4 h-4" />
                  <span>{addingCat ? t("common.actions.saving") : t("common.actions.add")}</span>
                </button>
              </div>

              {/* Category List */}
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-0.5">
                {catLoading ? (
                  <div className="py-12 text-center text-ink-mute text-sm animate-pulse">Loading categories...</div>
                ) : filteredCategories.length === 0 ? (
                  <div className="py-12 text-center text-ink-mute text-sm">
                    {t("owner.masterData.noCategories")}
                  </div>
                ) : (
                  filteredCategories.map((c) => (
                    <div
                      key={c.id}
                      className="h-12 px-3.5 rounded-xl bg-paper-tint border border-line flex items-center gap-2.5 transition hover:bg-white hover:shadow-xs group"
                    >
                      <Icon name="menu" className="w-4 h-4 text-ink-faint shrink-0" />
                      {editCatId === c.id ? (
                        <>
                          <input
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="flex-1 h-8 px-2.5 rounded-lg border border-ocean-500 bg-white text-sm text-ink outline-none"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveEditCat(); }}
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEditCat}
                            disabled={savingEdit}
                            className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0 text-ok-600 cursor-pointer"
                            title={t("common.actions.save")}
                          >
                            <Icon name="check" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditCatId(null)}
                            className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0 text-ink-mute cursor-pointer"
                            title={t("common.actions.cancel")}
                          >
                            <Icon name="x" className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium text-ink truncate">
                            <NoTranslate>{c.name}</NoTranslate>
                          </span>
                          <button
                            onClick={() => { setEditCatId(c.id); setEditCatName(c.name); }}
                            className="w-7 h-7 rounded-lg text-ink-mute hover:text-ink hover:bg-white flex items-center justify-center transition cursor-pointer"
                            title={t("common.actions.edit")}
                          >
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c)}
                            className="w-7 h-7 rounded-lg text-danger-500 hover:bg-danger-50 flex items-center justify-center transition cursor-pointer"
                            title={t("common.actions.delete")}
                          >
                            <Icon name="trash" className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Head of NEXT (fixed 400px equivalent on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
            {/* Card Header */}
            <div className="p-5 border-b border-line">
              <h3 className="font-display font-bold text-lg text-ink leading-tight">
                Head of NEXT
              </h3>
              <p className="text-xs text-ink-mute mt-1">
                Name, title and signature used on report card PDFs.
              </p>
            </div>

            {loadingOwner ? (
              <div className="p-10 text-center text-ink-mute text-sm animate-pulse">Loading settings...</div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    {t("owner.masterData.fieldHeadName")}
                  </label>
                  <input
                    type="text"
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    placeholder="E.g. Syahril Sidik"
                    className="w-full h-11 px-3.5 rounded-xl border border-line bg-paper text-sm text-ink outline-none focus:border-ocean-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    {t("owner.masterData.fieldHeadTitle")}
                  </label>
                  <input
                    type="text"
                    value={headTitle}
                    onChange={(e) => setHeadTitle(e.target.value)}
                    placeholder="E.g. HEAD OF NEXT SWIMMING"
                    className="w-full h-11 px-3.5 rounded-xl border border-line bg-paper text-sm text-ink outline-none focus:border-ocean-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    {t("owner.masterData.headSigSection")}
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadSignature}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />

                  {signatureUrl ? (
                    <div className="border border-line rounded-xl p-4 bg-paper-tint flex flex-col items-center justify-center space-y-3">
                      <div className="relative w-44 h-24 bg-white rounded-lg border border-line flex items-center justify-center p-2 shadow-xs">
                        <Image
                          src={signatureUrl}
                          alt="Head of NEXT Signature"
                          fill
                          className="object-contain p-2"
                          unoptimized={signatureUrl.includes(".svg") || signatureUrl.includes("image/svg")}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 h-8 rounded-lg border border-line bg-white hover:bg-paper-deep text-xs font-semibold text-ink transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" />
                          <span>{uploading ? t("common.actions.saving") : t("owner.masterData.changeHeadSig")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveSignature}
                          className="px-3 h-8 rounded-lg text-danger-500 hover:bg-danger-50 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Icon name="trash" className="w-3.5 h-3.5" />
                          <span>{t("common.actions.delete")}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-line hover:border-ocean-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-paper-tint hover:bg-ocean-50/30"
                    >
                      <div className="w-10 h-10 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center mx-auto mb-2">
                        <Icon name="upload" className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-ink">
                        {uploading ? t("common.actions.saving") : t("owner.masterData.uploadHeadSig")}
                      </p>
                      <p className="text-xs text-ink-mute mt-1">{t("owner.masterData.headSigRecommend")}</p>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={savingOwner}
                    onClick={handleSaveHeadInfo}
                    className="w-full h-11 rounded-xl bg-ocean-600 hover:bg-ocean-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <Icon name="check" className="w-4 h-4 text-white" />
                    <span>{savingOwner ? t("owner.masterData.savingHeadBtn") : t("owner.masterData.saveHeadBtn")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
