"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { changeOwnPasswordAction } from "@/modules/rbac/actions";

export interface ProfileManagerProps {
  userName: string;
  userEmail: string;
}

const INPUT_CLS =
  "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";
const LABEL_CLS = "block text-xs font-semibold text-slate-600 mb-1";

export function ProfileManager({ userName, userEmail }: ProfileManagerProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    setSaving(true);
    const res = await changeOwnPasswordAction({
      currentPassword,
      newPassword,
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMsg({ ok: true, text: "Password updated successfully." });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-slate-900 m-0">My Account</h3>
        <div className="text-xs text-slate-500">Name</div>
        <div className="text-sm font-semibold text-slate-900">{userName}</div>
        <div className="text-xs text-slate-500 pt-2">Email</div>
        <div className="text-sm font-semibold text-slate-900">{userEmail}</div>
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 m-0">
          Change Password
        </h3>
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
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          <div>
            <label className={LABEL_CLS}>Current Password</label>
            <input
              type="password"
              required
              className={INPUT_CLS}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>New Password (min 8 chars)</label>
            <input
              type="password"
              minLength={8}
              required
              className={INPUT_CLS}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Confirm New Password</label>
            <input
              type="password"
              minLength={8}
              required
              className={INPUT_CLS}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded shadow-sm"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
