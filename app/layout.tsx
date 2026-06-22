import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moonid B2B portál",
  description: "Objednávkový portál Moonid s.r.o.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
