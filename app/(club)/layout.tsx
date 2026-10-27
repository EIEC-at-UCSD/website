import type { ReactNode } from "react";
import { Navigation, Footer } from "@/components/navigation";
import { Effects } from "@/components/effects";

export default function ClubLayout({ children }: { children: ReactNode }) {
  return <>
    <div className="scanline-overlay" aria-hidden="true" />
    <canvas id="global-particles" aria-hidden="true" />
    <Effects mode="background" />
    <Navigation />
    <main id="main-content" tabIndex={-1}>{children}</main>
    <Footer />
  </>;
}
