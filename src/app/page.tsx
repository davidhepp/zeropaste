import Link from "next/link";

export default function Home() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      <Link href="/new" className="bg-blue-500 text-white rounded-md p-2">
        Paste
      </Link>
    </div>
  );
}
