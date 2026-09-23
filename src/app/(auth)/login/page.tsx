"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n";

const initialState = { error: null };

export default function LoginPage() {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="min-h-screen bg-[#f7f7f8] pt-[125px] pb-10">
      <div className="site-container">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* ===================== BAGIAN KIRI : FORM ===================== */}
          <div className="w-full max-w-[360px] mx-auto flex flex-col justify-center">
            <div className="text-center mb-6">
              <h1 className="text-[24px] md:text-[26px] font-bold text-[#202124]">
                {t("auth.welcome")}
              </h1>
              <p className="text-[13px] leading-relaxed text-[#2d2d2d] mt-2 max-w-[300px] mx-auto">
                {t("auth.welcomeBody")}{" "}
                <span className="font-bold">Faure</span>
              </p>
            </div>

            {state?.error && (
              <div className="mb-5 rounded-xl bg-[#FBEAEA] text-[#B23B3B] text-[13px] px-4 py-3">
                {state.error}
              </div>
            )}

            <form action={formAction}>
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-[13px] font-medium text-[#2b2b2b] mb-1"
                >
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder={t("auth.email")}
                    required
                    className="w-full h-[36px] bg-transparent border border-[#2f3133] rounded-full pl-11 pr-4 text-[13px] text-[#333] placeholder:text-[#888] focus:outline-none focus:ring-1 focus:ring-[#2f3133]"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-[#2b2b2b] mb-1"
                >
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="5" y="10" width="14" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      <circle cx="12" cy="15" r="1" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    placeholder={t("auth.password")}
                    required
                    className="w-full h-[36px] bg-transparent border border-[#2f3133] rounded-full pl-11 pr-11 text-[13px] text-[#333] placeholder:text-[#888] focus:outline-none focus:ring-1 focus:ring-[#2f3133]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#777] hover:text-[#333]"
                  >
                    {showPassword ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M2 12s3.5-7 10-7c1.6 0 3 .3 4.2.9M22 12s-1.2 2.4-3.4 4.3M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                        <path d="M2 2l20 20" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-[36px] bg-[#303030] hover:bg-[#8b6b5a] text-white rounded-full text-[13px] font-semibold transition duration-300 disabled:opacity-60"
              >
                {isPending ? t("auth.processing") : t("auth.login")}
              </button>
            </form>

            <div className="flex items-center gap-3 mt-6 mb-5">
              <div className="flex-1 h-[1px] bg-[#bfc1c4]" />
              <span className="text-[11px] text-[#777] whitespace-nowrap">
                {t("auth.orLoginWith")}
              </span>
              <div className="flex-1 h-[1px] bg-[#bfc1c4]" />
            </div>

            <div className="flex justify-center items-center gap-4">
              <button
                type="button"
                aria-label={t("auth.google")}
                className="w-[44px] h-[44px] rounded-full bg-[#303030] text-white flex items-center justify-center hover:bg-[#8b6b5a] transition duration-300"
              >
                <span className="text-[20px] font-bold">G</span>
              </button>
              <button
                type="button"
                aria-label={t("auth.facebook")}
                className="w-[44px] h-[44px] rounded-full bg-[#303030] text-white flex items-center justify-center hover:bg-[#8b6b5a] transition duration-300"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22 12a10 10 0 1 0-11.6 9.88v-6.99H7.9V12h2.5V9.8c0-2.47 1.47-3.84 3.72-3.84 1.08 0 2.2.19 2.2.19v2.43h-1.24c-1.22 0-1.6.76-1.6 1.54V12h2.72l-.44 2.89h-2.28v6.99A10 10 0 0 0 22 12Z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={t("auth.apple")}
                className="w-[44px] h-[44px] rounded-full bg-[#303030] text-white flex items-center justify-center hover:bg-[#8b6b5a] transition duration-300"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.36 1.43c.1 1-.28 1.98-.9 2.7-.63.73-1.66 1.3-2.66 1.22-.12-.97.34-1.98.94-2.65.66-.75 1.8-1.3 2.62-1.27ZM20.6 17.2c-.4.92-.6 1.33-1.12 2.14-.72 1.13-1.74 2.54-3 2.55-1.12.02-1.4-.73-2.92-.72-1.52 0-1.83.73-2.96.71-1.26-.02-2.22-1.28-2.94-2.4-2.02-3.1-2.23-6.75-.98-8.7.88-1.38 2.28-2.2 3.6-2.2 1.34 0 2.18.74 3.3.74 1.08 0 1.73-.74 3.3-.74 1.17 0 2.41.64 3.3 1.74-2.9 1.6-2.43 5.75.42 6.88Z" />
                </svg>
              </button>
            </div>

            <p className="text-center text-[12px] text-[#333] mt-6">
              {t("auth.noAccount")}{" "}
              <Link
                href="/register"
                className="text-[#8b6b5a] hover:underline font-medium"
              >
                {t("auth.createNow")}
              </Link>
            </p>
          </div>

          {/* ===================== BAGIAN KANAN : ILUSTRASI ===================== */}
          <div className="hidden md:flex md:justify-center">
            <div className="bg-[#f5e9df] rounded-[28px] w-full max-w-[360px] h-[520px] flex flex-col items-center justify-between px-8 py-8">
              <div />
              <img
                src="/images/gambarlogin.png"
                alt="Ilustrasi Faure"
                className="w-full max-w-[300px] object-contain my-auto"
              />
              <div className="flex flex-col items-center">
                <div className="flex justify-center items-center gap-1.5 mb-4">
                  <span className="w-4 h-1.5 rounded-full bg-[#444]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c5c5c5]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c5c5c5]" />
                </div>
                <p className="text-center text-[13px] leading-[1.5] text-[#3a3a3a] max-w-[260px]">
                  {t("auth.sideQuote")}{" "}
                  <span className="font-semibold">Faure</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
