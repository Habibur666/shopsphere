import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingBag, Tags, Award,
  Ticket, Image, MessageSquare, Users, ArrowLeft,
} from "lucide-react";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/brands", label: "Brands", icon: Award },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/banners", label: "Banners", icon: Image },
  { to: "/admin/contact", label: "Contact Inbox", icon: MessageSquare },
  { to: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-brand-50/30">
      <aside className="w-64 flex-shrink-0 bg-ink-950 text-white">
        <div className="p-6">
          <div className="font-display text-xl font-semibold">
            Shop<span className="text-brand-300">Sphere</span>
          </div>
          <p className="text-xs text-white/50">Admin Panel</p>
        </div>
        <nav className="space-y-1 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? "bg-brand-500 text-white" : "text-white/70 hover:bg-white/5"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 px-3">
          <NavLink to="/" className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/50 hover:text-white">
            <ArrowLeft size={16} /> Back to store
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
