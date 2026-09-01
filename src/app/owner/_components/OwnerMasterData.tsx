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
  const { t } = useLocale();
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
    toast.success(t("common.status.active"));
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
      title: t("owner.masterData.deleteCategoryConfirm", { name: cat.name }),
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
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink">{t("owner.masterData.title")}</h2>
        <p className="text-ink-mute text-sm mt-0.5">
          {t("owner.masterData.sub")}
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Card 1: Head of NEXT Signature & Profile */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 space-y-5">
            <SectionTitle sub={t("owner.masterData.headSectionSub")}>
              {t("owner.masterData.headSectionTitle")}
            </SectionTitle>

            {loadingOwner ? (
              <div className="py-10 text-center text-ink-mute text-sm animate-pulse">{t("common.actions.saving")}</div>
            ) : (
              <div className="space-y-4">
                <Field label={t("owner.masterData.fieldHeadName")} hint="Nama penandatangan resmi di rapor">
                  <Input
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    placeholder="Contoh: Syahril Sidik"
                  />
                </Field>

                <Field label={t("owner.masterData.fieldHeadTitle")} hint="Teks jabatan di bawah nama">
                  <Input
                    value={headTitle}
                    onChange={(e) => setHeadTitle(e.target.value)}
                    placeholder="Contoh: HEAD OF NEXT SWIMMING"
                  />
                </Field>

                <Field label={t("owner.masterData.headSigSection")} hint={t("owner.masterData.headSigHint")}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadSignature}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />

                  {signatureUrl ? (
                    <div className="border border-line rounded-xl p-4 bg-paper-tint flex flex-col items-center justify-center space-y-3">
                      <div className="relative w-44 h-24 bg-white rounded-lg border border-line flex items-center justify-center p-2 shadow-sm">
                        <Image
                          src={signatureUrl}
                          alt="Head of NEXT Signature"
                          fill
                          className="object-contain p-2"
                          unoptimized={signatureUrl.includes(".svg") || signatureUrl.includes("image/svg")}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Btn
                          variant="ghost"
                          size="sm"
                          icon="edit"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading ? t("common.actions.saving") : t("owner.masterData.changeHeadSig")}
                        </Btn>
                        <Btn
                          variant="ghost"
                          size="sm"
                          icon="trash"
                          className="text-danger-500 hover:text-danger-600 hover:bg-danger-50"
                          onClick={handleRemoveSignature}
                        >
                          {t("common.actions.delete")}
                        </Btn>
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
                </Field>

                <div className="pt-2">
                  <Btn
                    variant="primary"
                    className="w-full"
                    icon="check"
                    disabled={savingOwner}
                    onClick={handleSaveHeadInfo}
                  >
                    {savingOwner ? t("owner.masterData.savingHeadBtn") : t("owner.masterData.saveHeadBtn")}
                  </Btn>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Card 2: Master Kategori Transaksi */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 space-y-5">
            <SectionTitle sub={t("owner.masterData.categoriesSub")}>
              {t("owner.masterData.categoriesTitle")}
            </SectionTitle>

            {/* Toggle Tabs */}
            <div className="flex rounded-xl bg-paper-deep p-1 gap-1">
              <button
                type="button"
                onClick={() => { setActiveCatTab("income"); setEditCatId(null); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  activeCatTab === "income"
                    ? "bg-white text-ocean-700 shadow-sm"
                    : "text-ink-mute hover:text-ink"
                }`}
              >
                {t("owner.masterData.tabIncome")}
              </button>
              <button
                type="button"
                onClick={() => { setActiveCatTab("expense"); setEditCatId(null); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  activeCatTab === "expense"
                    ? "bg-white text-ocean-700 shadow-sm"
                    : "text-ink-mute hover:text-ink"
                }`}
              >
                {t("owner.masterData.tabExpense")}
              </button>
            </div>

            {/* Add Input */}
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t("owner.masterData.addCategoryPlaceholder")}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
              />
              <Btn
                variant="primary"
                size="sm"
                icon="plus"
                disabled={!newCatName.trim() || addingCat}
                onClick={handleAddCategory}
              >
                {t("common.actions.add")}
              </Btn>
            </div>

            {/* Category List */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {catLoading ? (
                <div className="py-8 text-center text-ink-mute text-sm animate-pulse">{t("common.actions.saving")}</div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-8 text-center text-ink-mute text-sm">
                  {t("owner.masterData.noCategories")}
                </div>
              ) : (
                filteredCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-paper-tint border border-line/60 hover:border-line transition-all"
                  >
                    {editCatId === c.id ? (
                      <>
                        <Input
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="flex-1 text-sm"
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEditCat(); }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEditCat}
                          disabled={savingEdit}
                          className="w-8 h-8 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0 text-ok-600"
                          title={t("common.actions.save")}
                        >
                          <Icon name="check" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditCatId(null)}
                          className="w-8 h-8 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0 text-ink-mute"
                          title={t("common.actions.cancel")}
                        >
                          <Icon name="x" className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-semibold text-ink truncate">
                          {c.name}
                        </span>
                        <button
                          onClick={() => { setEditCatId(c.id); setEditCatName(c.name); }}
                          className="w-8 h-8 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0 text-ink-mute hover:text-ink"
                          title={t("common.actions.edit")}
                        >
                          <Icon name="edit" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c)}
                          className="w-8 h-8 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0 text-danger-500"
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
          </Card>
        </div>
      </div>
    </div>
  );
}
