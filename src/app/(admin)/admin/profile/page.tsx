import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileManager } from "@/components/admin/profile-manager";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "My Profile & Password | Admin",
};

export default async function AdminProfilePage() {
  const session = await getSession();
  if (session === null) {
    redirect("/admin/login");
  }

  return (
    <section aria-labelledby="profile-heading" className="space-y-4">
      <h2 id="profile-heading" className="sr-only">
        My Profile &amp; Password
      </h2>
      <ProfileManager
        userName={session.user.name}
        userEmail={session.user.email}
      />
    </section>
  );
}
