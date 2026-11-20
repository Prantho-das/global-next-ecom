import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Admin",
};

export default function AdminDashboardPage() {
  return (
    <section aria-labelledby="admin-dashboard-heading">
      <h1
        id="admin-dashboard-heading"
        style={{ fontSize: "1.75rem", marginTop: 0 }}
      >
        Dashboard
      </h1>
      <div className="row">
        <div className="col s12 m6 l4">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">RBAC &amp; Auth</span>
              <p>Phase 1 foundation initialized.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
