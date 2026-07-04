import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import api from "../../api/axios";

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [type, setType] = useState("homepage");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [image, setImage] = useState(null);

  const load = () => api.get("/banners").then((r) => setBanners(r.data.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!image) return toast.error("Please select an image");
    const fd = new FormData();
    fd.append("type", type);
    fd.append("title", title);
    fd.append("link_url", linkUrl);
    fd.append("image", image);
    try {
      await api.post("/banners", fd);
      toast.success("Banner created");
      setTitle(""); setLinkUrl(""); setImage(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create banner");
    }
  };

  const remove = async (id) => {
    if (!confirm("Remove this banner?")) return;
    await api.delete(`/banners/${id}`);
    toast.success("Banner removed");
    load();
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Banners</h1>

      <form onSubmit={submit} className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-5">
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
            <option value="homepage">Homepage</option>
            <option value="offer">Offer</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Link URL</label>
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-900/60">Image</label>
          <input required type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} className="text-sm" />
        </div>
        <button type="submit" className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
          <Plus size={16} /> Add
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {banners.map((b) => (
          <div key={b.id} className="rounded-2xl border border-black/10 bg-white p-3">
            <div className="aspect-video overflow-hidden rounded-xl bg-brand-50">
              <img src={b.image_path} alt={b.title} className="h-full w-full object-cover" />
            </div>
            <p className="mt-2 text-sm font-medium">{b.title || "(untitled)"}</p>
            <p className="text-xs capitalize text-ink-900/50">{b.type}</p>
            <button onClick={() => remove(b.id)} className="mt-2 text-red-500 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
