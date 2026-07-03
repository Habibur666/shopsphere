import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axios";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  const load = () => api.get("/admin/users").then((r) => setUsers(r.data.data));
  useEffect(() => { load(); }, []);

  const toggleStatus = async (u) => {
    await api.patch(`/admin/users/${u.id}/status`, { is_active: !u.is_active });
    toast.success("User status updated");
    load();
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold">Users</h1>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase text-ink-900/50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-black/5">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role_name}</td>
                <td className="px-4 py-3">{u.is_email_verified ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(u)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
