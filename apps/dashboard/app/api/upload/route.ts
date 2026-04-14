import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const formData = await req.formData();
  const memberId = String(formData.get("memberId") || "");
  const file = formData.get("file") as File | null;

  if (!memberId || !file) {
    return NextResponse.json({ message: "Missing memberId or file" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${Date.now()}-${file.name}`;
  const fullPath = path.join(uploadDir, fileName);
  await writeFile(fullPath, bytes);

  const upload = await prisma.uploadedFile.create({
    data: {
      memberId,
      fileName,
      fileUrl: `/uploads/${fileName}`,
      parseStatus: "PENDING",
    },
  });

  const apiRes = await fetch(`${process.env.MEMBERGPT_API_URL}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId, filePath: fullPath, uploadId: upload.id }),
  });

  if (!apiRes.ok) {
    await prisma.uploadedFile.update({ where: { id: upload.id }, data: { parseStatus: "FAILED" } });
    return NextResponse.json({ message: "Upload saved but parse failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "Upload parsed successfully" });
}