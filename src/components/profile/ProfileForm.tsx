"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { useI18n } from "@/lib/i18n";

const initialState = { error: null, success: false };

export default function ProfileForm({
  name,
  email,
  phone,
  alamat,
}: {
  name: string;
  email: string;
  phone: string;
  alamat: string;
}) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-6 md:p-8">
      <h2 className="text-lg md:text-xl font-semibold mb-1">
        {t("account.infoTitle")}
      </h2>
      <p className="text-sm text-[#8B8478] mb-6">
        {t("account.infoSub")}
      </p>

      {state?.success && (
        <div className="mb-6 rounded-xl bg-[#EAF6EC] text-[#2E7D32] text-sm px-4 py-3">
          {t("account.profileUpdated")}
        </div>
      )}
      {state?.error && (
        <div className="mb-6 rounded-xl bg-[#FBEAEA] text-[#B23B3B] text-sm px-4 py-3">
          {state.error}
        </div>
      )}

      <form action={formAction}>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[#2b2b2b] mb-1"
            >
              {t("account.fullName")}
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={name}
              className="w-full h-11 px-5 rounded-full border border-[#2f3133] bg-transparent text-sm text-[#333] focus:outline-none focus:ring-1 focus:ring-[#2f3133]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#2b2b2b] mb-1"
            >
              {t("account.emailAddress")}
            </label>
            <input
              type="email"
              name="email"
              id="email"
              defaultValue={email}
              className="w-full h-11 px-5 rounded-full border border-[#2f3133] bg-transparent text-sm text-[#333] focus:outline-none focus:ring-1 focus:ring-[#2f3133]"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-[#2b2b2b] mb-1"
            >
              {t("account.phone")}
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              placeholder="08xxxxxxxxxx"
              defaultValue={phone}
              className="w-full h-11 px-5 rounded-full border border-[#2f3133] bg-transparent text-sm text-[#333] placeholder:text-[#888] focus:outline-none focus:ring-1 focus:ring-[#2f3133]"
            />
          </div>

          <div>
            <label
              htmlFor="alamat"
              className="block text-sm font-medium text-[#2b2b2b] mb-1"
            >
              {t("account.shippingAddress")}
            </label>
            <input
              type="text"
              name="alamat"
              id="alamat"
              placeholder="Jl. Contoh No. 123"
              defaultValue={alamat}
              className="w-full h-11 px-5 rounded-full border border-[#2f3133] bg-transparent text-sm text-[#333] placeholder:text-[#888] focus:outline-none focus:ring-1 focus:ring-[#2f3133]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-7 h-11 px-8 bg-[#1E1C18] hover:bg-[#8b6b5a] text-white rounded-full text-sm font-semibold transition duration-300 disabled:opacity-60"
        >
          {isPending ? t("account.savingChanges") : t("account.saveChanges")}
        </button>
      </form>
    </div>
  );
}
