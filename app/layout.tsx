import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Moonid s.r.o. — hygiena, čistenie a vybavenie pre vašu prevádzku",
  description:
    "B2B dodávateľ hygieny, čistiacich prostriedkov, papierového programu, dávkovačov, gastro a kancelárskych potrieb — aj hotelová kozmetika a vybavenie. Jeden dodávateľ, vlastný rozvoz, faktúra so splatnosťou.",
  metadataBase: new URL("https://www.moonid.sk"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
