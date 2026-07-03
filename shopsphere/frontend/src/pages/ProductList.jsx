import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import ProductCard from "../components/product/ProductCard";

const SORT_OPTIONS = [
  { value: "", label: "Latest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "best_selling", label: "Best Selling" },
  { value: "highest_rated", label: "Highest Rated" },
];

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get("page") || 1);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.data)).catch(() => {});
    api.get("/brands").then((r) => setBrands(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(searchParams.entries());
    api
      .get("/products", { params })
      .then((r) => {
        setProducts(r.data.data);
        setTotal(r.data.meta?.total || 0);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* Filters */}
        <aside className="space-y-6 md:col-span-1">
          <div>
            <h3 className="mb-2 font-display text-lg font-semibold">Category</h3>
            <select
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              value={searchParams.get("category_id") || ""}
              onChange={(e) => updateFilter("category_id", e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="mb-2 font-display text-lg font-semibold">Brand</h3>
            <select
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              value={searchParams.get("brand_id") || ""}
              onChange={(e) => updateFilter("brand_id", e.target.value)}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="mb-2 font-display text-lg font-semibold">Price Range</h3>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                className="w-1/2 rounded-lg border border-black/10 px-3 py-2 text-sm"
                defaultValue={searchParams.get("min_price") || ""}
                onBlur={(e) => updateFilter("min_price", e.target.value)}
              />
              <input
                type="number"
                placeholder="Max"
                className="w-1/2 rounded-lg border border-black/10 px-3 py-2 text-sm"
                defaultValue={searchParams.get("max_price") || ""}
                onBlur={(e) => updateFilter("max_price", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={searchParams.get("in_stock") === "true"}
              onChange={(e) => updateFilter("in_stock", e.target.checked ? "true" : "")}
            />
            In stock only
          </label>

          <button
            onClick={() => setSearchParams({})}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Clear all filters
          </button>
        </aside>

        {/* Product Grid */}
        <div className="md:col-span-3">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-900/60">{total} products found</p>
            <select
              className="rounded-lg border border-black/10 px-3 py-2 text-sm"
              value={searchParams.get("sort") || ""}
              onChange={(e) => updateFilter("sort", e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-ink-900/50">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-ink-900/50">No products match your filters.</p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {total > 20 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => updateFilter("page", String(page - 1))}
                className="rounded-lg border border-black/10 px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm">Page {page}</span>
              <button
                disabled={page * 20 >= total}
                onClick={() => updateFilter("page", String(page + 1))}
                className="rounded-lg border border-black/10 px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
