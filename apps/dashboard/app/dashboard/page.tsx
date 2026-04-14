import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Activity, Scale, Dumbbell, Flame } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScanUpload } from "@/components/scan-upload";
import { LogoutButton } from "@/components/logout-button";
import { BodyCompositionChart } from "@/components/body-composition-chart";

function MetricCard({
  label,
  value,
  delta,
  helper,
  icon,
}: {
  label: string;
  value: string;
  delta?: number;
  helper?: string;
  icon?: React.ReactNode;
}) {
  const positive = delta !== undefined ? delta < 0 : false;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {helper ? <p className="text-sm text-slate-500">{helper}</p> : <span />}
        {delta !== undefined ? (
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${positive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
              }`}
          >
            {positive ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            {Math.abs(delta).toFixed(1)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const memberId = (session?.user as any)?.memberId;
  if (!session || !memberId) redirect("/login");

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { scans: { orderBy: { scanDate: "asc" } } },
  });

  if (!member) redirect("/login");

  const scans = member.scans;
  const latest = scans[scans.length - 1];
  const first = scans[0];
  const previous = scans[scans.length - 2];

  const chartData = scans.map((s) => ({
    date: new Date(s.scanDate).toLocaleDateString(),
    bodyFat: s.bodyFatPercent,
    leanMass: s.leanMassKg,
    weight: s.weightKg,
    fatMass: s.fatMassKg,
  }));

  const totalWeightChange = latest.weightKg - first.weightKg;
  const totalBodyFatChange = latest.bodyFatPercent - first.bodyFatPercent;
  const totalLeanMassChange = latest.leanMassKg - first.leanMassKg;
  const totalFatMassChange = latest.fatMassKg - first.fatMassKg;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                Member dashboard
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                Welcome back, {member.fullName}
              </h1>
              <p className="mt-3 max-w-xl text-slate-300">
                Track your body composition over time, understand what changed,
                and upload new DEXA reports as your journey continues.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <SummaryCard
                  title="Goal"
                  value={member.goal || "No goal set"}
                  subtitle="Current focus area"
                />
                <SummaryCard
                  title="Total scans"
                  value={String(scans.length)}
                  subtitle="History in your account"
                />
                <SummaryCard
                  title="Latest scan"
                  value={new Date(latest.scanDate).toLocaleDateString()}
                  subtitle="Most recent report"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ScanUpload memberId={member.id} />
              <LogoutButton callbackUrl="/login" />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Weight"
            value={`${latest.weightKg.toFixed(1)} kg`}
            delta={scans.length > 1 ? totalWeightChange : undefined}
            helper={scans.length > 1 ? `Started at ${first.weightKg.toFixed(1)} kg` : "Starting point"}
            icon={<Scale size={20} />}
          />
          <MetricCard
            label="Body Fat"
            value={`${latest.bodyFatPercent.toFixed(1)}%`}
            delta={scans.length > 1 ? totalBodyFatChange : undefined}
            helper={scans.length > 1 ? `Started at ${first.bodyFatPercent.toFixed(1)}%` : "Key health composition metric"}
            icon={<Activity size={20} />}
          />
          <MetricCard
            label="Lean Mass"
            value={`${latest.leanMassKg.toFixed(1)} kg`}
            delta={scans.length > 1 ? totalLeanMassChange : undefined}
            helper={scans.length > 1 ? `Started at ${first.leanMassKg.toFixed(1)} kg` : "Muscle and organ mass"}
            icon={<Dumbbell size={20} />}
          />
          <MetricCard
            label="Fat Mass"
            value={`${latest.fatMassKg.toFixed(1)} kg`}
            delta={scans.length > 1 ? totalFatMassChange : undefined}
            helper={scans.length > 1 ? `Started at ${first.fatMassKg.toFixed(1)} kg` : "Fat tissue amount"}
            icon={<Flame size={20} />}
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <BodyCompositionChart data={chartData} />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Journey insight</h3>

            {scans.length === 1 ? (
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  This is your baseline scan. Use it to understand your starting
                  point before comparing future reports.
                </p>
                <p>
                  Your next scan will unlock side-by-side comparison and trend
                  analysis across body fat, lean mass, and weight.
                </p>
              </div>
            ) : scans.length === 2 ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Most exciting moment</p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    Your first comparison is now available.
                  </p>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Weight change: {totalWeightChange.toFixed(1)} kg</p>
                  <p>Body fat change: {totalBodyFatChange.toFixed(1)}%</p>
                  <p>Lean mass change: {totalLeanMassChange.toFixed(1)} kg</p>
                  <p>Fat mass change: {totalFatMassChange.toFixed(1)} kg</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Progress snapshot</p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    You now have enough history to see long-term body composition trends.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Since first scan</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {totalBodyFatChange.toFixed(1)}% body fat
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Since last scan</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {previous
                        ? `${(latest.bodyFatPercent - previous.bodyFatPercent).toFixed(1)}%`
                        : "0.0%"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Scan history</h3>
              <p className="mt-1 text-sm text-slate-500">
                A full record of your body composition reports.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium">Body Fat %</th>
                  <th className="px-4 py-3 font-medium">Fat Mass</th>
                  <th className="px-4 py-3 font-medium">Lean Mass</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s, index) => (
                  <tr
                    key={s.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                  >
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(s.scanDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.weightKg.toFixed(1)} kg</td>
                    <td className="px-4 py-3 text-slate-700">{s.bodyFatPercent.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-slate-700">{s.fatMassKg.toFixed(1)} kg</td>
                    <td className="px-4 py-3 text-slate-700">{s.leanMassKg.toFixed(1)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}