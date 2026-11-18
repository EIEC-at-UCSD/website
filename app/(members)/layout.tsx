import type { ReactNode } from "react";
import { Navigation, Footer } from "@/components/navigation";
import "@/app/attendance.css";

export default function MemberLayout({ children }: { children: ReactNode }) {
  return <><Navigation /><main id="main-content" tabIndex={-1}>{children}</main><Footer /></>;
}
