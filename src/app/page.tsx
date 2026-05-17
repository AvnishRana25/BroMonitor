import { prisma } from "@/lib/db";
import { ROLE_META } from "@/lib/auth";
import { currentRole } from "@/lib/session";
import { hubItemsForRole } from "@/lib/navigation";
import { HubCard } from "@/components/HubCard";
import { cn } from "@/lib/utils";

export default async function HomeHubPage() {
  const role = await currentRole();
  if (!role) return null;

  const meta = ROLE_META[role];
  const student = await prisma.student.findFirst();
  const items = hubItemsForRole(role);
  const featured = items.filter((i) => i.featured);
  const rest = items.filter((i) => !i.featured);

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="card p-5 sm:p-6 border-accent/25 bg-gradient-to-br from-accent/10 via-bg-card to-bg-card">
        <p className="text-xs uppercase tracking-wider text-accent font-medium">
          {meta.label} view
        </p>
        <h2 className="text-xl sm:text-2xl font-semibold mt-1">
          What do you want to do?
        </h2>
        <p className="text-sm text-ink-dim mt-2 leading-relaxed">
          {role === "student"
            ? `Hi ${student?.name ?? "Bro"} — tap a tile to log study, check syllabus, or resolve doubts.`
            : role === "guardian"
              ? "Tap a section to review progress, set plans, or respond to alerts."
              : "Full access — same tiles as Father plus syllabus editing from Subjects."}
        </p>
      </div>

      {featured.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Quick start
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featured.map((item) => (
              <HubCard key={item.href} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          All sections
        </h3>
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
          )}
        >
          {rest.map((item) => (
            <HubCard key={item.href} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
