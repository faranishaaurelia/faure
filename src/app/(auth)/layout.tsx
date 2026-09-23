import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Link
        href="/"
        className="fixed top-6 md:top-8 z-10"
        style={{ left: "var(--site-gutter)" }}
      >
        <img src="/images/logo.png" alt="Faure" className="h-8 w-auto" />
      </Link>
      {children}
    </>
  );
}
