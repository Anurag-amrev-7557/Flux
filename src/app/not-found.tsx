import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">404 - Page Not Found</h2>
            <p className="text-sm text-slate-500 mb-6">The page you are looking for does not exist.</p>
            <Link
                href="/"
                className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
                Return Home
            </Link>
        </div>
    );
}
