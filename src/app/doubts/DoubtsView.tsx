"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  Check,
  CheckCircle2,
  ImageIcon,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  compressImageFile,
  normalizeImageFile,
} from "@/lib/imageCompress.client";
import { postAiDoubtAnswer } from "@/lib/aiDoubt.client";
import { postCreateDoubt } from "@/lib/createDoubt.client";
import { SubjectPill } from "@/components/SubjectPill";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import {
  clearAiDoubtAnswer,
  deleteDoubt,
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const filtered = doubts.filter((d) =>
    filter === "all" ? true : d.status === filter,
  );

  async function applyImageFile(f: File | null) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setFormError(`Image too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.`);
      return;
    }
    setFormError(null);
    const compressed = await compressImageFile(normalizeImageFile(f));
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!f) return;
    await applyImageFile(f);
  }

  function clearImage() {
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    startTransition(async () => {
      const created = await postCreateDoubt(form, imageFile);
      if (!created.ok) {
        setFormError(created.error);
        return;
      }
      form.reset();
      clearImage();
      router.refresh();
      if (geminiConfigured) {
        const ai = await postAiDoubtAnswer(created.id);
        if (!ai.ok) setFormError(ai.error);
        else router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <form ref={formRef} onSubmit={onCreate} className="card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-base font-semibold">Add a doubt</div>
          {geminiConfigured && (
            <span className="text-[11px] text-ink-faint flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent" />
              AI answers automatically after you add (text or photo).
            </span>
          )}
        </div>

        <select
            name="subjectId"
            required
            className="input w-full min-h-[44px]"
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

        <div className="grid grid-cols-2 gap-2">
          <input name="chapter" className="input min-h-[44px]" placeholder="Chapter (optional)" aria-label="Chapter" />
          <input name="topic" className="input min-h-[44px]" placeholder="Topic (optional)" aria-label="Topic" />
        </div>

        <textarea
          name="question"
          className="input w-full min-h-[88px] resize-y"
          placeholder="Type the doubt… or snap the question below"
          maxLength={2000}
          aria-label="Doubt question"
        />

        {cloudinaryConfigured && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => cameraRef.current?.click()}
              className="btn-primary min-h-[48px] flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Camera
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => galleryRef.current?.click()}
              className="btn-ghost min-h-[48px] flex items-center justify-center gap-2 border border-border"
            >
              <ImagePlus className="w-4 h-4" /> Gallery
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label="Take photo"
              onChange={onPickImage}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Choose from gallery"
              onChange={onPickImage}
            />
          </div>
        )}

        {imagePreview && (
          <div className="relative inline-block max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Problem preview"
              className="max-h-40 rounded-lg border border-border-soft object-contain bg-bg-soft"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-1 right-1 p-1.5 rounded-md bg-black/60 text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full min-h-[48px] flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {geminiConfigured ? "Adding & asking AI…" : "Adding…"}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add doubt
            </>
          )}
        </button>

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
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!!d.aiAnswer);
  const [imgOpen, setImgOpen] = useState(false);
  const [aiAnswer, setAiAnswer] = useState(d.aiAnswer);
  const [aiConfident, setAiConfident] = useState(d.aiConfident);

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
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {geminiConfigured && (
            <button
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await postAiDoubtAnswer(d.id);
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setAiAnswer(res.answer);
                  setAiConfident(res.confident);
                  setOpen(true);
                  router.refresh();
                });
              }}
              className="btn-ghost text-xs min-h-[40px] px-2.5"
              title={aiAnswer ? "Re-ask AI" : "Get a first-pass AI answer"}
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              )}
              {aiAnswer ? "Re-ask AI" : "Ask AI"}
            </button>
          )}
          {d.status === "open" ? (
            <ResolveMenu id={d.id} hasAiAnswer={!!aiAnswer} />
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

      {aiAnswer && (
        <div className="mt-3 border-t border-border-soft pt-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-accent hover:underline flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI first-pass
            {aiConfident === false && (
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
                {aiAnswer}
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
