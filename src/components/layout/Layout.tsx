import dynamic from "next/dynamic";
import Navbar from "./Navbar";
import WhatsAppFloatButton from "./WhatsAppFloatButton";

const Footer = dynamic(() => import("./Footer"), {
  loading: () => <div className="border-t border-border/80 bg-card py-16" />,
});

export default function Layout({
  children,
  hideWhatsAppFloat = false,
}: {
  children: React.ReactNode;
  hideWhatsAppFloat?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      {hideWhatsAppFloat ? null : <WhatsAppFloatButton />}
    </div>
  );
}
