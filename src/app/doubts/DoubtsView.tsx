"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { SubjectPill } from "@/components/SubjectPill";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import {
  clearAiDoubtAnswer,
  createDoubt,
  deleteDoubt,
  getAiDoubtAnswer,
  markDoubtResolvedByAi,
  reopenDoubt,
  resolveDoubt,
} from "./actions";

type Subject = { id: string; name: string; short: string; color: string };

type Doubt = {
  id: string;
  question: string;
  chapter: string | null;
  topic: string | null;
  status: string;
  raisedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  aiAnswer: string | null;
  aiConfident: boolean | null;
  aiAnsweredAt: string | null;
  aiModel: string | null;
  imageUrl: string | null;
  subject: { id: string; short: string; color: string };
};

export function DoubtsView({
  subjects,
  doubts,
  geminiConfigured,
  cloudinaryConfigured,
  canDelete,
}: {
  subjects: Subject[];
  doubts: Doubt[];
  geminiConfigured: boolean;
  cloudinaryConfigured: boolean;
  canDelete: boolean;
}) {
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [pending, startTransition] = useTransition();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const filtered = doubts.filter((d) =>
    filter === "all" ? true : d.status === filter,
  );

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setImagePreview(null);
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setFormError(`Image too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.`);
      e.target.value = "";
      setImagePreview(null);
      return;
    }
    setFormError(null);
    setImagePreview(URL.createObjectURL(f));
  }

  function clearImage() {
    if (fileRef.current) fileRef.current.value = "";
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      try {
        await createDoubt(fd);
        form.reset();
        clearImage();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Could not add doubt.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <form ref={formRef} onSubmit={onCreate} className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-base font-semibold">Add a doubt</div>
          {geminiConfigured && (
            <span className="text-[11px] text-ink-faint flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent" />
              First-pass AI answer available after adding
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            name="subjectId"
            required
            className="input"
            defaultValue=""
            aria-label="Subject"
          >
            <option value="" disabled>
              Subject…
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="chapter" className="input" placeholder="Chapter (optional)" />
          <input name="topic" className="input" placeholder="Topic (optional)" />
          <button
            type="submit"
            disabled={pending}
            className="btn-primary justify-self-end sm:justify-self-stretch"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add
          </button>
          <textarea
            name="question"
            className="input sm:col-span-4 min-h-[72px] resize-y"
            placeholder="Type the doubt… (or attach a photo of the problem below)"
            maxLength={2000}
          />
        </div>

        <div className="flex items-start gap-3 flex-wrap">
          <label
            className={`btn-ghost text-xs cursor-pointer ${
              !cloudinaryConfigured ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={
              cloudinaryConfigured
                ? "Snap or pick a photo of the question"
                : "Set CLOUDINARY_* in .env to enable image uploads"
            }
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {imagePreview ? "Change photo" : "Attach photo"}
            <input
              ref={fileRef}
              name="image"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPickImage}
              disabled={!cloudinaryConfigured}
            />
          </label>
          {imagePreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="preview"
                className="h-20 w-20 object-cover rounded-lg border border-border-soft"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg border border-border-soft flex items-center justify-center text-ink-faint hover:text-bad"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {!cloudinaryConfigured && (
            <p className="text-[11px] text-ink-faint self-center">
              Image uploads need Cloudinary credentials.
            </p>
          )}
        </div>

        {formError && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-2.5 py-1.5">
            {formError}
          </div>
        )}
      </form>

      <div className="flex items-center gap-2">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition capitalize ${
              filter === f
                ? "bg-accent/15 text-accent border-accent/40"
                : "bg-bg-soft border-border text-ink-dim hover:text-ink"
            }`}
          >
            {f} (
            {doubts.filter((d) => (f === "all" ? true : d.status === f)).length}
            )
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-faint">
          {filter === "open" ? "No open doubts. Nice." : "Nothing here."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <DoubtRow
              key={d.id}
              d={d}
              geminiConfigured={geminiConfigured}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DoubtRow({
  d,
  geminiConfigured,
  canDelete,
}: {
  d: Doubt;
  geminiConfigured: boolean;
  canDelete: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!!d.aiAnswer);
  const [imgOpen, setImgOpen] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <SubjectPill name={d.subject.short} color={d.subject.color} />
          <div className="min-w-0 flex-1">
            <div className="text-sm whitespace-pre-line">{d.question}</div>
            {d.imageUrl && (
              <button
                type="button"
                onClick={() => setImgOpen((o) => !o)}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline"
              >
                <ImageIcon className="w-3 h-3" />
                {imgOpen ? "Hide image" : "View attached image"}
              </button>
            )}
            {d.imageUrl && imgOpen && (
              <div className="mt-2 relative w-full max-w-md aspect-[4/3] bg-bg-soft rounded-lg overflow-hidden border border-border-soft">
                <Image
                  src={d.imageUrl}
                  alt="Doubt image"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 448px"
                  unoptimized
                />
              </div>
            )}
            <div className="text-xs text-ink-faint mt-1 flex items-center gap-2 flex-wrap">
              <span>Raised {fmtDate(d.raisedAt)}</span>
              {d.chapter && <span>· {d.chapter}</span>}
              {d.topic && <span>· {d.topic}</span>}
              {d.resolvedAt && (
                <span className="text-good">
                  · resolved {fmtDate(d.resolvedAt)}
                  {d.resolvedBy ? ` by ${d.resolvedBy}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {geminiConfigured && (
            <button
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await getAiDoubtAnswer(d.id);
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setOpen(true);
                });
              }}
              className="btn-ghost text-xs"
              title={d.aiAnswer ? "Re-ask AI" : "Get a first-pass AI answer"}
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              )}
              {d.aiAnswer ? "Re-ask AI" : "Ask AI"}
            </button>
          )}
          {d.status === "open" ? (
            <ResolveMenu id={d.id} hasAiAnswer={!!d.aiAnswer} />
          ) : (
            <ReopenButton id={d.id} />
          )}
          {canDelete && <DeleteButton id={d.id} />}
        </div>
      </div>

      {error && (
        <div className="mt-2 text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-2.5 py-1.5">
          {error}
        </div>
      )}

      {d.aiAnswer && (
        <div className="mt-3 border-t border-border-soft pt-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-accent hover:underline flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI first-pass
            {d.aiConfident === false && (
              <span className="chip text-[10px] text-warn border-warn/40 bg-warn/10">
                low confidence
              </span>
            )}
            {d.aiAnsweredAt && (
              <span className="text-ink-faint normal-case font-normal">
                · {fmtDateTime(d.aiAnsweredAt)}
                {d.aiModel ? ` · ${d.aiModel}` : ""}
              </span>
            )}
          </button>
          {open && (
            <>
              <div className="mt-2 text-sm whitespace-pre-line leading-relaxed bg-bg-soft border border-border-soft rounded-lg p-3 text-ink-dim">
                {d.aiAnswer}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() =>
                    start(() => {
                      void clearAiDoubtAnswer(d.id);
                    })
                  }
                  disabled={pending}
                  className="btn-ghost text-xs text-ink-faint"
                >
                  Clear AI answer
                </button>
                {d.status === "open" && (
                  <button
                    onClick={() => {
                      if (
                        !confirm(
                          "Mark this doubt as resolved by AI? Only do this if the AI explanation answered your question.",
                        )
                      )
                        return;
                      start(() => {
                        void markDoubtResolvedByAi(d.id);
                      });
                    }}
                    disabled={pending}
                    className="btn-ghost text-xs text-good hover:text-good border-good/30"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolved by AI
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResolveMenu({ id, hasAiAnswer }: { id: string; hasAiAnswer: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const options = ["teacher", "peer", "self", "online"];
  if (hasAiAnswer) options.push("ai");
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="btn-ghost text-xs text-good hover:text-good border-good/30"
      >
        <Check className="w-3.5 h-3.5" /> Resolve
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-20 w-40 card p-1 border-border"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="text-[10px] uppercase text-ink-faint px-2 py-1">
            Resolved by
          </div>
          {options.map((o) => (
            <button
              key={o}
              onClick={() => {
                setOpen(false);
                start(() => {
                  void resolveDoubt(id, o);
                });
              }}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-bg-hover capitalize"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReopenButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(() => {
          void reopenDoubt(id);
        })
      }
      disabled={pending}
      className="btn-ghost text-xs"
    >
      <RotateCcw className="w-3.5 h-3.5" /> Reopen
    </button>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("Delete this doubt?")) return;
        start(() => {
          void deleteDoubt(id);
        });
      }}
      disabled={pending}
      className="btn-ghost text-bad hover:text-bad text-xs"
      aria-label="Delete doubt"
      title="Delete doubt"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
