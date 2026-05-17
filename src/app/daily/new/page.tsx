import { prisma } from "@/lib/db";
import { parseLocalDate, startOfDay, toDateInputValue } from "@/lib/utils";
import { DailyLogForm } from "./DailyLogForm";
import { currentRole, can } from "@/lib/session";
import { photoUrl } from "@/lib/photos";

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
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: { topics: { orderBy: { name: "asc" } } },
        },
      },
    }),
    prisma.dailyLog.findUnique({
      where: { date },
      include: {
        entries: { include: { topic: { select: { id: true, name: true } } } },
        reflection: true,
        photos: true,
      },
    }),
  ]);

  const role = await currentRole();
  const canUpload = can(role, "evidence:upload");
  const canDeletePhotos = can(role, "evidence:delete");

  return (
    <div className="max-w-3xl mx-auto w-full">
      <DailyLogForm
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          short: s.short,
          color: s.color,
          chapters: s.chapters.map((c) => ({
            id: c.id,
            name: c.name,
            topics: c.topics.map((t) => ({ id: t.id, name: t.name })),
          })),
        }))}
        defaultDate={toDateInputValue(date)}
        existing={
          existing
            ? {
                schoolHours: existing.schoolHours,
                coachingHours: existing.coachingHours,
                selfStudyHours: existing.selfStudyHours,
                sleepHours: existing.sleepHours,
                energy: existing.energy,
                notes: existing.notes,
                entries: existing.entries.map((e) => ({
                  subjectId: e.subjectId,
                  chapterId: e.chapterId,
                  topicId: e.topicId,
                  source: e.source,
                  subTopic: e.topic?.name ?? e.subTopic,
                  problemsSolved: e.problemsSolved,
                  homeworkDone: e.homeworkDone,
                  notes: e.notes,
                })),
                reflection: existing.reflection
                  ? {
                      learned: existing.reflection.learned,
                      confused: existing.reflection.confused,
                      hardestSolved: existing.reflection.hardestSolved,
                    }
                  : null,
              }
            : null
        }
        existingPhotos={
          existing?.photos.map((p) => ({
            id: p.id,
            url: p.url ?? photoUrl(p.id),
          })) ?? []
        }
        initialDailyLogId={existing?.id ?? null}
        canUploadEvidence={canUpload}
        canDeleteEvidence={canDeletePhotos}
      />
    </div>
  );
}
