"use client";
import { useEffect, useState, use } from "react";
import { b64u, decryptTextAESGCM, deriveKeyPBKDF2 } from "@/lib/crypto";

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
          setErr("Decryption failed. Wrong key or corrupted data.");
        }
      } else if (data.requirePassphrase) {
        setNeedsPass(true);
      } else {
        setErr(
          "Missing key (#fragment) and this paste is not passphrase-protected."
        );
      }
    })();
  }, [id]);

  async function tryPassphrase() {
    if (!meta) return;
    try {
      if (!meta.kdf || !meta.salt || !meta.iterations) {
        setErr("Missing KDF parameters.");
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
      setErr("Decryption failed. Wrong passphrase or corrupted data.");
    }
  }

  if (err)
    return <div className="max-w-2xl mx-auto p-6 text-red-600">{err}</div>;
  if (!meta) return <div className="max-w-2xl mx-auto p-6">Loading…</div>;

  if (needsPass && plain === null) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-3">
        <h1 className="text-xl font-semibold">Enter Passphrase</h1>
        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder="Passphrase (never leaves your device)"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
        <button
          onClick={tryPassphrase}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Decrypt
        </button>
      </div>
    );
  }

  if (plain === null)
    return <div className="max-w-2xl mx-auto p-6">Decrypting…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-2">
        {meta.title ?? "Decrypted Paste"}
      </h1>
      <pre className="whitespace-pre-wrap rounded border p-3">{plain}</pre>
    </div>
  );
}
