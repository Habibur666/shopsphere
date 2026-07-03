import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import api from "../../api/axios";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [flat, setFlat] = useState([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [image, setImage] = useState(null);

  const load = () => api.get("/categories").then((r) => {
    setCategories(r.data.data);
    const list = [];
    const walk = (nodes, depth = 0) => nodes.forEach((n) => { list.push({ ...n, depth }); walk(n.children, depth + 1); });
    walk(r.data.data);
    setFlat(list);
  });

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", name);
    if (parentId) fd.append("parent_id", parentId);
    if (image) fd.append("image", image);
    try {
      await api.post("/categories", fd);
      toast.success("Category created");
      setName(""); setParentId(""); setImage(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create category");
    }
  };

  const remove = async (id) => {
    if (!confirm("Deactivate this category?")) return;
    await api.delete(`/categories/${id}`);
    toast.success("Category removed");
    load();
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Categories</h1>

      <form onSubmit={submit} className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-5">
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Parent Category</label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
            <option value="">None (top-level)</option>
            {flat.map((c) => <option key={c.id} value={c.id}>{"—".repeat(c.depth)} {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Image</label>
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} className="text-sm" />
        </div>
        <button type="submit" className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
          <Plus size={16} /> Add
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {flat.map((c) => (
          <div key={c.id} className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-2 h-16 w-16 overflow-hidden rounded-xl bg-brand-50">
              {c.image && <img src={`/media/categoryImages/${c.image}`} alt="" className="h-full w-full object-cover" />}
            </div>
            <p className="text-sm font-medium">{"—".repeat(c.depth)} {c.name}</p>
            <button onClick={() => remove(c.id)} className="mt-2 text-red-500 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
