import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";

// ...imports unchanged
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    ciphertext,
    iv,
    alg,
    kdf,
    salt,
    iterations,
    requirePassphrase,
    title,
    language,
    expiresAt,
    burnAfterRead,
    maxReads,
    version,
    deleteToken,
  } = body || {};

  if (!ciphertext || !iv || !alg) {
    return NextResponse.json(
      { error: "Missing ciphertext/iv/alg" },
      { status: 400 }
    );
  }

  if (requirePassphrase) {
    if (!kdf || !salt || !iterations) {
      return NextResponse.json(
        { error: "Missing KDF params" },
        { status: 400 }
      );
    }
  }

  const deleteTokenHash = deleteToken
    ? crypto.createHash("sha256").update(deleteToken).digest("hex")
    : null;

  const paste = await prisma.paste.create({
    data: {
      ciphertext,
      iv,
      alg,
      kdf: kdf ?? null,
      salt: salt ?? null,
      iterations: iterations ?? null,
      requirePassphrase: !!requirePassphrase,
      title: title ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      burnAfterRead: !!burnAfterRead,
      maxReads: maxReads ?? null,
      version: version ?? 1,
      deleteTokenHash,
    },
    select: { id: true, requirePassphrase: true },
  });

  return NextResponse.json({ id: paste.id });
}
