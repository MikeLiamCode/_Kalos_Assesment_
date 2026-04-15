import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function toSafeNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function POST(req: Request) {
  let uploadId: string | null = null;

  try {
    const formData = await req.formData();
    const memberId = String(formData.get("memberId") || "");
    const file = formData.get("file") as File | null;

    if (!memberId || !file) {
      return NextResponse.json(
        { message: "Missing memberId or file" },
        { status: 400 },
      );
    }

    const upload = await prisma.uploadedFile.create({
      data: {
        memberId,
        fileName: file.name,
        fileUrl: "",
        parseStatus: "PENDING",
      },
    });

    uploadId = upload.id;

    const latestScan = await prisma.scan.findFirst({
      where: { memberId },
      orderBy: { scanDate: "desc" },
    });

    const fallbackData = {
      weightKg: latestScan?.weightKg ?? 70,
      bodyFatPercent: latestScan?.bodyFatPercent ?? 20,
      fatMassKg: latestScan?.fatMassKg ?? 14,
      leanMassKg: latestScan?.leanMassKg ?? 56,
      scanDate: new Date(),
    };

    const forwardForm = new FormData();
    forwardForm.append("memberId", memberId);
    forwardForm.append("uploadId", upload.id);
    forwardForm.append("file", file);

    const apiBase = process.env.MEMBERGPT_API_URL;
    let finalData = { ...fallbackData };
    let parseStatus: "SUCCESS" | "FAILED" = "FAILED";
    let message = "Upload saved with fallback values.";

    if (apiBase) {
      try {
        const normalizedApiBase = apiBase.replace(/\/+$/, "");

        const apiRes = await fetch(`${normalizedApiBase}/parse/parse`, {
          method: "POST",
          body: forwardForm,
        });

        if (apiRes.ok) {
          const data = await apiRes.json().catch(() => null);
          const parsed = data?.parsed ?? data ?? {};

          finalData = {
            weightKg: toSafeNumber(parsed.weightKg, fallbackData.weightKg),
            bodyFatPercent: toSafeNumber(
              parsed.bodyFatPercent,
              fallbackData.bodyFatPercent,
            ),
            fatMassKg: toSafeNumber(parsed.fatMassKg, fallbackData.fatMassKg),
            leanMassKg: toSafeNumber(parsed.leanMassKg, fallbackData.leanMassKg),
            scanDate: parsed.scanDate ? new Date(parsed.scanDate) : new Date(),
          };

          parseStatus = "SUCCESS";
          message = "Upload parsed successfully";
        } else {
          const errorText = await apiRes.text().catch(() => "Parse failed");
          message = `Upload saved with fallback values. Parser error: ${errorText}`;
        }
      } catch (error) {
        console.error("UPLOAD_PARSE_REQUEST_ERROR", error);
        message =
          "Upload saved with fallback values. Parser service was unavailable.";
      }
    } else {
      message =
        "Upload saved with fallback values. MEMBERGPT_API_URL is not configured.";
    }

    await prisma.scan.create({
      data: {
        memberId,
        weightKg: finalData.weightKg,
        bodyFatPercent: finalData.bodyFatPercent,
        fatMassKg: finalData.fatMassKg,
        leanMassKg: finalData.leanMassKg,
        scanDate: finalData.scanDate,
      },
    });

    await prisma.uploadedFile.update({
      where: { id: upload.id },
      data: { parseStatus },
    });

    return NextResponse.json({
      message,
      usedFallback: parseStatus === "FAILED",
      values: finalData,
    });
  } catch (error) {
    console.error("UPLOAD_ROUTE_ERROR", error);

    if (uploadId) {
      try {
        await prisma.uploadedFile.update({
          where: { id: uploadId },
          data: { parseStatus: "FAILED" },
        });
      } catch { }
    }

    return NextResponse.json(
      { message: "Unexpected upload error" },
      { status: 500 },
    );
  }
}