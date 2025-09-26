import Link from "next/link";
import { FaGithub } from "react-icons/fa";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-black/5 dark:border-white/10">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          zerøpaste
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            target="_blank"
            href="https://github.com/davidhepp/zeropaste"
            className="rounded-md px-3 py-1.5 border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <FaGithub size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
