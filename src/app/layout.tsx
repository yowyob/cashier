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
        <ErrorReporter />
        <NetworkStatus />
        {children}
      </body>
    </html>
  );
}
