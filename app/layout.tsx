import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./hackathon.css";
import "./migration.css";

export const metadata: Metadata = {
  title: "EIEC | Engineering Innovators & Entrepreneurs at UCSD",
  description: "EIEC is a student-run organization at UC San Diego turning engineering talent into entrepreneurial builders through real venture projects.",
  icons: { icon: "/EIEC%20Logo.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
