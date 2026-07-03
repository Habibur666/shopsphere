import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios";

const NEXT_STATUS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  const load = () => {
    api.get("/orders/admin/all", { params: statusFilter ? { status: statusFilter } : {} })
      .then((r) => setOrders(r.data.data));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/admin/${id}/status`, { status });
      toast.success(`Order updated to ${status}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Orders</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase text-ink-900/50">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Update</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-black/5">
                <td className="px-4 py-3">{o.order_number}</td>
                <td className="px-4 py-3">{o.customer_name}<br /><span className="text-xs text-ink-900/40">{o.customer_email}</span></td>
                <td className="px-4 py-3">৳{Number(o.total_amount).toFixed(2)}</td>
                <td className="px-4 py-3 capitalize">{o.status}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {(NEXT_STATUS[o.status] || []).map((next) => (
                      <button
                        key={next}
                        onClick={() => updateStatus(o.id, next)}
                        className="rounded-full border border-black/10 px-2.5 py-1 text-xs capitalize hover:bg-black/5"
                      >
                        {next}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
