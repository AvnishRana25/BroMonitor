import { ALL_ROLES, Role, isPinConfigured } from "@/lib/auth";
import { UnlockForm } from "./UnlockForm";

export const dynamic = "force-dynamic";

export default function UnlockPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const configured = Object.fromEntries(
    ALL_ROLES.map((r) => [r, isPinConfigured(r)]),
  ) as Record<Role, boolean>;
  const anyConfigured = Object.values(configured).some(Boolean);

  if (!anyConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-7 max-w-md text-center">
          <div className="text-lg font-semibold mb-2">Sign-in not ready</div>
          <p className="text-sm text-ink-dim leading-relaxed">
            This app has not been set up yet. Ask the administrator to configure
            access PINs.
          </p>
        </div>
      </div>
    );
  }

  return <UnlockForm configured={configured} from={searchParams.from || ""} />;
}
