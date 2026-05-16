import { prisma } from "@/lib/db";
import { SubjectsView } from "./SubjectsView";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: { s?: string };
}) {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          topics: { orderBy: { name: "asc" } },
        },
      },
    },
  });

  return (
    <SubjectsView
      subjects={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        short: s.short,
        color: s.color,
        chapters: s.chapters.map((c) => ({
          id: c.id,
          name: c.name,
          order: c.order,
          topics: c.topics.map((t) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            confidence: t.confidence,
            problemsSolved: t.problemsSolved,
          })),
        })),
      }))}
      initialSubjectId={searchParams.s}
    />
  );
}
