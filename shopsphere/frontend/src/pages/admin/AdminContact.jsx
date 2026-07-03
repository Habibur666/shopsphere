import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios";

export default function AdminContact() {
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");

  const load = () => api.get("/contact/admin/inbox").then((r) => setMessages(r.data.data));
  useEffect(() => { load(); }, []);

  const openMessage = async (id) => {
    const { data } = await api.get(`/contact/admin/${id}`);
    setSelected(data.data);
    load();
  };

  const sendReply = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/contact/admin/${selected.id}/reply`, { reply_text: replyText });
      toast.success("Reply sent");
      setReplyText("");
      openMessage(selected.id);
    } catch {
      toast.error("Failed to send reply");
    }
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Contact Inbox</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          {messages.map((m) => (
            <button
              key={m.id}
              onClick={() => openMessage(m.id)}
              className={`block w-full rounded-xl border p-3 text-left text-sm ${
                selected?.id === m.id ? "border-brand-500 bg-brand-50" : "border-black/10 bg-white"
              }`}
            >
              <div className="flex justify-between">
                <span className="font-medium">{m.name}</span>
                <span className={`text-xs ${m.status === "new" ? "text-amber-600" : "text-ink-900/40"}`}>{m.status}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-ink-900/60">{m.subject || m.message}</p>
            </button>
          ))}
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="font-medium">{selected.name} &lt;{selected.email}&gt;</p>
              <p className="mt-1 text-sm text-ink-900/50">{selected.subject}</p>
              <p className="mt-3 text-sm">{selected.message}</p>

              {selected.replies?.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-black/10 pt-4">
                  {selected.replies.map((r) => (
                    <div key={r.id} className="rounded-lg bg-brand-50 p-3 text-sm">
                      <p className="text-xs font-medium text-brand-700">{r.admin_name}</p>
                      <p>{r.reply_text}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={sendReply} className="mt-4">
                <textarea
                  required value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..." rows={3}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
                <button type="submit" className="mt-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
                  Send Reply
                </button>
              </form>
            </div>
          ) : (
            <p className="text-ink-900/50">Select a message to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
