import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div
        className="relative z-0 min-w-0 overflow-x-hidden"
        style={{ position: "relative", zIndex: 1, isolation: "isolate" }}
      >
        {children}
      </div>
      <Footer />
    </>
  );
}
