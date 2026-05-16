import { prisma } from "@/lib/db";
import { parseLocalDate, startOfDay, toDateInputValue } from "@/lib/utils";
import { DailyLogForm } from "./DailyLogForm";

export default async function NewDailyLogPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const date = searchParams.date
    ? startOfDay(parseLocalDate(searchParams.date))
    : startOfDay(new Date());

  const [subjects, existing] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: { chapters: { orderBy: { order: "asc" } } },
    }),
    prisma.dailyLog.findUnique({
      where: { date },
      include: { entries: true },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <DailyLogForm
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          short: s.short,
          color: s.color,
          chapters: s.chapters.map((c) => ({ id: c.id, name: c.name })),
        }))}
        defaultDate={toDateInputValue(date)}
        existing={
          existing
            ? {
                schoolHours: existing.schoolHours,
                coachingHours: existing.coachingHours,
                selfStudyHours: existing.selfStudyHours,
                notes: existing.notes,
                entries: existing.entries.map((e) => ({
                  subjectId: e.subjectId,
                  chapterId: e.chapterId,
                  source: e.source,
                  subTopic: e.subTopic,
                  problemsSolved: e.problemsSolved,
                  homeworkDone: e.homeworkDone,
                  notes: e.notes,
                })),
              }
            : null
        }
      />
    </div>
  );
}
