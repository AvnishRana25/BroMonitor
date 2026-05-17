import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { prisma } from "@/lib/db";
import { currentRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "BroMonitor — Class 11 progress tracker",
  description:
    "A guardian dashboard to monitor daily school and coaching progress.",
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
          <div className="flex min-h-screen">
            <Sidebar role={role} />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar studentName={student?.name ?? "Bro"} role={role} />
              <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 pb-24 md:pb-6 max-w-[1400px] w-full mx-auto">
                {children}
              </main>
            </div>
            <MobileBottomNav role={role} />
          </div>
        ) : (
          // Unauthenticated routes (only /unlock) render full-bleed.
          children
        )}
      </body>
    </html>
  );
}
