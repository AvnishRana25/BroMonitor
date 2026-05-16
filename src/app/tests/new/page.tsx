import { prisma } from "@/lib/db";
import { toDateInputValue } from "@/lib/utils";
import { TestForm } from "./TestForm";

export default async function NewTestPage({
  searchParams,
}: {
  searchParams: { upcoming?: string };
}) {
  const [subjects, upcoming] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    searchParams.upcoming
      ? prisma.upcomingTest.findUnique({
          where: { id: searchParams.upcoming },
          include: { subjects: true },
        })
      : Promise.resolve(null),
  ]);

  const prefill = upcoming
    ? {
        name: upcoming.name,
        date: toDateInputValue(upcoming.date),
        type: upcoming.type,
        maxMarksPerSubject: upcoming.maxMarks
          ? upcoming.maxMarks / Math.max(upcoming.subjects.length, 1)
          : null,
        subjectIds: upcoming.subjects.map((s) => s.subjectId),
      }
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      <TestForm
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          short: s.short,
          color: s.color,
        }))}
        prefill={prefill}
      />
    </div>
  );
}
