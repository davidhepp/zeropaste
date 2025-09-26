"use client";
import { useState, useRef } from "react";
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deleteTokenB64u, setDeleteTokenB64u] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [copied, setCopied] = useState<"link" | "token" | null>(null);
  const linkSectionRef = useRef<HTMLDivElement>(null);

  async function createPaste() {
    if (!text.trim()) return;
    setIsEncrypting(true);

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
    setIsEncrypting(false);

    // Scroll to the newly created link section smoothly
    setTimeout(() => {
      linkSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a new paste
        </h1>
      </div>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-background/60 backdrop-blur p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm select-none">
              <input
                type="checkbox"
                className="size-4 rounded border-black/20 dark:border-white/20"
                checked={usePassphrase}
                onChange={(e) => setUsePassphrase(e.target.checked)}
              />
              Protect with passphrase
            </label>
          </div>
          <button
            onClick={createPaste}
            disabled={
              isEncrypting || !text.trim() || (usePassphrase && !passphrase)
            }
            className="cursor-pointer inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white bg-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/90 transition"
          >
            {isEncrypting ? "Encrypting…" : "Encrypt & Create"}
          </button>
        </div>

        {usePassphrase && (
          <input
            type="password"
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 mb-3"
            placeholder="Enter passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
        )}

        <textarea
          className="w-full h-72 rounded-lg border border-black/10 dark:border-white/15 bg-transparent p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here…"
        />
      </div>

      {link && (
        <div
          ref={linkSectionRef}
          className="mt-6 rounded-xl border border-black/10 dark:border-white/10 bg-background/60 backdrop-blur p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono break-all text-sm flex-1 pr-2">
              {link}
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied("link");
                setTimeout(() => setCopied(null), 1500);
              }}
              className="cursor-pointer text-xs rounded-md border border-black/10 dark:border-white/20 px-2.5 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="mt-2 text-xs text-foreground/60">
            {usePassphrase ? (
              <span>Share the URL and the passphrase out-of-band.</span>
            ) : (
              <span>
                The key is stored after the # and never leaves the browser.
              </span>
            )}
          </div>
          {/* {deleteTokenB64u && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-foreground/60 truncate">
                Delete token saved locally. Keep it to delete later.
              </div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(deleteTokenB64u);
                  setCopied("token");
                  setTimeout(() => setCopied(null), 1500);
                }}
                className="cursor-pointer text-xs rounded-md border border-black/10 dark:border-white/20 px-2.5 py-1 hover:bg-black/5 dark:hover:bg.white/5 transition"
              >
                {copied === "token" ? "Copied" : "Copy delete token"}
              </button>
            </div>
          )} */}
        </div>
      )}
    </div>
  );
}
