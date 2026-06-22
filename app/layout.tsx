import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const serif = Newsreader({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Moonid — hygiena a čistota pre prevádzky",
  description:
    "B2B dodávateľ hygieny, čistenia a vybavenia pre hotely, wellness, gastro, úrady a školy. Vlastný rozvoz, prenájom dávkovačov, dodávky na faktúru.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
