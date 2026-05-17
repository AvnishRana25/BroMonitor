import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { prisma } from "@/lib/db";
import { currentRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "BroMonitor — Class 11 progress tracker",
  description:
    "A guardian dashboard to monitor daily school and coaching progress.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BroMonitor",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await currentRole();
  const student = role ? await prisma.student.findFirst() : null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink">
        {role ? (
          <div className="min-h-screen flex flex-col">
            <AppHeader
              studentName={student?.name ?? "Bro"}
              role={role}
            />
            <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 max-w-[1400px] w-full mx-auto">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
