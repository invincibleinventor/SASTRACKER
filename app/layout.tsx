import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";



export const metadata: Metadata = {
  title: "SASTRACKER - The Missing Search Engine For PyQs",
  description: "A Database of PyQs for SASTRA Students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`lg:pb-20 pb-10 min-h-screen bg-neutral-950 space-mono-regular`}
      >
  <Nav></Nav>
        {children}
      </body>
    </html>
  );
}
export const dynamic = "force-dynamic";