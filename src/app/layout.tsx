import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ErrorReporter } from "@/components/layout/error-reporter";
import { NetworkStatus } from "@/components/layout/network-status";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KSM Cashier",
  description: "Encaisser. Gérer. Piloter. — la caisse d'entreprise nouvelle génération.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring">
          Aller au contenu
        </a>
        <ErrorReporter />
        <NetworkStatus />
        {children}
      </body>
    </html>
  );
}
