import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "./pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Suits",
    template: "%s | Suits",
  },
  description: "Sistema de gestão Suits com suporte a instalação como PWA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Suits",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2740",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-lg overflow-x-hidden">
        <PwaRegister />
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/90 shadow-lg md:hidden">
          <img src="/logo.png" alt="Suits" className="h-8 w-auto object-contain" />
        </div>
        {children}
      </body>
    </html>
  );
}
