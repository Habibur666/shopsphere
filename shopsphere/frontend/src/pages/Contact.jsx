import { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast.error("Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-900">Contact Us</h1>
      <p className="mb-8 text-ink-900/60">Have a question? Send us a message and we'll respond shortly.</p>

      <form onSubmit={submit} className="space-y-4">
        <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm" />
        <input required type="email" placeholder="Your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm" />
        <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm" />
        <textarea required placeholder="Your message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm" />
        <button type="submit" disabled={sending} className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
          {sending ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
