import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function Wishlist() {
  const [items, setItems] = useState([]);

  const load = () => api.get("/wishlist").then((r) => setItems(r.data.data));
  useEffect(() => { load(); }, []);

  const remove = async (productId) => {
    await api.delete(`/wishlist/${productId}`);
    toast.success("Removed from wishlist");
    load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink-900">My Wishlist</h1>

      {items.length === 0 ? (
        <p className="text-ink-900/60">Your wishlist is empty.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.wishlist_id} className="rounded-2xl border border-black/10 p-3">
              <Link to={`/products/${item.product_id}`}>
                <div className="aspect-square overflow-hidden rounded-xl bg-brand-50">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-medium">{item.name}</p>
                <p className="text-sm text-brand-700">৳{Number(item.offer_price || item.price).toFixed(2)}</p>
              </Link>
              <button
                onClick={() => remove(item.product_id)}
                className="mt-2 w-full rounded-full border border-black/10 py-1.5 text-xs font-medium hover:bg-black/5"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
