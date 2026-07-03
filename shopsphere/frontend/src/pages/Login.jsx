import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { loginUser } from "../features/auth/authSlice";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((s) => s.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(loginUser(form)).unwrap();
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(err || "Login failed");
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-900">Welcome back</h1>
      <p className="mb-8 text-ink-900/60">Sign in to your ShopSphere account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <label className="flex items-center gap-2 text-sm text-ink-900/70">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-full bg-brand-500 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {status === "loading" ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-900/60">
        Don't have an account?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">Create one</Link>
      </p>
    </div>
  );
}
