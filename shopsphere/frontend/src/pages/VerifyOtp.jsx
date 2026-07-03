import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { verifyOtp, resendOtp } from "../features/auth/authSlice";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dispatch(verifyOtp({ email, otp_code: otp })).unwrap();
      toast.success("Email verified! You can now log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await dispatch(resendOtp({ email })).unwrap();
      toast.success("A new OTP has been sent");
    } catch (err) {
      toast.error(err || "Could not resend OTP");
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-900">Verify your email</h1>
      <p className="mb-8 text-ink-900/60">Enter the 6-digit code we sent to your email address.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          required
          maxLength={6}
          placeholder="6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-center text-lg tracking-[0.5em] outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-500 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <button onClick={handleResend} className="mt-4 text-sm font-medium text-brand-600 hover:underline">
        Resend OTP
      </button>

      <p className="mt-6 text-center text-sm text-ink-900/60">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
