import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDate, startOfDay, toDateInputValue } from "@/lib/utils";
import { SubjectPill } from "@/components/SubjectPill";
import { Plus, Pencil, Sparkles, MessageSquare, Camera } from "lucide-react";
import { photoUrl } from "@/lib/photos";
import { EmptyState } from "@/components/EmptyState";
import { DeleteDailyLogButton } from "./DeleteDailyLogButton";
import { currentRole, can } from "@/lib/session";
import {
  CommentItem,
  GuardianCommentBox,
} from "@/components/GuardianCommentBox";

export default async function DailyPage() {
  const role = await currentRole();
  const canEdit = can(role, "log:edit");
  const canDelete = can(role, "log:delete");
  const canCreateComment = can(role, "comment:create");
  const canDeleteComment = can(role, "comment:delete");

  const logs = await prisma.dailyLog.findMany({
    orderBy: { date: "desc" },
    include: {
      entries: {
        include: { subject: true, chapter: true },
      },
      reflection: true,
      photos: true,
    },
    take: 60,
  });

  // Pull comments scoped to any of these days in a single query, then index
  // by dailyLogId + by scopeDate (so general-by-date comments still attach
  // even if there's no DailyLog row yet for that date — defensive only).
  const dayComments = await prisma.guardianComment.findMany({
    where: {
      scope: "day",
      OR: [
        { scopeId: { in: logs.map((l) => l.id) } },
        {
          scopeDate: {
            in: logs.map((l) => startOfDay(l.date)),
          },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  const commentsByLogId = new Map<string, CommentItem[]>();
  for (const c of dayComments) {
    const key = c.scopeId ?? "";
    if (!key) continue;
    const list = commentsByLogId.get(key) ?? [];
    list.push({
      id: c.id,
      body: c.body,
      authorRole: c.authorRole,
      createdAt: c.createdAt.toISOString(),
    });
    commentsByLogId.set(key, list);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-dim">
          {logs.length} day{logs.length === 1 ? "" : "s"} logged
        </div>
        {canEdit && (
          <Link href="/daily/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New daily log
          </Link>
        )}
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="No daily logs yet"
          description="Log what he studied today — school hours, coaching, self-study, and chapters covered."
          action={
            canEdit ? (
              <Link href="/daily/new" className="btn-primary">
                <Plus className="w-4 h-4" /> Add today&apos;s log
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const total =
              log.schoolHours + log.coachingHours + log.selfStudyHours;
            return (
              <div key={log.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-base font-semibold">
                      {fmtDate(log.date, true)}
                    </div>
                    <div className="text-xs text-ink-faint mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        Total {total.toFixed(1)}h · School {log.schoolHours}h ·
                        Coach {log.coachingHours}h · Self {log.selfStudyHours}h
                      </span>
                      {log.photos.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-good">
                          <Camera className="w-3 h-3" />
                          {log.photos.length} evidence
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Link
                        href={`/daily/new?date=${toDateInputValue(log.date)}`}
                        className="btn-ghost"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Link>
                    )}
                    {canDelete && <DeleteDailyLogButton id={log.id} />}
                  </div>
                </div>

                {(log.sleepHours != null || log.energy != null) && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-ink-faint">
                    {log.sleepHours != null && (
                      <span>Sleep {log.sleepHours}h</span>
                    )}
                    {log.energy != null && (
                      <span>Energy {log.energy}/5</span>
                    )}
                  </div>
                )}

                {log.entries.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {log.entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-start gap-2 text-sm bg-bg-soft border border-border-soft rounded-lg p-2.5"
                      >
                        <SubjectPill
                          name={e.subject.short}
                          color={e.subject.color}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {e.chapter?.name ?? e.subTopic ?? "—"}
                          </div>
                          <div className="text-xs text-ink-faint mt-0.5">
                            {e.source}
                            {e.chapter && e.subTopic
                              ? ` · ${e.subTopic}`
                              : ""}
                            {e.problemsSolved
                              ? ` · ${e.problemsSolved} problems`
                              : ""}
                            {e.homeworkDone ? " · HW done" : ""}
                          </div>
                          {e.notes && (
                            <div className="text-xs text-ink-dim mt-1">
                              {e.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {log.photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {log.photos.map((ph) => (
                      <a
                        key={ph.id}
                        href={photoUrl(ph.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border border-border-soft bg-bg-soft"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl(ph.id)}
                          alt="Study evidence"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {log.notes && (
                  <div className="mt-3 text-sm text-ink-dim border-t border-border-soft pt-3">
                    {log.notes}
                  </div>
                )}

                {log.reflection &&
                  (log.reflection.learned ||
                    log.reflection.confused ||
                    log.reflection.hardestSolved) && (
                    <div className="mt-3 border-t border-border-soft pt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-ink-faint uppercase tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        What he learned
                      </div>
                      {log.reflection.learned && (
                        <ReflectionLine
                          label="Learned"
                          value={log.reflection.learned}
                        />
                      )}
                      {log.reflection.confused && (
                        <ReflectionLine
                          label="Confused by"
                          value={log.reflection.confused}
                          tone="warn"
                        />
                      )}
                      {log.reflection.hardestSolved && (
                        <ReflectionLine
                          label="Hardest solved"
                          value={log.reflection.hardestSolved}
                          tone="good"
                        />
                      )}
                    </div>
                  )}

                {(commentsByLogId.get(log.id)?.length ||
                  canCreateComment) && (
                  <div className="mt-3 border-t border-border-soft pt-3">
                    <div className="flex items-center gap-2 text-xs text-ink-faint uppercase tracking-wide mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-accent" />
                      Father&apos;s notes
                    </div>
                    <GuardianCommentBox
                      scope="day"
                      scopeId={log.id}
                      scopeDate={toDateInputValue(log.date)}
                      comments={commentsByLogId.get(log.id) ?? []}
                      canCreate={canCreateComment}
                      canDelete={canDeleteComment}
                      variant="compact"
                      placeholder="Add a note about this day…"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReflectionLine({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  const toneCls =
    tone === "good"
      ? "text-good"
      : tone === "warn"
      ? "text-warn"
      : "text-ink-dim";
  return (
    <div className="text-sm">
      <span className={`text-[10px] uppercase tracking-wide mr-2 ${toneCls}`}>
        {label}
      </span>
      <span className="text-ink-dim">{value}</span>
    </div>
  );
}
