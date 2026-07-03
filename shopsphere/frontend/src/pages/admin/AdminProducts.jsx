import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, RotateCcw, Pencil } from "lucide-react";
import api from "../../api/axios";

const emptyForm = {
  name: "", category_id: "", brand_id: "", short_description: "", full_description: "",
  price: "", discount: "0", offer_price: "", cost_price: "", stock: "0", min_stock: "5",
  weight: "", dimensions: "", material: "", color: "", size: "", warranty: "", return_policy: "",
  is_featured: false, status: "draft",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [thumbnail, setThumbnail] = useState(null);
  const [gallery, setGallery] = useState([]);

  const load = () => {
    api.get("/products", { params: { status: "draft", limit: 100 } }).then((r) => {
      api.get("/products", { params: { status: "published", limit: 100 } }).then((r2) => {
        setProducts([...r.data.data, ...r2.data.data]);
      });
    });
  };

  useEffect(() => {
    load();
    api.get("/categories").then((r) => setCategories(r.data.data));
    api.get("/brands").then((r) => setBrands(r.data.data));
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setThumbnail(null);
    setGallery([]);
    setEditingId(null);
    setShowForm(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (thumbnail) fd.append("thumbnail", thumbnail);
    gallery.forEach((f) => fd.append("images", f));

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, fd);
        toast.success("Product updated");
      } else {
        await api.post("/products", fd);
        toast.success("Product created");
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  const editProduct = async (p) => {
    const { data } = await api.get(`/products/${p.id}`);
    const prod = data.data;
    setForm({
      name: prod.name || "", category_id: prod.category_id || "", brand_id: prod.brand_id || "",
      short_description: prod.short_description || "", full_description: prod.full_description || "",
      price: prod.price || "", discount: prod.discount || "0", offer_price: prod.offer_price || "",
      cost_price: prod.cost_price || "", stock: prod.stock || "0", min_stock: prod.min_stock || "5",
      weight: prod.weight || "", dimensions: prod.dimensions || "", material: prod.material || "",
      color: prod.color || "", size: prod.size || "", warranty: prod.warranty || "",
      return_policy: prod.return_policy || "", is_featured: !!prod.is_featured, status: prod.status,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!confirm("Move this product to trash?")) return;
    await api.delete(`/products/${id}`);
    toast.success("Product deleted");
    load();
  };

  const restore = async (id) => {
    await api.post(`/products/${id}/restore`);
    toast.success("Product restored");
    load();
  };

  const toggleStatus = async (p) => {
    const newStatus = p.status === "published" ? "draft" : "published";
    await api.patch(`/products/${p.id}/status`, { status: newStatus });
    toast.success(`Product ${newStatus}`);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-black/10 bg-white p-6 md:grid-cols-2">
          <input required placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
            <option value="">Select Category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
            <option value="">Select Brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input required type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Discount %" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input type="number" step="0.01" placeholder="Offer price" value={form.offer_price} onChange={(e) => setForm({ ...form, offer_price: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input type="number" placeholder="Min stock" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input placeholder="Size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input placeholder="Warranty" value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input placeholder="Return policy" value={form.return_policy} onChange={(e) => setForm({ ...form, return_policy: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />

          <textarea placeholder="Short description" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm md:col-span-2" rows={2} />
          <textarea placeholder="Full description" value={form.full_description} onChange={(e) => setForm({ ...form, full_description: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm md:col-span-2" rows={4} />

          <div>
            <label className="mb-1 block text-xs text-ink-900/60">Thumbnail</label>
            <input type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files[0])} className="text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-900/60">Gallery images</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setGallery(Array.from(e.target.files))} className="text-sm" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            Featured product
          </label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>

          <div className="flex gap-3 md:col-span-2">
            <button type="submit" className="rounded-full bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600">
              {editingId ? "Update Product" : "Create Product"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-full border border-black/10 px-6 py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase text-ink-900/50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">৳{Number(p.price).toFixed(2)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(p)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {p.status}
                  </button>
                </td>
                <td className="flex gap-2 px-4 py-3">
                  <button onClick={() => editProduct(p)} className="text-brand-600 hover:text-brand-700"><Pencil size={16} /></button>
                  <button onClick={() => remove(p.id)} className="text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
                  <button onClick={() => restore(p.id)} className="text-ink-900/40 hover:text-ink-900"><RotateCcw size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
