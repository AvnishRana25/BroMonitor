import { ALL_ROLES, Role, isPinConfigured } from "@/lib/auth";
import { UnlockForm } from "./UnlockForm";

export const dynamic = "force-dynamic";

export default function UnlockPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const configured = Object.fromEntries(
    ALL_ROLES.map((r) => [r, isPinConfigured(r)])
  ) as Record<Role, boolean>;
  const anyConfigured = Object.values(configured).some(Boolean);

  if (!anyConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-7 max-w-md">
          <div className="text-lg font-semibold mb-2">No PINs configured</div>
          <div className="text-sm text-ink-dim leading-relaxed">
            Add the following to your <code className="text-ink">.env</code> file
            and restart the dev server:
          </div>
          <pre className="mt-3 text-xs bg-bg-soft border border-border rounded-lg p-3 overflow-x-auto">
{`APP_SECRET="<at least 16 chars of random>"
PIN_STUDENT="1234"
PIN_GUARDIAN="2345"
PIN_ADMIN="3456"`}
          </pre>
          <div className="text-xs text-ink-faint mt-3 leading-relaxed">
            APP_SECRET signs the session cookie. PINs are short; the secret is
            what makes the cookie unforgeable.
          </div>
        </div>
      </div>
    );
  }

  return <UnlockForm configured={configured} from={searchParams.from || ""} />;
}
