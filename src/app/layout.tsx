import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import ModalContainer from "@/components/ModalContainer";
import { PageTransition } from "@/components/PageTransition";
import OrientationLock from "@/components/OrientationLock";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Flux — Smart Personal Finance",
  description: "Minimalist, Local-First Personal Finance & Expense Tracker",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/flux-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/flux-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/icons/flux-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flux",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
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
    <html lang="en" className={`${manrope.variable} dark bg-slate-50 dark:bg-[#141414]`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('expense-app-storage')||localStorage.getItem('flux-app-store');var p=raw?JSON.parse(raw):null;var t=(p&&p.state&&p.state.theme)||'dark';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var isDark=t==='dark'||(t==='system'&&d);if(isDark){document.documentElement.classList.add('dark');document.documentElement.style.backgroundColor='#141414';}else{document.documentElement.classList.remove('dark');document.documentElement.style.backgroundColor='#f8fafc';}}catch(e){}})();`,
          }}
        />
        <link rel="apple-touch-icon" href="/icons/flux-180.png" />
        {process.env.NODE_ENV === "development" && (
          <script dangerouslySetInnerHTML={{ __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
            }
          `}} />
        )}
        <link
          rel="preload"
          href="/fonts/material-symbols-outlined.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));` }} />
      </head>
      <body
        className="antialiased font-display text-slate-900 dark:text-[#E3E3E3] min-h-screen flex flex-col bg-slate-50 dark:bg-[#141414]"
        suppressHydrationWarning={true}
      >
        <OrientationLock />
        <ThemeProvider>
          <DatabaseProvider>
            <PageTransition>
              {children}
            </PageTransition>
            <BottomNav />
            <ModalContainer />
          </DatabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
