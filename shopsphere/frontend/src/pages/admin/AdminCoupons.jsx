import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import api from "../../api/axios";

const emptyForm = {
  code: "", type: "percentage", value: "", min_order_amount: "0",
  max_discount_amount: "", usage_type: "single", usage_limit: "", expires_at: "",
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const load = () => api.get("/coupons").then((r) => setCoupons(r.data.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/coupons", form);
      toast.success("Coupon created");
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create coupon");
    }
  };

  const remove = async (id) => {
    if (!confirm("Deactivate this coupon?")) return;
    await api.delete(`/coupons/${id}`);
    toast.success("Coupon deactivated");
    load();
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Coupons</h1>

      <form onSubmit={submit} className="mb-8 grid grid-cols-2 gap-3 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-4">
        <input required placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
          <option value="percentage">Percentage</option>
          <option value="flat">Flat</option>
        </select>
        <input required type="number" step="0.01" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <input type="number" step="0.01" placeholder="Min order amount" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <input type="number" step="0.01" placeholder="Max discount cap" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <select value={form.usage_type} onChange={(e) => setForm({ ...form, usage_type: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
          <option value="single">Single use</option>
          <option value="multiple">Multiple use</option>
        </select>
        <input type="number" placeholder="Usage limit" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <button type="submit" className="flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
          <Plus size={16} /> Add Coupon
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase text-ink-900/50">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-medium">{c.code}</td>
                <td className="px-4 py-3 capitalize">{c.type}</td>
                <td className="px-4 py-3">{c.type === "percentage" ? `${c.value}%` : `৳${c.value}`}</td>
                <td className="px-4 py-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">{c.is_active ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(c.id)} className="text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
