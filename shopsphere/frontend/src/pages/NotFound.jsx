import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-7xl font-semibold text-brand-500">404</h1>
      <p className="mt-3 text-ink-900/60">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
        Back to Home
      </Link>
    </div>
  );
}
