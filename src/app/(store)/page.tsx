import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Storefront | All-in-One E-Commerce",
  description: "Welcome to our online store",
};

export default function StoreHomePage() {
  return (
    <main className="container" style={{ paddingTop: "48px" }}>
      <div className="card-panel white">
        <h1 style={{ fontSize: "2rem", marginTop: 0 }}>Storefront</h1>
        <p>Foundation ready. Storefront catalog arrives in Phase 3.</p>
        <Link href="/admin" className="btn waves-effect waves-light">
          Go to Admin
        </Link>
      </div>
    </main>
  );
}
