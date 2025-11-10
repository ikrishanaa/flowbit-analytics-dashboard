import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSummary from "@/components/AuthSummary";
import SidebarNav from "@/components/SidebarNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flowbit Analytics",
  description: "Analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}> 
        <div className="min-h-screen flex bg-zinc-50">
          <aside className="w-64 border-r bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/70 flex flex-col">
            <div className="p-4 border-b">
              <div className="font-semibold text-zinc-900">Flowbit AI</div>
            </div>
            <SidebarNav />
            <div className="mt-auto p-4 border-t">
              <AuthSummary />
            </div>
          </aside>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
