import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
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

    const forwardForm = new FormData();
    forwardForm.append("memberId", memberId);
    forwardForm.append("uploadId", upload.id);
    forwardForm.append("file", file);

    const apiBase = process.env.MEMBERGPT_API_URL;
    if (!apiBase) {
      await prisma.uploadedFile.update({
        where: { id: upload.id },
        data: { parseStatus: "FAILED" },
      });

      return NextResponse.json(
        { message: "MEMBERGPT_API_URL is not configured" },
        { status: 500 },
      );
    }

    const apiRes = await fetch(`${apiBase}/parse/parse`, {
      method: "POST",
      body: forwardForm,
    });

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "Parse failed");

      await prisma.uploadedFile.update({
        where: { id: upload.id },
        data: { parseStatus: "FAILED" },
      });

      return NextResponse.json(
        { message: `Upload received but parse failed: ${errorText}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Upload parsed successfully" });
  } catch (error) {
    console.error("UPLOAD_ROUTE_ERROR", error);
    return NextResponse.json(
      { message: "Unexpected upload error" },
      { status: 500 },
    );
  }
}