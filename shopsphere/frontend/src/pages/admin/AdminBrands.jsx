import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import api from "../../api/axios";

export default function AdminBrands() {
  const [brands, setBrands] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState(null);

  const load = () => api.get("/brands", { params: { limit: 100 } }).then((r) => setBrands(r.data.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", name);
    fd.append("description", description);
    if (logo) fd.append("logo", logo);
    try {
      await api.post("/brands", fd);
      toast.success("Brand created");
      setName(""); setDescription(""); setLogo(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create brand");
    }
  };

  const remove = async (id) => {
    if (!confirm("Deactivate this brand?")) return;
    await api.delete(`/brands/${id}`);
    toast.success("Brand removed");
    load();
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Brands</h1>

      <form onSubmit={submit} className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-5">
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Logo</label>
          <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files[0])} className="text-sm" />
        </div>
        <button type="submit" className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
          <Plus size={16} /> Add
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {brands.map((b) => (
          <div key={b.id} className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-2 h-16 w-16 overflow-hidden rounded-xl bg-brand-50">
              {b.logo && <img src={`/media/brandLogo/${b.logo}`} alt="" className="h-full w-full object-cover" />}
            </div>
            <p className="text-sm font-medium">{b.name}</p>
            <button onClick={() => remove(b.id)} className="mt-2 text-red-500 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
