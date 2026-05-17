import { prisma } from "@/lib/db";
import { DoubtsView } from "./DoubtsView";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { isCloudinaryConfigured } from "@/lib/photos";
import { can, currentRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DoubtsPage() {
  const [subjects, doubts, role] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.doubt.findMany({
      orderBy: [{ status: "asc" }, { raisedAt: "desc" }],
      include: { subject: true },
    }),
    currentRole(),
  ]);

  return (
    <DoubtsView
      geminiConfigured={isGeminiConfigured()}
      cloudinaryConfigured={isCloudinaryConfigured()}
      canDelete={can(role, "doubt:delete")}
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
        aiAnswer: d.aiAnswer,
        aiConfident: d.aiConfident,
        aiAnsweredAt: d.aiAnsweredAt?.toISOString() ?? null,
        aiModel: d.aiModel,
        imageUrl: d.imageUrl,
        subject: {
          id: d.subject.id,
          short: d.subject.short,
          color: d.subject.color,
        },
      }))}
    />
  );
}
