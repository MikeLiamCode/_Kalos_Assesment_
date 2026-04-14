import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { MemberGPTClient } from "@/components/membergpt-client";

export default async function MemberGPTPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session) redirect("/coach-login");
  if (role !== "COACH") redirect("/login");

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Coach Workspace
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">
              MemberGPT
            </h1>
          </div>
          <LogoutButton callbackUrl="/coach-login" />
        </div>

        <MemberGPTClient />
      </div>
    </main>
  );
}