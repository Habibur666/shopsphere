import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink-950 text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <div className="font-display text-xl font-semibold text-white">
              Shop<span className="text-brand-300">Sphere</span>
            </div>
            <p className="mt-3 text-sm">Everything you need, delivered with care.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-white">All Products</Link></li>
              <li><Link to="/products?featured=true" className="hover:text-white">Featured</Link></li>
              <li><Link to="/wishlist" className="hover:text-white">Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/orders" className="hover:text-white">My Orders</Link></li>
              <li><Link to="/profile" className="hover:text-white">My Profile</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs">
          © {new Date().getFullYear()} ShopSphere. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
