"use client";
import { useState } from "react";
import {
  generateRandomKey,
  encryptTextAESGCM,
  deriveKeyPBKDF2,
  makeNewSaltB64u,
  b64u,
} from "@/lib/crypto";

export default function NewPastePage() {
  const [text, setText] = useState("");
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [deleteTokenB64u, setDeleteTokenB64u] = useState<string | null>(null);

  async function createPaste() {
    if (!text.trim()) return;

    let rawKey: Uint8Array;
    let kdf: string | null = null;
    let saltB64u: string | null = null;
    let iterations: number | null = null;

    if (usePassphrase) {
      if (!passphrase) {
        alert("Enter a passphrase");
        return;
      }
      saltB64u = await makeNewSaltB64u(16);
      iterations = 200_000;
      rawKey = await deriveKeyPBKDF2(passphrase, saltB64u, iterations);
      kdf = "PBKDF2-SHA256";
    } else {
      rawKey = generateRandomKey();
    }

    const { iv_b64u, ct_b64u, alg } = await encryptTextAESGCM(
      text,
      rawKey.buffer as ArrayBuffer
    );

    const del = crypto.getRandomValues(new Uint8Array(16));
    const delB64u = b64u.enc(del.buffer);
    setDeleteTokenB64u(delB64u);

    const res = await fetch("/api/pastes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ciphertext: ct_b64u,
        iv: iv_b64u,
        alg,
        requirePassphrase: usePassphrase,
        kdf,
        salt: saltB64u,
        iterations,
        // optional UX fields:
        title: null,
        language: null,
        deleteToken: delB64u,
      }),
    });
    const { id } = await res.json();

    if (usePassphrase) {
      // No key in URL; the viewer must enter the passphrase.
      const url = `${location.origin}/p/${id}`;
      setLink(url);
    } else {
      // Random key in #fragment (zero-knowledge)
      const keyB64u = b64u.enc(rawKey.buffer as ArrayBuffer);
      const url = `${location.origin}/p/${id}#${keyB64u}`;
      setLink(url);
    }

    localStorage.setItem(`del:${id}`, delB64u);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">New Paste</h1>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={usePassphrase}
          onChange={(e) => setUsePassphrase(e.target.checked)}
        />
        <span>Protect with passphrase</span>
      </label>

      {usePassphrase && (
        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder="Enter passphrase (not sent to server)"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
      )}

      <textarea
        className="w-full h-64 border rounded p-3"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your text here…"
      />
      <button
        onClick={createPaste}
        className="px-4 py-2 rounded bg-black text-white"
      >
        Encrypt & Create
      </button>

      {link && (
        <div className="mt-4 space-y-2">
          <div className="font-mono break-all">{link}</div>
          {usePassphrase ? (
            <p className="text-sm text-gray-600">
              Share the URL **and** the passphrase out-of-band. The server never
              sees it.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              The key is after the <code>#</code> and never leaves the browser.
            </p>
          )}
          {deleteTokenB64u && (
            <p className="text-xs text-gray-500">
              Delete token saved locally. Keep it if you want to delete the
              paste later.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
