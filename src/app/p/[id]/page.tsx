"use client";
import { useEffect, useState, use } from "react";
import { b64u, decryptTextAESGCM, deriveKeyPBKDF2 } from "@/lib/crypto";
import { HashLoader } from "react-spinners";

type PasteMeta = {
  ciphertext: string;
  iv: string;
  alg: string;
  kdf?: string | null;
  salt?: string | null;
  iterations?: number | null;
  requirePassphrase?: boolean;
  title?: string | null;
  language?: string | null;
};

export default function PasteView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [meta, setMeta] = useState<PasteMeta | null>(null);
  const [plain, setPlain] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [needsPass, setNeedsPass] = useState(false);
  const [copied, setCopied] = useState<"content" | null>(null);
  const { id } = use(params);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/pastes/${id}`);
      if (!res.ok) {
        setErr(
          res.status === 410
            ? "This paste has expired or was burned."
            : "Paste not found."
        );
        return;
      }
      const data = await res.json();
      setMeta(data);

      const frag = location.hash.slice(1);
      if (frag) {
        try {
          const rawKey = new Uint8Array(b64u.dec(frag));
          const text = await decryptTextAESGCM(
            data.ciphertext,
            data.iv,
            rawKey
          );
          setPlain(text);
        } catch {
          setErr("Paste not found.");
        }
      } else if (data.requirePassphrase) {
        setNeedsPass(true);
      } else {
        setErr("Paste not found.");
      }
    })();
  }, [id]);

  async function tryPassphrase() {
    if (!meta) return;
    try {
      if (!meta.kdf || !meta.salt || !meta.iterations) {
        setErr("Paste not found.");
        return;
      }
      const rawKey = await deriveKeyPBKDF2(
        passphrase,
        meta.salt,
        meta.iterations
      );
      const text = await decryptTextAESGCM(meta.ciphertext, meta.iv, rawKey);
      setPlain(text);
      setErr(null);
    } catch {
      setErr("Paste not found.");
    }
  }

  if (err)
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-600">
          {err}
        </div>
      </div>
    );
  if (!meta)
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 flex items-center justify-center">
        <HashLoader color="#fff" />
      </div>
    );

  if (needsPass && plain === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-background/60 backdrop-blur p-5 shadow-sm">
          <h1 className="text-xl font-semibold mb-3">Enter passphrase</h1>
          <input
            type="password"
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 mb-3"
            placeholder="Passphrase (never leaves your device)"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <button
            onClick={tryPassphrase}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white bg-black hover:bg-black/90 transition"
          >
            Decrypt
          </button>
        </div>
      </div>
    );
  }

  if (plain === null)
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-foreground/70">
        Decrypting…
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {meta.title ?? id}
        </h1>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(plain);
            setCopied("content");
            setTimeout(() => setCopied(null), 1500);
          }}
          className="cursor-pointer text-xs rounded-md border border-black/10 dark:border.white/20 px-2.5 py-1.5 hover:bg-black/5 dark:hover:bg.white/5 transition"
        >
          {copied === "content" ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-xl border border-black/10 dark:border-white/10 bg-background/60 backdrop-blur p-4 text-sm">
        {plain}
      </pre>
    </div>
  );
}
