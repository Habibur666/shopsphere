import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  const load = () => api.get(`/orders/${id}`).then((r) => setOrder(r.data.data));

  useEffect(() => { load(); }, [id]);

  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16">Loading...</div>;

  const cancelOrder = async () => {
    if (!confirm("Cancel this order?")) return;
    try {
      await api.post(`/orders/${id}/cancel`);
      toast.success("Order cancelled");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel order");
    }
  };

  const reorder = async () => {
    try {
      await api.post(`/orders/${id}/reorder`);
      toast.success("Items added to cart");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reorder");
    }
  };

  const downloadInvoice = async () => {
    const res = await api.get(`/orders/${id}/invoice`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${order.order_number}.pdf`;
    a.click();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Order {order.order_number}</h1>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium capitalize text-brand-700">
          {order.status}
        </span>
      </div>

      <div className="mb-6 rounded-2xl border border-black/10 p-5 text-sm">
        <p><strong>Shipping to:</strong> {order.shipping_name}, {order.shipping_phone}</p>
        <p className="mt-1">{order.shipping_address}</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-black/10 p-5">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.product_name_snapshot} × {item.quantity}</span>
            <span>৳{Number(item.line_subtotal).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-black/10 pt-3 text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>৳{Number(order.subtotal_amount).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>৳{Number(order.shipping_charge).toFixed(2)}</span></div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-brand-600"><span>Discount</span><span>-৳{Number(order.discount_amount).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-base font-semibold pt-1"><span>Total</span><span>৳{Number(order.total_amount).toFixed(2)}</span></div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={downloadInvoice} className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium hover:bg-black/5">
          Download Invoice
        </button>
        <button onClick={reorder} className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium hover:bg-black/5">
          Reorder
        </button>
        {!["delivered", "cancelled", "returned"].includes(order.status) && (
          <button onClick={cancelOrder} className="rounded-full bg-red-50 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-100">
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
