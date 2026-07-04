import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { safeJsonLd } from "@/lib/json-ld";
import {
  HeroSection,
  BrandsSection,
  SortimentSection,
  DavkovaceSection,
  PortalSection,
  FaqSection,
  faqLd,
  CtaBand,
} from "@/components/site/sections";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <HeroSection />
        <BrandsSection />
        <SortimentSection />
        <DavkovaceSection />
        <PortalSection />
        <FaqSection />
        <CtaBand />
      </main>
      <SiteFooter />
      <CookieBanner />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />
    </>
  );
}
