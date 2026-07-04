import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Star, Heart } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import { addToCart } from "../features/cart/cartSlice";
import ProductCard from "../components/product/ProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, review_text: "" });

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => {
      setProduct(r.data.data);
      setActiveImage(r.data.data.thumbnail);
    });
    api.get(`/products/${id}/related`).then((r) => setRelated(r.data.data)).catch(() => {});
    api.get(`/reviews/product/${id}`).then((r) => setReviews(r.data.data)).catch(() => {});
  }, [id]);

  if (!product) return <div className="mx-auto max-w-7xl px-4 py-16">Loading...</div>;

  const price = selectedVariant?.price || product.offer_price || product.price;

  const handleAddToCart = async () => {
    try {
      await dispatch(
        addToCart({ product_id: product.id, variant_id: selectedVariant?.id || null, quantity })
      ).unwrap();
      toast.success("Added to cart");
    } catch {
      toast.error("Could not add to cart");
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      const form = new FormData();
      form.append("rating", reviewForm.rating);
      form.append("review_text", reviewForm.review_text);
      await api.post(`/reviews/product/${id}`, form);
      toast.success("Review submitted");
      const r = await api.get(`/reviews/product/${id}`);
      setReviews(r.data.data);
      setReviewForm({ rating: 5, review_text: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Sign in to leave a review");
    }
  };

  const gallery = [{ image_path: product.thumbnail }, ...(product.images || [])];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-brand-50">
            {activeImage && (
              <img
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto">
            {gallery.filter((g) => g.image_path).map((g, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(g.image_path)}
                className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                  activeImage === g.image_path ? "border-brand-500" : "border-transparent"
                }`}
              >
                <img
                  src={g.image_path}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
            {product.category_name}{product.brand_name ? ` · ${product.brand_name}` : ""}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">{product.name}</h1>

          <div className="mt-2 flex items-center gap-1 text-sm text-ink-900/60">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            {Number(product.avg_rating).toFixed(1)} ({product.review_count} reviews)
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-semibold text-brand-700">৳{Number(price).toFixed(2)}</span>
            {product.offer_price && (
              <span className="text-lg text-ink-900/40 line-through">৳{Number(product.price).toFixed(2)}</span>
            )}
          </div>

          <p className="mt-4 text-ink-900/70">{product.short_description}</p>

          {product.variants?.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Select Variant</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`rounded-full border px-4 py-1.5 text-sm ${
                      selectedVariant?.id === v.id
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-black/10"
                    }`}
                  >
                    {[v.color, v.size, v.ram, v.storage].filter(Boolean).join(" / ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-black/10">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2">-</button>
              <span className="px-3">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2">+</button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="flex-1 rounded-full bg-brand-500 px-6 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-40"
            >
              {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
            </button>
            <button
              onClick={async () => {
                try {
                  await api.post("/wishlist", { product_id: product.id });
                  toast.success("Added to wishlist");
                } catch {
                  toast.error("Sign in to use wishlist");
                }
              }}
              className="rounded-full border border-black/10 p-3 hover:bg-black/5"
            >
              <Heart size={20} />
            </button>
          </div>

          <div className="mt-8 space-y-1 text-sm text-ink-900/70">
            {product.warranty && <p><strong>Warranty:</strong> {product.warranty}</p>}
            {product.return_policy && <p><strong>Return Policy:</strong> {product.return_policy}</p>}
            {product.material && <p><strong>Material:</strong> {product.material}</p>}
            {product.weight && <p><strong>Weight:</strong> {product.weight} kg</p>}
          </div>
        </div>
      </div>

      {/* Full description */}
      {product.full_description && (
        <section className="mt-14 max-w-3xl">
          <h2 className="mb-3 font-display text-xl font-semibold">Product Description</h2>
          <p className="whitespace-pre-line text-ink-900/70">{product.full_description}</p>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-14 max-w-3xl">
        <h2 className="mb-4 font-display text-xl font-semibold">Customer Reviews</h2>

        <form onSubmit={submitReview} className="mb-8 rounded-2xl border border-black/10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-medium">Your rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setReviewForm({ ...reviewForm, rating: n })}
              >
                <Star
                  size={18}
                  className={n <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-black/20"}
                />
              </button>
            ))}
          </div>
          <textarea
            value={reviewForm.review_text}
            onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })}
            placeholder="Share your thoughts about this product..."
            className="w-full rounded-lg border border-black/10 p-3 text-sm"
            rows={3}
          />
          <button type="submit" className="mt-3 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Submit Review
          </button>
        </form>

        <div className="space-y-5">
          {reviews.length === 0 && <p className="text-ink-900/50">No reviews yet. Be the first!</p>}
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-black/5 pb-5">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.user_name}</span>
                {r.is_verified_purchase ? (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">Verified Purchase</span>
                ) : null}
              </div>
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={12} className={n <= r.rating ? "fill-amber-400 text-amber-400" : "text-black/15"} />
                ))}
              </div>
              <p className="mt-2 text-sm text-ink-900/70">{r.review_text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-xl font-semibold">You may also like</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
