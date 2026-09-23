import type { Tone } from "@/lib/orders";

const TONE: Record<Tone, string> = {
  kuning: "bg-[#FFF4DB] text-[#8A5A00]",
  biru: "bg-[#E8F0FB] text-[#1F4E8C]",
  hijau: "bg-[#E6F4EA] text-[#1E6B3A]",
  merah: "bg-[#FCE8E6] text-[#B3261E]",
  abu: "bg-[#F3F1EC] text-[#6B655A]",
};

export default function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap ${TONE[tone]}`}
    >
      {label}
    </span>
  );
}
