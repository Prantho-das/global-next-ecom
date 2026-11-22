"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import {
  assignUserRoleAction,
  createRoleAction,
  createStaffUserAction,
  removeUserRoleAction,
  updateRolePermissionsAction,
} from "@/modules/rbac/actions";

export interface RolesManagerProps {
  roles: ReadonlyArray<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isSystem: boolean;
  }>;
  permissions: ReadonlyArray<{
    id: string;
    resource: string;
    action: string;
    key: string;
  }>;
  initialRolePermissions: Record<string, string[]>;
  staffUsers: ReadonlyArray<{
    id: string;
    name: string;
    email: string;
    roles: ReadonlyArray<{ roleId: string; roleName: string; roleSlug: string }>;
  }>;
}

const INPUT_CLS =
  "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";
const LABEL_CLS = "block text-xs font-semibold text-slate-600 mb-1";

export function RolesManager({
  roles,
  permissions,
  initialRolePermissions,
  staffUsers,
}: RolesManagerProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [selectedUserId, setSelectedUserId] = useState(staffUsers[0]?.id ?? "");
  const [assignRoleId, setAssignRoleId] = useState(roles[0]?.id ?? "");

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [permRoleId, setPermRoleId] = useState(roles[0]?.id ?? "");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(
    initialRolePermissions[roles[0]?.id ?? ""] ?? [],
  );

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const groupedPerms = new Map<
    string,
    Array<{ id: string; action: string; key: string }>
  >();
  for (const p of permissions) {
    const list = groupedPerms.get(p.resource) ?? [];
    list.push({ id: p.id, action: p.action, key: p.key });
    groupedPerms.set(p.resource, list);
  }

  function handleSelectPermRole(nextRoleId: string) {
    setPermRoleId(nextRoleId);
    setSelectedPerms(initialRolePermissions[nextRoleId] ?? []);
  }

  function togglePerm(permId: string) {
    setSelectedPerms((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId],
    );
  }

  function toggleResourcePerms(
    items: ReadonlyArray<{ id: string }>,
    selectAll: boolean,
  ) {
    const ids = items.map((i) => i.id);
    if (selectAll) {
      setSelectedPerms((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      setSelectedPerms((prev) => prev.filter((id) => !ids.includes(id)));
    }
  }

  async function handleSavePermissions() {
    if (permRoleId === "") return;
    setSaving(true);
    setMsg(null);
    const res = await updateRolePermissionsAction({
      roleId: permRoleId,
      permissionIds: selectedPerms,
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    setMsg({
      ok: true,
      text: `Updated ${selectedPerms.length} permissions for role.`,
    });
    router.refresh();
  }

  async function handleCreateRole(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await createRoleAction({
      name: newRoleName,
      description: newRoleDesc.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    setNewRoleName("");
    setNewRoleDesc("");
    setMsg({ ok: true, text: "Custom role created." });
    router.refresh();
  }

  async function handleCreateStaff(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await createStaffUserAction({ name, email, password, roleId });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    const createdEmail = email;
    setName("");
    setEmail("");
    setPassword("");
    setMsg({ ok: true, text: `Staff user ${createdEmail} created.` });
    router.refresh();
  }

  async function handleAssignRole(e: FormEvent) {
    e.preventDefault();
    if (selectedUserId === "" || assignRoleId === "") {
      return;
    }
    setSaving(true);
    const res = await assignUserRoleAction({
      userId: selectedUserId,
      roleId: assignRoleId,
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    setMsg({ ok: true, text: "Role assigned." });
    router.refresh();
  }

  async function handleRemoveRole(userId: string, rId: string) {
    const res = await removeUserRoleAction({ userId, roleId: rId });
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {msg !== null && (
        <div
          role="status"
          className={`p-3 rounded text-xs font-medium border ${
            msg.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Create Staff User
            </h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className={LABEL_CLS}>Full Name</label>
                <input
                  type="text"
                  required
                  className={INPUT_CLS}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Email</label>
                <input
                  type="email"
                  required
                  className={INPUT_CLS}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Password (min 8 chars)</label>
                <input
                  type="password"
                  minLength={8}
                  required
                  className={INPUT_CLS}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Initial Role</label>
                <select
                  className={INPUT_CLS}
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.slug})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
              >
                {saving ? "Creating..." : "Create Staff"}
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Assign Role to User
            </h3>
            <form onSubmit={handleAssignRole} className="space-y-3">
              <div>
                <label className={LABEL_CLS}>User</label>
                <select
                  className={INPUT_CLS}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Role</label>
                <select
                  className={INPUT_CLS}
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded"
              >
                Assign Role
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Create Custom Role
            </h3>
            <form onSubmit={handleCreateRole} className="space-y-3">
              <div>
                <label className={LABEL_CLS}>Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="Warehouse Manager"
                  className={INPUT_CLS}
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Description</label>
                <input
                  type="text"
                  placeholder="Manages stock and orders"
                  className={INPUT_CLS}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded"
              >
                Create Role
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/80">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Roles ({roles.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Slug</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Permissions</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {roles.map((r) => {
                    const permCount = (initialRolePermissions[r.id] ?? []).length;
                    const isSelected = permRoleId === r.id;
                    return (
                      <tr
                        key={r.id}
                        className={
                          isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50/70"
                        }
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {r.name}
                          </div>
                          {r.description && (
                            <div className="text-[11px] text-slate-400">
                              {r.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                          {r.slug}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              r.isSystem
                                ? "bg-slate-100 text-slate-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {r.isSystem ? "System" : "Custom"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                          {permCount}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleSelectPermRole(r.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            }`}
                          >
                            {isSelected ? "Editing" : "Edit Permissions"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/80">
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Users &amp; Assigned Roles ({staffUsers.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {staffUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {u.name}
                        </div>
                        <div className="text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {u.roles.length === 0 ? (
                            <span className="text-slate-400">No roles</span>
                          ) : (
                            u.roles.map((r) => (
                              <span
                                key={r.roleId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold"
                              >
                                <span>{r.roleName}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveRole(u.id, r.roleId)
                                  }
                                  className="hover:text-rose-600"
                                  title="Remove role"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
            <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">
                  Menu &amp; Resource Permissions Table
                </h3>
                <p className="text-xs text-slate-500 m-0">
                  Assign `view` permission to show sidebar menu, plus create/update/delete
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Select role for permissions"
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                  value={permRoleId}
                  onChange={(e) => handleSelectPermRole(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSavePermissions}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
                >
                  {saving ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Resource / Menu</th>
                    <th className="py-2.5 px-4">Permissions</th>
                    <th className="py-2.5 px-4 text-right">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {Array.from(groupedPerms.entries()).map(([resource, list]) => {
                    const allChecked = list.every((i) =>
                      selectedPerms.includes(i.id),
                    );
                    return (
                      <tr key={resource} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold uppercase text-slate-800 whitespace-nowrap">
                          {resource}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap gap-3">
                            {list.map((p) => (
                              <label
                                key={p.id}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPerms.includes(p.id)}
                                  onChange={() => togglePerm(p.id)}
                                />
                                <span>{p.action}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              toggleResourcePerms(list, !allChecked)
                            }
                            className="text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            {allChecked ? "Clear" : "Select All"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
