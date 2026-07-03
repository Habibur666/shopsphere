import { Link } from "react-router-dom";
import { Star, Heart } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

export default function ProductCard({ product }) {
  const price = product.offer_price || product.price;
  const hasDiscount = product.offer_price && product.offer_price < product.price;

  const addToWishlist = async (e) => {
    e.preventDefault();
    try {
      await api.post("/wishlist", { product_id: product.id });
      toast.success("Added to wishlist");
    } catch (err) {
      toast.error(err.response?.data?.message || "Please sign in first");
    }
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-brand-50">
        {product.thumbnail ? (
          <img
            src={`/media/productThumbnail/${product.thumbnail}`}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-300">No image</div>
        )}
        <button
          onClick={addToWishlist}
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 opacity-0 shadow transition group-hover:opacity-100"
        >
          <Heart size={16} />
        </button>
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
            -{product.discount}%
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-medium text-ink-900">{product.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-ink-900/60">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          {Number(product.avg_rating || 0).toFixed(1)} ({product.review_count || 0})
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display text-lg font-semibold text-brand-700">৳{Number(price).toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-sm text-ink-900/40 line-through">৳{Number(product.price).toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
