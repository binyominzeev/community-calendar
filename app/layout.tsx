import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Community Calendar",
  description: "Manage recurring Jewish community events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
