import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Search, ShoppingCart, Heart, User, Menu, X } from "lucide-react";
import { logoutUser } from "../../features/auth/authSlice";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useSelector((s) => s.auth);
  const cartCount = useSelector((s) => s.cart.items.length);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-ink-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
            Shop<span className="text-brand-300">Sphere</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden flex-1 max-w-xl md:flex">
            <div className="relative w-full">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-full bg-ink-900 py-2 pl-4 pr-10 text-sm text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-brand-300"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                <Search size={16} />
              </button>
            </div>
          </form>

          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/wishlist" className="text-white/80 hover:text-white" aria-label="Wishlist">
              <Heart size={20} />
            </Link>
            <Link to="/cart" className="relative text-white/80 hover:text-white" aria-label="Cart">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-ink-950">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="group relative">
                <button className="flex items-center gap-1 text-white/80 hover:text-white">
                  <User size={20} />
                  <span className="text-sm">{user.name?.split(" ")[0]}</span>
                </button>
                <div className="invisible absolute right-0 top-full w-44 rounded-lg bg-white py-2 text-ink-900 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                  <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-brand-50">My Profile</Link>
                  <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-brand-50">My Orders</Link>
                  {["admin", "super_admin"].includes(user.role) && (
                    <Link to="/admin" className="block px-4 py-2 text-sm hover:bg-brand-50">Admin Panel</Link>
                  )}
                  <button
                    onClick={() => dispatch(logoutUser())}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium hover:bg-brand-600"
              >
                Sign in
              </Link>
            )}
          </nav>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-3 border-t border-white/10 py-4 md:hidden">
            <form onSubmit={handleSearch}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-full bg-ink-900 px-4 py-2 text-sm outline-none ring-1 ring-white/10"
              />
            </form>
            <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
            <Link to="/cart" onClick={() => setMenuOpen(false)}>Cart ({cartCount})</Link>
            {user ? (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)}>My Profile</Link>
                <Link to="/orders" onClick={() => setMenuOpen(false)}>My Orders</Link>
                {["admin", "super_admin"].includes(user.role) && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</Link>
                )}
                <button onClick={() => dispatch(logoutUser())} className="text-left text-red-400">Logout</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
