import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import {
  HeroSection,
  BrandsSection,
  SortimentSection,
  DavkovaceSection,
  PortalSection,
  FaqSection,
  CtaBand,
} from "@/components/site/sections";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <HeroSection />
        <SortimentSection />
        <DavkovaceSection />
        <PortalSection />
        <FaqSection />
        <CtaBand />
        <BrandsSection />
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
