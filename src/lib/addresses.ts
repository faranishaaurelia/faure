// Tipe dan validasi alamat. Dipisah dari file "use server"
// supaya bisa dipakai di komponen client maupun server action.
//
// Catatan: kolom di database boleh null (data lama), jadi tipe Address
// memakai `string | null`. Saat menyimpan, semua kolom wajib terisi.

import { daftarKota, isProvinsi } from "./wilayah";

export type Address = {
  id: number;
  label: string | null;
  recipient_name: string | null;
  phone: string | null;
  full_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
  is_default: boolean;
};

export type AddressInput = {
  id?: number;
  label: string;
  recipient_name: string;
  phone: string;
  full_address: string;
  city: string;
  province: string;
  postal_code: string;
  notes: string;
  is_default: boolean;
};

export type AddressField =
  | "recipient_name"
  | "phone"
  | "full_address"
  | "city"
  | "province"
  | "postal_code";

// Urutan kolom di form (dipakai untuk fokus ke kolom pertama yang salah)
export const ADDRESS_FIELD_ORDER: AddressField[] = [
  "recipient_name",
  "phone",
  "full_address",
  "province",
  "city",
  "postal_code",
];

// Tipe translator dari i18n, opsional agar helper tetap bisa dipakai tanpa
// konteks bahasa.
type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export function validateAddress(
  v: AddressInput,
  t: Translate = (k) => k,
): Partial<Record<AddressField, string>> {
  const errors: Partial<Record<AddressField, string>> = {};

  if (!v.recipient_name.trim()) {
    errors.recipient_name = t("errors.recipientNameRequired");
  }

  if (!v.phone.trim()) {
    errors.phone = t("errors.phoneRequired");
  } else if (!/^(\+62|62|0)8\d{8,12}$/.test(v.phone.replace(/[\s-]/g, ""))) {
    errors.phone = t("errors.phoneInvalid");
  }

  if (!v.full_address.trim())
    errors.full_address = t("errors.fullAddressRequired");
  if (!v.province.trim()) {
    errors.province = t("errors.provinceRequired");
  } else if (!isProvinsi(v.province)) {
    errors.province = t("errors.provinceInvalid");
  }

  if (!v.city.trim()) {
    errors.city = t("errors.cityRequired");
  } else if (!daftarKota(v.province).includes(v.city)) {
    errors.city = t("errors.cityInvalid");
  }

  if (!v.postal_code.trim()) {
    errors.postal_code = t("errors.postalCodeRequired");
  } else if (!/^\d{5}$/.test(v.postal_code.trim())) {
    errors.postal_code = t("errors.postalCodeInvalid");
  }

  return errors;
}
