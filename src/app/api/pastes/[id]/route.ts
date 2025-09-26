import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const paste = await prisma.paste.findUnique({ where: { id } });
  if (!paste) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // expiry check
  if (paste.expiresAt && paste.expiresAt < new Date()) {
    // Optionally delete here
    await prisma.paste.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  // view limits / burn-after-read
  let shouldDelete = false;
  const newReads = paste.reads + 1;
  if (paste.burnAfterRead) shouldDelete = true;
  if (paste.maxReads && newReads >= paste.maxReads) shouldDelete = true;

  if (shouldDelete) {
    // Return once, then delete
    await prisma.paste.delete({ where: { id } }).catch(() => {});
  } else {
    await prisma.paste.update({
      where: { id },
      data: { reads: newReads },
    });
  }

  return NextResponse.json({
    ciphertext: paste.ciphertext,
    iv: paste.iv,
    alg: paste.alg,
    kdf: paste.kdf,
    salt: paste.salt,
    iterations: paste.iterations,
    requirePassphrase: paste.requirePassphrase,
    title: paste.title,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const { deleteToken } = await req.json().catch(() => ({}));
  if (!deleteToken)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const crypto = await import("node:crypto");
  const hash = crypto.createHash("sha256").update(deleteToken).digest("hex");
  const paste = await prisma.paste.findUnique({ where: { id } });
  if (!paste) return NextResponse.json({ ok: true }); // already gone

  if (paste.deleteTokenHash !== hash) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.paste.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
