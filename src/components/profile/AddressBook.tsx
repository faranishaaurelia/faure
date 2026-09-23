"use client";

import { useState, useTransition } from "react";
import {
  deleteAddress,
  saveAddress,
  setDefaultAddress,
} from "@/lib/actions/address";
import SearchSelect from "@/components/profile/SearchSelect";
import { useI18n } from "@/lib/i18n";
import { DAFTAR_PROVINSI, daftarKota } from "@/lib/wilayah";
import {
  ADDRESS_FIELD_ORDER,
  validateAddress,
  type Address,
  type AddressField,
  type AddressInput,
} from "@/lib/addresses";

// =====================================================
// HELPER
// =====================================================

const inputClass = (error?: string) => `
  w-full rounded-xl border bg-white px-4 text-sm text-[#1E1C18]
  placeholder:text-[#B5AEA2] transition
  focus:outline-none focus:border-[#1E1C18] focus:ring-1 focus:ring-[#1E1C18]
  ${error ? "border-[#B3261E]" : "border-[#E7E5E0]"}
`;

function alamatKosong(nama: string, hp: string): AddressInput {
  return {
    label: "",
    recipient_name: nama,
    phone: hp,
    full_address: "",
    city: "",
    province: "",
    postal_code: "",
    notes: "",
    is_default: false,
  };
}

function dariAlamat(a: Address): AddressInput {
  return {
    id: a.id,
    label: a.label ?? "",
    recipient_name: a.recipient_name ?? "",
    phone: a.phone ?? "",
    full_address: a.full_address ?? "",
    city: a.city ?? "",
    province: a.province ?? "",
    postal_code: a.postal_code ?? "",
    notes: a.notes ?? "",
    is_default: a.is_default,
  };
}

// =====================================================
// FIELD
// =====================================================

function Field({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
  autoComplete,
  optional,
  optionalLabel,
  multiline,
  full,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel";
  autoComplete?: string;
  optional?: boolean;
  optionalLabel?: string;
  multiline?: boolean;
  full?: boolean;
}) {
  const id = `addr-${name}`;

  const common = {
    id,
    name,
    value,
    placeholder,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };

  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="block text-xs text-[#6B655A] mb-2">
        {label}
        {optional && optionalLabel && (
          <span className="text-[#B5AEA2]"> ({optionalLabel})</span>
        )}
      </label>

      {multiline ? (
        <textarea
          {...common}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass(error)} py-3 resize-none`}
        />
      ) : (
        <input
          {...common}
          type="text"
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass(error)} h-11`}
        />
      )}

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-[#B3261E]">
          {error}
        </p>
      )}
    </div>
  );
}

// =====================================================
// FORM TAMBAH / UBAH
// =====================================================

function AddressForm({
  awal,
  kunciUtama,
  petunjukUtama,
  onBatal,
  onSelesai,
}: {
  awal: AddressInput;
  kunciUtama: boolean;
  petunjukUtama?: string;
  onBatal: () => void;
  onSelesai: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<AddressInput>(awal);
  const [errors, setErrors] = useState<Partial<Record<AddressField, string>>>(
    {},
  );
  const [errorServer, setErrorServer] = useState("");
  const [pending, startTransition] = useTransition();

  function ubah<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors && errors[key as AddressField]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  // Ganti provinsi -> kota direset kalau tidak ada di provinsi baru
  function ubahProvinsi(provinsi: string) {
    setForm((prev) => ({
      ...prev,
      province: provinsi,
      city: daftarKota(provinsi).includes(prev.city) ? prev.city : "",
    }));
    setErrors((prev) => ({ ...prev, province: undefined, city: undefined }));
  }

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    const hasil = validateAddress(form, t);
    setErrors(hasil);

    const pertama = ADDRESS_FIELD_ORDER.find((k) => hasil[k]);
    if (pertama) {
      document.getElementById(`addr-${pertama}`)?.focus();
      return;
    }

    setErrorServer("");
    startTransition(async () => {
      const res = await saveAddress(form);
      if (res.ok) onSelesai();
      else setErrorServer(res.error);
    });
  }

  return (
    <form
      onSubmit={kirim}
      noValidate
      className="rounded-2xl border border-[#E7E5E0] bg-[#FAFAF8] p-5 md:p-6"
    >
      <h3 className="text-sm font-semibold mb-5">
        {awal.id ? t("account.editAddress") : t("account.newAddress")}
      </h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label={t("account.recipientName")}
          name="recipient_name"
          value={form.recipient_name}
          onChange={(v) => ubah("recipient_name", v)}
          error={errors.recipient_name}
          autoComplete="off"
          placeholder={t("account.recipientNamePlaceholder")}
        />

        <Field
          label={t("account.recipientPhone")}
          name="phone"
          value={form.phone}
          onChange={(v) => ubah("phone", v)}
          error={errors.phone}
          inputMode="tel"
          autoComplete="off"
          placeholder="081234567890"
        />

        <Field
          full
          multiline
          label={t("account.fullAddress")}
          name="full_address"
          value={form.full_address}
          onChange={(v) => ubah("full_address", v)}
          error={errors.full_address}
          placeholder={t("account.fullAddressPlaceholder")}
        />

        <SearchSelect
          id="addr-province"
          label={t("account.province")}
          value={form.province}
          onChange={ubahProvinsi}
          options={DAFTAR_PROVINSI}
          placeholder={t("account.provincePlaceholder")}
          error={errors.province}
        />

        <SearchSelect
          id="addr-city"
          label={t("account.city")}
          value={form.city}
          onChange={(v) => ubah("city", v)}
          options={daftarKota(form.province)}
          placeholder={t("account.cityPlaceholder")}
          disabled={!form.province}
          disabledText={t("account.selectProvinceFirst")}
          error={errors.city}
        />

        <Field
          label={t("account.postalCode")}
          name="postal_code"
          value={form.postal_code}
          onChange={(v) => ubah("postal_code", v)}
          error={errors.postal_code}
          inputMode="numeric"
          placeholder="65314"
        />

        <Field
          optional
          optionalLabel={t("account.optional")}
          label={t("account.addressLabel")}
          name="label"
          value={form.label}
          onChange={(v) => ubah("label", v)}
          placeholder={t("account.addressLabelPlaceholder")}
        />

        <Field
          full
          multiline
          optional
          optionalLabel={t("account.optional")}
          label={t("account.courierNotes")}
          name="notes"
          value={form.notes}
          onChange={(v) => ubah("notes", v)}
          placeholder={t("account.courierNotesPlaceholder")}
        />
      </div>

      <label
        className={`mt-5 flex items-center gap-3 text-sm ${
          kunciUtama ? "cursor-default" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={form.is_default}
          disabled={kunciUtama}
          onChange={(e) => ubah("is_default", e.target.checked)}
          className="w-4 h-4 accent-[#1E1C18]"
        />
        {t("account.setAsDefault")}
      </label>

      {kunciUtama && petunjukUtama && (
        <p className="mt-1.5 ml-7 text-xs text-[#8B8478]">{petunjukUtama}</p>
      )}

      {errorServer && (
        <p role="alert" className="mt-4 text-xs text-[#B3261E]">
          {errorServer}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 px-6 rounded-full bg-[#1E1C18] text-white text-sm font-medium hover:bg-[#35322B] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? t("account.savingChanges") : t("account.saveAddress")}
        </button>

        <button
          type="button"
          onClick={onBatal}
          disabled={pending}
          className="h-11 px-6 rounded-full border border-[#E7E5E0] bg-white text-sm hover:border-[#1E1C18] transition disabled:opacity-60"
        >
          {t("account.cancel")}
        </button>
      </div>
    </form>
  );
}

// =====================================================
// DAFTAR ALAMAT
// =====================================================

type Mode =
  | { type: "idle" }
  | { type: "baru" }
  | { type: "ubah"; alamat: Address };

export default function AddressBook({
  addresses,
  defaultName,
  defaultPhone,
}: {
  addresses: Address[];
  defaultName: string;
  defaultPhone: string;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>({ type: "idle" });
  const [hapusId, setHapusId] = useState<number | null>(null);
  const [pesan, setPesan] = useState("");
  const [pending, startTransition] = useTransition();

  const formTerbuka = mode.type !== "idle";

  function jalankan(aksi: () => Promise<{ ok: boolean; error?: string }>) {
    setPesan("");
    startTransition(async () => {
      const res = await aksi();
      if (!res.ok) setPesan(res.error ?? t("errors.genericShort"));
      setHapusId(null);
    });
  }

  return (
    <section
      id="alamat"
      className="bg-white rounded-[24px] border border-black/5 shadow-sm p-6 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold">{t("account.addressTitle")}</h2>
          <p className="mt-1 text-sm text-[#8B8478]">
            {t("account.addressSub")}
          </p>
        </div>

        {!formTerbuka && addresses.length > 0 && (
          <button
            type="button"
            onClick={() => setMode({ type: "baru" })}
            className="h-10 px-5 rounded-full bg-[#1E1C18] text-white text-sm font-medium hover:bg-[#35322B] transition"
          >
            {t("account.addAddress")}
          </button>
        )}
      </div>

      {pesan && (
        <p role="alert" className="mb-4 text-sm text-[#B3261E]">
          {pesan}
        </p>
      )}

      <div className="space-y-4">
        {/* FORM ALAMAT BARU */}
        {mode.type === "baru" && (
          <AddressForm
            key="baru"
            awal={alamatKosong(defaultName, defaultPhone)}
            kunciUtama={addresses.length === 0}
            petunjukUtama={t("account.firstAddressHint")}
            onBatal={() => setMode({ type: "idle" })}
            onSelesai={() => setMode({ type: "idle" })}
          />
        )}

        {/* KOSONG */}
        {addresses.length === 0 && mode.type === "idle" && (
          <div className="rounded-2xl border border-dashed border-[#E7E5E0] px-6 py-10 text-center">
            <p className="text-sm font-medium">{t("account.noAddress")}</p>
            <p className="mt-1 text-sm text-[#8B8478]">
              {t("account.noAddressSub")}
            </p>

            <button
              type="button"
              onClick={() => setMode({ type: "baru" })}
              className="mt-5 h-10 px-5 rounded-full bg-[#1E1C18] text-white text-sm font-medium hover:bg-[#35322B] transition"
            >
              {t("account.addAddress")}
            </button>
          </div>
        )}

        {/* LIST */}
        {addresses.map((a) => {
          // Mode ubah: kartu diganti form
          if (mode.type === "ubah" && mode.alamat.id === a.id) {
            return (
              <AddressForm
                key={`ubah-${a.id}`}
                awal={dariAlamat(a)}
                kunciUtama={a.is_default}
                petunjukUtama={t("account.defaultAddressHint")}
                onBatal={() => setMode({ type: "idle" })}
                onSelesai={() => setMode({ type: "idle" })}
              />
            );
          }

          return (
            <article
              key={a.id}
              className={`rounded-2xl border p-5 transition ${
                a.is_default ? "border-[#1E1C18]" : "border-[#E7E5E0]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {a.label && (
                  <span className="text-xs font-semibold">{a.label}</span>
                )}

                {a.is_default && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1E1C18] text-white text-[10px]">
                    {t("account.defaultAddress")}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm font-medium">{a.recipient_name}</p>
              <p className="text-xs text-[#8B8478]">{a.phone}</p>

              <p className="mt-3 text-sm leading-6 text-[#4A463F]">
                {a.full_address}
              </p>
              <p className="text-sm text-[#4A463F]">
                {[a.city, a.province].filter(Boolean).join(", ")}{" "}
                {a.postal_code}
              </p>

              {a.notes && (
                <p className="mt-2 text-xs text-[#8B8478]">
                  {t("account.notes", { notes: a.notes })}
                </p>
              )}

              {/* AKSI */}
              <div className="mt-4 pt-4 border-t border-[#EFEDE8] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                {hapusId === a.id ? (
                  <>
                    <span className="text-[#6B655A]">
                      {t("account.deleteConfirm")}
                    </span>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => jalankan(() => deleteAddress(a.id))}
                      className="font-medium text-[#B3261E] hover:underline disabled:opacity-60"
                    >
                      {pending
                        ? t("account.deleting")
                        : t("account.yesDelete")}
                    </button>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setHapusId(null)}
                      className="text-[#6B655A] hover:text-[#1E1C18] transition"
                    >
                      {t("account.cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={formTerbuka}
                      onClick={() => setMode({ type: "ubah", alamat: a })}
                      className="font-medium hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      {t("account.edit")}
                    </button>

                    <button
                      type="button"
                      disabled={formTerbuka}
                      onClick={() => setHapusId(a.id)}
                      className="text-[#6B655A] hover:text-[#B3261E] transition disabled:opacity-40"
                    >
                      {t("account.delete")}
                    </button>

                    {!a.is_default && (
                      <button
                        type="button"
                        disabled={formTerbuka || pending}
                        onClick={() => jalankan(() => setDefaultAddress(a.id))}
                        className="text-[#6B655A] hover:text-[#1E1C18] transition disabled:opacity-40"
                      >
                        {t("account.setAsDefault")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
