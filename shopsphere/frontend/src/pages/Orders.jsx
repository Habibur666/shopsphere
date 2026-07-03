import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  packed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-gray-100 text-gray-700",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders").then((r) => setOrders(r.data.data));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink-900">My Orders</h1>

      {orders.length === 0 ? (
        <p className="text-ink-900/60">You haven't placed any orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              to={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-2xl border border-black/10 p-5 hover:shadow-md"
            >
              <div>
                <p className="font-medium text-ink-900">{o.order_number}</p>
                <p className="text-sm text-ink-900/50">{new Date(o.placed_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">৳{Number(o.total_amount).toFixed(2)}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_COLORS[o.status]}`}>
                  {o.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
