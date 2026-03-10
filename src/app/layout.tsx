import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import ModalContainer from "@/components/ModalContainer";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Minimalist, Local-First Expense Management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Expense Tracker",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable}`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased font-display text-slate-900 min-h-screen flex flex-col bg-background-light"
        suppressHydrationWarning={true}
      >
        <DatabaseProvider>
          <ThemeProvider>
            {children}
            <BottomNav />
            <ModalContainer />
          </ThemeProvider>
        </DatabaseProvider>
      </body>
    </html>
  );
}
