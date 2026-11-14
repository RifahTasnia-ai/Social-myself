import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F6F3EC] text-[#1A1D24] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-[#FBF9F5] border border-[#E2DDD2] rounded-xl p-8 text-center shadow-xs">
        <p className="font-mono text-xs uppercase tracking-widest text-[#2D4B73] mb-2">
          404 · Page Not Found
        </p>
        <h1 className="font-display text-3xl font-semibold text-[#1A1D24] mb-3">
          Kotonoha Studio
        </h1>
        <p className="text-sm text-[#5A6065] mb-6 leading-relaxed">
          The workspace route you requested could not be found. Return to the main keyword and feed studio to continue.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-9 px-4 bg-[#2D4B73] hover:bg-[#223A59] text-[#FBF9F5] text-xs font-medium rounded-[3px] transition-colors"
        >
          Return to Studio
        </Link>
      </div>
    </main>
  );
}
