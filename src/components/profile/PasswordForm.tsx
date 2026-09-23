"use client";

import { useActionState, useState } from "react";
import { updatePassword } from "@/lib/actions/profile";
import { useI18n } from "@/lib/i18n";

const initialState = { error: null, success: false };

function IkonMata({ terlihat }: { terlihat: boolean }) {
  return terlihat ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.07 18.07 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordField({
  id,
  name,
  label,
  required,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
}) {
  const [terlihat, setTerlihat] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#2b2b2b] mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={terlihat ? "text" : "password"}
          name={name}
          id={id}
          required={required}
          className="w-full h-11 pl-5 pr-11 rounded-full border border-[#2f3133] bg-transparent text-sm text-[#333] focus:outline-none focus:ring-1 focus:ring-[#2f3133]"
        />
        <button
          type="button"
          onClick={() => setTerlihat((v) => !v)}
          aria-label={terlihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A9490] hover:text-[#1E1C18] transition"
        >
          <IkonMata terlihat={terlihat} />
        </button>
      </div>
    </div>
  );
}

export default function PasswordForm() {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-6 md:p-8">
      <h2 className="text-lg md:text-xl font-semibold mb-1">
        {t("account.passwordTitle")}
      </h2>
      <p className="text-sm text-[#8B8478] mb-6">
        {t("account.passwordSub")}
      </p>

      {state?.success && (
        <div className="mb-6 rounded-xl bg-[#EAF6EC] text-[#2E7D32] text-sm px-4 py-3">
          {t("account.passwordUpdated")}
        </div>
      )}
      {state?.error && (
        <div className="mb-6 rounded-xl bg-[#FBEAEA] text-[#B23B3B] text-sm px-4 py-3">
          {state.error}
        </div>
      )}

      <form action={formAction}>
        <div className="grid md:grid-cols-2 gap-5">
          <PasswordField
            id="current_password"
            name="current_password"
            label={t("account.currentPassword")}
            required
          />

          <div />

          <PasswordField
            id="password"
            name="password"
            label={t("account.newPassword")}
            required
          />

          <PasswordField
            id="password_confirmation"
            name="password_confirmation"
            label={t("account.confirmNewPassword")}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-7 h-11 px-8 bg-[#1E1C18] hover:bg-[#8b6b5a] text-white rounded-full text-sm font-semibold transition duration-300 disabled:opacity-60"
        >
          {isPending ? t("account.updatingPassword") : t("account.updatePassword")}
        </button>
      </form>
    </div>
  );
}
