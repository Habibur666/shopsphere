import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, Package, ShoppingBag, DollarSign, TrendingUp } from "lucide-react";
import api from "../../api/axios";

function Card({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-brand-50 p-2.5 text-brand-600"><Icon size={20} /></div>
        <div>
          <p className="text-xs text-ink-900/50">{label}</p>
          <p className="font-display text-xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [cards, setCards] = useState(null);
  const [sales, setSales] = useState([]);
  const [monthlyOrders, setMonthlyOrders] = useState([]);

  useEffect(() => {
    api.get("/admin/dashboard/cards").then((r) => setCards(r.data.data));
    api.get("/admin/dashboard/charts/sales").then((r) => setSales(r.data.data));
    api.get("/admin/dashboard/charts/monthly-orders").then((r) => setMonthlyOrders(r.data.data));
  }, []);

  if (!cards) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card icon={Users} label="Total Users" value={cards.total_users} />
        <Card icon={Package} label="Total Products" value={cards.total_products} />
        <Card icon={ShoppingBag} label="Total Orders" value={cards.total_orders} />
        <Card icon={DollarSign} label="Total Revenue" value={`৳${cards.total_revenue.toFixed(2)}`} />
        <Card icon={TrendingUp} label="Total Sales" value={cards.total_sales} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Sales (last 30 days)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#1F7A75" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Monthly Orders</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="order_count" fill="#E8A33D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
