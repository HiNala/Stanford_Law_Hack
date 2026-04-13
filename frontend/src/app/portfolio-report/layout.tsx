import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Risk Report",
};

export default function PortfolioReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
