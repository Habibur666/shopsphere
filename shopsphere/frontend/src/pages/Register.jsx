import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { registerUser } from "../features/auth/authSlice";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((s) => s.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(registerUser(form)).unwrap();
      toast.success("OTP sent to your email");
      navigate("/verify-otp", { state: { email: form.email } });
    } catch (err) {
      toast.error(err || "Registration failed");
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-900">Create your account</h1>
      <p className="mb-8 text-ink-900/60">Join ShopSphere in seconds</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="email"
          required
          placeholder="Email address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          placeholder="Phone number (optional)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 characters)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-full bg-brand-500 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {status === "loading" ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-900/60">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
