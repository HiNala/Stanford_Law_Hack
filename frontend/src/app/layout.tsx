import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClauseGuard — AI-Powered Contract Intelligence",
  description:
    "See risk before it sees you. Upload contracts, get instant AI-powered risk analysis with visual heatmaps and clause-level insights.",
};

// Inline script to apply theme class before first paint — prevents flash of wrong theme
const themeScript = `(function(){try{var t=localStorage.getItem('clauseguard-theme');var d=t?JSON.parse(t):null;if(d&&d.state&&d.state.theme==='light'){document.documentElement.classList.add('light')}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable} h-full`}>
      <head>
        {/* Anti-FOUC: synchronously apply saved theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
