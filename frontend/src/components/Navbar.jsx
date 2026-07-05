import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();
  const linkClass = (path) =>
    `px-4 py-2.5 text-sm font-semibold transition-all duration-300 rounded-full ${
      pathname === path 
        ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30" 
        : "text-slate-600 hover:text-blue-700 hover:bg-blue-50"
    }`;

  return (
    <nav className="glass sticky top-0 z-50 transition-all duration-300 border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-3 justify-between items-center">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 group">
          <div className="text-3xl transform group-hover:scale-110 transition-transform duration-300">📊</div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            InsightAI
          </span>
        </Link>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link to="/" className={linkClass("/")}>Home</Link>
          <Link to="/upload" className={linkClass("/upload")}>Upload Data</Link>
          <Link to="/dashboard" className={linkClass("/dashboard")}>Dashboard</Link>
          {/* <button className="ml-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 transform">
            Sign In
          </button> */}
        </div>
      </div>
    </nav>
  );
}
