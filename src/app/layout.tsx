import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";

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
  const student = await prisma.student.findFirst();

  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar studentName={student?.name ?? "Bro"} />
            <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 max-w-[1400px] w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
