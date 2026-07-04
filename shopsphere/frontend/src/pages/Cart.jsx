import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Trash2 } from "lucide-react";
import { fetchCart, updateCartItem, removeCartItem } from "../features/cart/cartSlice";

export default function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items } = useSelector((s) => s.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const activeItems = items.filter((i) => !i.is_saved_for_later);
  const subtotal = activeItems.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink-900">Your Cart</h1>

      {activeItems.length === 0 ? (
        <div className="rounded-2xl border border-black/10 p-10 text-center">
          <p className="text-ink-900/60">Your cart is empty.</p>
          <Link to="/products" className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2 text-white">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {activeItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-black/10 p-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-brand-50">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-ink-900">{item.name}</p>
                  <p className="text-sm text-ink-900/60">৳{Number(item.unit_price).toFixed(2)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => dispatch(updateCartItem({ item_id: item.id, quantity: Math.max(1, item.quantity - 1) }))}
                      className="rounded-full border border-black/10 px-2.5 py-0.5"
                    >-</button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => dispatch(updateCartItem({ item_id: item.id, quantity: item.quantity + 1 }))}
                      className="rounded-full border border-black/10 px-2.5 py-0.5"
                    >+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">৳{(Number(item.unit_price) * item.quantity).toFixed(2)}</p>
                  <button
                    onClick={() => dispatch(removeCartItem(item.id))}
                    className="mt-2 text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="h-fit rounded-2xl border border-black/10 p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Order Summary</h2>
            <div className="flex justify-between text-sm text-ink-900/70">
              <span>Subtotal</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-ink-900/40">Shipping & tax calculated at checkout</p>
            <button
              onClick={() => navigate("/checkout")}
              className="mt-5 w-full rounded-full bg-brand-500 py-3 font-medium text-white hover:bg-brand-600"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
