import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import ProductCard from "../components/product/ProductCard";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    api.get("/products", { params: { featured: "true", limit: 8 } })
      .then((r) => setFeatured(r.data.data))
      .catch(() => {});
    api.get("/categories").then((r) => setCategories(r.data.data.slice(0, 6))).catch(() => {});
    api.get("/banners", { params: { type: "homepage" } }).then((r) => setBanners(r.data.data)).catch(() => {});
  }, []);

  const hero = banners[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-300">
              New season, new finds
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Shop the sphere of <span className="text-brand-300">everything you need</span>
            </h1>
            <p className="mt-4 max-w-md text-white/70">
              Curated products, honest prices, and doorstep delivery — cash on delivery, no hassle.
            </p>
            <Link
              to="/products"
              className="mt-8 inline-block rounded-full bg-brand-500 px-7 py-3 font-medium hover:bg-brand-600"
            >
              Explore Products
            </Link>
          </div>
          {hero?.image_path && (
            <img
              src={`/media/bannerImages/${hero.image_path}`}
              alt={hero.title || "Banner"}
              className="w-full rounded-2xl object-cover shadow-2xl"
            />
          )}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Shop by Category</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?category_id=${c.id}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-black/5 p-4 text-center transition hover:shadow-md"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-50">
                  {c.image ? (
                    <img src={`/media/categoryImages/${c.image}`} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-brand-500 font-display text-lg">{c.name[0]}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-ink-900 group-hover:text-brand-600">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Featured Products</h2>
          <Link to="/products" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-ink-900/50">No featured products yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
