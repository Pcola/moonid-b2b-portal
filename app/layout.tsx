import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { safeJsonLd } from "@/lib/json-ld";
import "./globals.css";

const sans = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

const DESC =
  "B2B dodávateľ hygieny, čistiacich prostriedkov, papierového programu, dávkovačov, gastro a kancelárskych potrieb — aj hotelová kozmetika a vybavenie. Vlastný rozvoz v okrese Nové Zámky a Nitrianskom kraji, faktúra so splatnosťou.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.moonid.sk"),
  title: "Moonid s.r.o. — hygiena, čistenie a vybavenie | rozvoz Nové Zámky a Nitriansky kraj",
  description: DESC,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "sk_SK",
    siteName: "Moonid s.r.o.",
    url: "https://www.moonid.sk/",
    title: "Moonid s.r.o. — hygiena, čistenie a vybavenie pre vašu prevádzku",
    description: DESC,
    images: [{ url: "/images/hero-cleaning.png", width: 1200, height: 630, alt: "Moonid — hygiena a čistenie pre prevádzky" }],
  },
};

const businessLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://www.moonid.sk/#business",
  name: "Moonid s.r.o.",
  description: DESC,
  url: "https://www.moonid.sk/",
  telephone: "+421919216908",
  email: "moonid@moonid.sk",
  priceRange: "€€",
  currenciesAccepted: "EUR",
  foundingDate: "2017",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Hlavná 39/78",
    addressLocality: "Dolný Ohaj",
    postalCode: "941 43",
    addressRegion: "okres Nové Zámky",
    addressCountry: "SK",
  },
  areaServed: { "@type": "AdministrativeArea", name: "Nitriansky kraj a okres Nové Zámky" },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "08:00", closes: "17:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Friday", opens: "08:00", closes: "14:00" },
  ],
  founder: { "@type": "Person", name: "Jozef Slobodník" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk" className={sans.variable}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(businessLd) }} />
      </body>
    </html>
  );
}
