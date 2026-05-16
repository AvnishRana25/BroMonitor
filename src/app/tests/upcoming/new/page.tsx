import { prisma } from "@/lib/db";
import { UpcomingTestForm } from "./UpcomingTestForm";

export default async function NewUpcomingTestPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: { chapters: { orderBy: { order: "asc" } } },
  });
  return (
    <div className="max-w-3xl mx-auto">
      <UpcomingTestForm
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          short: s.short,
          color: s.color,
          chapters: s.chapters.map((c) => ({ id: c.id, name: c.name })),
        }))}
      />
    </div>
  );
}
