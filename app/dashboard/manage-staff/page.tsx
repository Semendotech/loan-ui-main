"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import toast from "react-hot-toast"

type StaffUser = {
  id: number
  username: string
  first_name?: string
  role: string
  created_at: string
}

type Role = {
  name: string
  description: string
}

export default function ManageStaffPage() {
  const { user } = useAuth()
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<StaffUser | null>(null)
  const [username, setUsername] = useState("")
  const [firstName, setFirstName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("loan_officer")

  useEffect(() => {
    fetchStaff()
    fetchRoles()
  }, [])

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const data = await api.get<StaffUser[]>("/users")
      setStaff(data)
    } catch (error) {
      console.error(error)
      toast.error("Unable to load staff list.")
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const data = await api.get<Role[]>("/users/roles")
      setRoles(data)
      if (data.length) {
        setRole(data[0].name)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setUsername("")
    setFirstName("")
    setPassword("")
    setRole("loan_officer")
  }

  const handleEdit = (staffUser: StaffUser) => {
    setEditing(staffUser)
    setUsername(staffUser.username)
    setFirstName(staffUser.first_name ?? "")
    setPassword("")
    setRole(staffUser.role)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    try {
      const payload: any = {
        username,
        first_name: firstName,
        role,
      }
      if (!editing) {
        if (!password) {
          toast.error("Password is required for new staff.")
          return
        }
        payload.password = password
      } else if (password) {
        payload.password = password
      }

      if (editing) {
        await api.put(`/users/${editing.id}`, payload)
        toast.success("Staff updated successfully.")
      } else {
        await api.post("/users", payload)
        toast.success("Staff created successfully.")
      }
      resetForm()
      fetchStaff()
    } catch (error: any) {
      toast.error(error?.message || "Failed to save staff user.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) {
      return
    }
    try {
      await api.delete(`/users/${id}`)
      toast.success("Staff deleted.")
      fetchStaff()
    } catch (error: any) {
      toast.error(error?.message || "Unable to delete user.")
    }
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4">Manage Staff</h1>
        <p className="text-gray-600">Only administrators may access this section.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Manage Staff</h1>
            <p className="text-gray-600">Create, edit, and remove loan officers and administrators.</p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg bg-green-600 text-white px-4 py-2 hover:bg-green-700 transition"
          >
            New Staff
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-slate-50 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4">Staff list</h2>
            {loading ? (
              <div>Loading staff users…</div>
            ) : (
              <div className="space-y-3">
                {staff.map((staffUser) => (
                  <div key={staffUser.id} className="flex flex-col gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <div className="font-medium">{staffUser.first_name ? `${staffUser.first_name} (${staffUser.username})` : staffUser.username}</div>
                        <div className="text-sm text-slate-500">{staffUser.role.replace("_", " ")}</div>
                      </div>
                      <div className="text-sm text-slate-500">Joined {new Date(staffUser.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleEdit(staffUser)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                      >Edit</button>
                      <button
                        type="button"
                        onClick={() => handleDelete(staffUser.id)}
                        className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm hover:bg-red-100"
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? "Edit Staff" : "Add New Staff"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>{r.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder={editing ? "Leave blank to keep existing password" : "Enter password"}
                  {...(!editing ? { required: true } : {})}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-600 text-white px-4 py-2 hover:bg-green-700 transition"
                >{saving ? "Saving…" : editing ? "Update Staff" : "Create Staff"}</button>
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                  >Cancel</button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
