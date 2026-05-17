"use client";

import { useState, useTransition } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { ROLE_META, Role } from "@/lib/auth";
import { unlock } from "./actions";

type Props = {
  configured: Record<Role, boolean>;
  from: string;
};

const ORDER: Role[] = ["student", "guardian", "admin"];

export function UnlockForm({ configured, from }: Props) {
  const firstConfigured = ORDER.find((r) => configured[r]) ?? "admin";
  const [role, setRole] = useState<Role>(firstConfigured);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("role", role);
    fd.set("pin", pin);
    fd.set("from", from);
    start(async () => {
      const result = await unlock({}, fd);
      if (result?.error) {
        setError(result.error);
        setPin("");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-7 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-accent" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-none">BroMonitor</div>
            <div className="text-xs text-ink-faint mt-1">
              Pick who you are, then enter your PIN.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {ORDER.map((r) => {
            const meta = ROLE_META[r];
            const isActive = role === r;
            const enabled = configured[r];
            return (
              <button
                key={r}
                type="button"
                disabled={!enabled}
                onClick={() => {
                  setRole(r);
                  setError(null);
                }}
                className={
                  "rounded-lg border px-3 py-3 text-left transition disabled:opacity-40 disabled:cursor-not-allowed " +
                  (isActive
                    ? "border-accent bg-accent/10"
                    : "border-border bg-bg-soft hover:bg-bg-hover")
                }
                title={enabled ? meta.subtitle : "Not available"}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 " +
                      (isActive
                        ? r === "student"
                          ? "bg-physics/25 text-physics"
                          : r === "guardian"
                            ? "bg-good/25 text-good"
                            : "bg-accent/25 text-accent"
                        : "bg-bg-soft text-ink-faint")
                    }
                  >
                    {meta.initial}
                  </span>
                  <span
                    className={
                      "text-sm font-medium " + (isActive ? meta.tone : "")
                    }
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="text-[10px] text-ink-faint mt-0.5 leading-snug">
                  {meta.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              className="input text-center tracking-[0.5em] text-lg"
              placeholder="••••"
            />
          </div>
          {error && (
            <div className="text-sm text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={pending || pin.length === 0 || !configured[role]}
            className="btn-primary w-full"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Unlocking…
              </>
            ) : (
              `Unlock as ${ROLE_META[role].label}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
