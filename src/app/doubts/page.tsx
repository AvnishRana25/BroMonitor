import { prisma } from "@/lib/db";
import { DoubtsView } from "./DoubtsView";

export default async function DoubtsPage() {
  const [subjects, doubts] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.doubt.findMany({
      orderBy: [{ status: "asc" }, { raisedAt: "desc" }],
      include: { subject: true },
    }),
  ]);

  return (
    <DoubtsView
      subjects={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        short: s.short,
        color: s.color,
      }))}
      doubts={doubts.map((d) => ({
        id: d.id,
        question: d.question,
        chapter: d.chapter,
        topic: d.topic,
        status: d.status,
        raisedAt: d.raisedAt.toISOString(),
        resolvedAt: d.resolvedAt?.toISOString() ?? null,
        resolvedBy: d.resolvedBy,
        subject: {
          id: d.subject.id,
          short: d.subject.short,
          color: d.subject.color,
        },
      }))}
    />
  );
}
