import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import {
  HeroSection,
  BrandsSection,
  SortimentSection,
  DavkovaceSection,
  PortalSection,
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
        <CtaBand />
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
