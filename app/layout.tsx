import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, Nova_Mono, Ubuntu } from "next/font/google";
import "./globals.css";
import "./migration.css";

// display face. Archivo is a variable font with a width axis; --display-stretch in globals.css sets how wide.
const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display", display: "swap" });
const ubuntu = Ubuntu({ subsets: ["latin"], weight: ["300", "400", "500", "700"], style: ["normal", "italic"], variable: "--font-ubuntu", display: "swap" });
const novaMono = Nova_Mono({ subsets: ["latin"], weight: "400", variable: "--font-nova-mono", display: "swap" });

export const metadata: Metadata = {
  title: "EIEC | Engineering Innovators & Entrepreneurs at UCSD",
  description: "EIEC is a student-run organization at UC San Diego where engineering students start and build real ventures.",
  icons: { icon: "/EIEC%20Logo.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${display.variable} ${ubuntu.variable} ${novaMono.variable}`}><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
