import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ old_password: "", new_password: "" });
  const navigate = useNavigate();

  const load = () => api.get("/users/profile").then((r) => setProfile(r.data.data));
  useEffect(() => { load(); }, []);

  if (!profile) return <div className="mx-auto max-w-2xl px-4 py-16">Loading...</div>;

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put("/users/profile", profile);
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update profile");
    }
  };

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("image", file);
    try {
      const { data } = await api.post("/users/profile/image", form);
      setProfile({ ...profile, profile_img: data.data.profile_img });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/change-password", passwordForm);
      toast.success("Password changed");
      setPasswordForm({ old_password: "", new_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not change password");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    await api.delete("/users/account");
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink-900">My Profile</h1>

      <div className="mb-8 flex items-center gap-5">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-brand-50">
          {profile.profile_img && (
            <img src={profile.profile_img} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <label className="cursor-pointer rounded-full border border-black/10 px-4 py-2 text-sm hover:bg-black/5">
          Change Photo
          <input type="file" accept="image/*" onChange={uploadImage} className="hidden" />
        </label>
      </div>

      <div className="mb-8 flex gap-6 text-sm text-ink-900/60">
        <span><strong className="text-ink-900">{profile.order_count}</strong> orders</span>
        <span><strong className="text-ink-900">{profile.review_count}</strong> reviews</span>
      </div>

      <form onSubmit={saveProfile} className="space-y-4">
        <input
          placeholder="Full name" value={profile.name || ""}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
        />
        <input
          placeholder="Phone" value={profile.phone || ""}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-4">
          <select
            value={profile.gender || ""}
            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
            className="rounded-xl border border-black/10 px-4 py-3 text-sm"
          >
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input
            type="date" value={profile.date_of_birth?.split("T")[0] || ""}
            onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
            className="rounded-xl border border-black/10 px-4 py-3 text-sm"
          />
        </div>
        <textarea
          placeholder="Address" value={profile.address_line || ""}
          onChange={(e) => setProfile({ ...profile, address_line: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm" rows={2}
        />
        <div className="grid grid-cols-3 gap-4">
          <input placeholder="City" value={profile.city || ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className="rounded-xl border border-black/10 px-4 py-3 text-sm" />
          <input placeholder="State" value={profile.state || ""} onChange={(e) => setProfile({ ...profile, state: e.target.value })} className="rounded-xl border border-black/10 px-4 py-3 text-sm" />
          <input placeholder="Postal Code" value={profile.postal_code || ""} onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })} className="rounded-xl border border-black/10 px-4 py-3 text-sm" />
        </div>
        <button type="submit" className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
          Save Changes
        </button>
      </form>

      <hr className="my-10 border-black/10" />

      <h2 className="mb-4 font-display text-xl font-semibold">Change Password</h2>
      <form onSubmit={changePassword} className="space-y-4">
        <input
          type="password" required placeholder="Current password"
          value={passwordForm.old_password}
          onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
        />
        <input
          type="password" required minLength={6} placeholder="New password"
          value={passwordForm.new_password}
          onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
        />
        <button type="submit" className="rounded-full border border-black/10 px-6 py-2.5 text-sm font-medium hover:bg-black/5">
          Update Password
        </button>
      </form>

      <hr className="my-10 border-black/10" />

      <button onClick={deleteAccount} className="text-sm font-medium text-red-600 hover:underline">
        Delete my account
      </button>
    </div>
  );
}
