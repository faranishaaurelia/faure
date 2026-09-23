import type { ReactNode } from "react";

export default function AdminPageHeader({
  kicker = "Faure Admin",
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#9A7B69] font-semibold mb-2">
          {kicker}
        </p>
        <h1 className="font-serif text-[32px] leading-none tracking-[-0.03em] text-[#1E1C18]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-[#716A63] max-w-xl">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
