"use client";

import { useState, useTransition } from "react";
import { MessageSquarePlus, Loader2, Trash2 } from "lucide-react";
import { fmtRelative } from "@/lib/utils";
import {
  createGuardianComment,
  deleteGuardianComment,
} from "@/app/comments/actions";

export type CommentItem = {
  id: string;
  body: string;
  authorRole: string;
  createdAt: string;
};

type Props = {
  scope: "general" | "day";
  scopeId?: string | null;
  scopeDate?: string | null;
  comments: CommentItem[];
  canCreate: boolean;
  canDelete: boolean;
  // The student sees comments but doesn't get a compose box.
  // Compact variant renders inline-style with smaller padding.
  variant?: "default" | "compact";
  placeholder?: string;
};

export function GuardianCommentBox({
  scope,
  scopeId,
  scopeDate,
  comments,
  canCreate,
  canDelete,
  variant = "default",
  placeholder,
}: Props) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const isCompact = variant === "compact";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBody("");
    start(async () => {
      await createGuardianComment({
        scope,
        scopeId: scopeId ?? null,
        scopeDate: scopeDate ?? null,
        body: trimmed,
      });
    });
  }

  if (comments.length === 0 && !canCreate) return null;

  return (
    <div className={isCompact ? "" : "space-y-3"}>
      {comments.length > 0 && (
        <div className={isCompact ? "space-y-1.5" : "space-y-2"}>
          {comments.map((c) => (
            <div
              key={c.id}
              className={
                "rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm flex items-start gap-2"
              }
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wide text-accent/80 mb-0.5">
                  {c.authorRole === "admin" ? "Admin" : "Father"} ·{" "}
                  {fmtRelative(new Date(c.createdAt))}
                </div>
                <div className="text-ink whitespace-pre-wrap break-words">
                  {c.body}
                </div>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() =>
                    start(() => {
                      void deleteGuardianComment(c.id);
                    })
                  }
                  disabled={pending}
                  className="text-ink-faint hover:text-bad p-1 -m-1"
                  title="Delete comment"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canCreate && (
        <form
          onSubmit={onSubmit}
          className={
            (isCompact ? "mt-2 " : "") + "flex items-start gap-2"
          }
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={isCompact ? 1 : 2}
            className="input flex-1 resize-none"
            placeholder={
              placeholder ??
              (scope === "day"
                ? "Leave a note about this day…"
                : "Leave a general note for him…")
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (e.metaKey || e.ctrlKey) &&
                body.trim()
              ) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="btn-primary py-2 px-3 shrink-0"
            title="Post (Ctrl/Cmd+Enter)"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="w-4 h-4" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}
