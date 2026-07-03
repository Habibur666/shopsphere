import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import api from "../api/axios";
import { fetchCart } from "../features/cart/cartSlice";

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items } = useSelector((s) => s.cart);
  const [shipping, setShipping] = useState({ name: "", phone: "", address: "", billing_address: "" });
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const activeItems = items.filter((i) => !i.is_saved_for_later);
  const subtotal = activeItems.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);
  const shippingCharge = 60;
  const total = subtotal - discount + shippingCharge;

  const applyCoupon = async () => {
    try {
      const { data } = await api.post("/coupons/validate", { code: couponCode, subtotal });
      setDiscount(data.data.discount);
      toast.success(`Coupon applied: -৳${data.data.discount}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid coupon");
      setDiscount(0);
    }
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setPlacing(true);
    try {
      const { data } = await api.post("/orders/checkout", {
        shipping_info: shipping,
        coupon_code: couponCode || undefined,
      });
      toast.success("Order placed successfully!");
      navigate(`/orders/${data.data.order_id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  if (activeItems.length === 0) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink-900/60">Your cart is empty.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink-900">Checkout</h1>

      <form onSubmit={placeOrder} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Shipping Information</h2>
          <input
            required placeholder="Full name" value={shipping.name}
            onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          />
          <input
            required placeholder="Phone number" value={shipping.phone}
            onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          />
          <textarea
            required placeholder="Shipping address" value={shipping.address}
            onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm" rows={3}
          />
          <textarea
            placeholder="Billing address (optional, same as shipping if left blank)"
            value={shipping.billing_address}
            onChange={(e) => setShipping({ ...shipping, billing_address: e.target.value })}
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm" rows={2}
          />
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700">
            Payment Method: <strong>Cash on Delivery</strong>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-black/10 p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Order Summary</h2>
          <div className="space-y-2 text-sm">
            {activeItems.map((i) => (
              <div key={i.id} className="flex justify-between text-ink-900/70">
                <span>{i.name} × {i.quantity}</span>
                <span>৳{(Number(i.unit_price) * i.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              placeholder="Coupon code" value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <button type="button" onClick={applyCoupon} className="rounded-lg border border-black/10 px-4 text-sm">
              Apply
            </button>
          </div>

          <div className="mt-4 space-y-1 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>৳{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>৳{shippingCharge.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-brand-600"><span>Discount</span><span>-৳{discount.toFixed(2)}</span></div>}
            <div className="flex justify-between pt-2 text-base font-semibold"><span>Total</span><span>৳{total.toFixed(2)}</span></div>
          </div>

          <button
            type="submit" disabled={placing}
            className="mt-5 w-full rounded-full bg-brand-500 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {placing ? "Placing order..." : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
