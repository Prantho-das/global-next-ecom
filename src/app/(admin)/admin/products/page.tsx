import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { checkPermission } from "@/lib/guard";
import { formatBdt } from "@/lib/money";
import { listProductsCursor } from "@/modules/catalog/queries";

export const metadata: Metadata = {
  title: "Products | Admin",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; q?: string; status?: string }>;
}) {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!(await checkPermission(userId, "product:view"))) {
    redirect("/admin");
  }

  const params = await searchParams;
  const page = await listProductsCursor({
    cursor: params.cursor ?? null,
    search: params.q,
    status: params.status,
  });

  return (
    <section aria-labelledby="products-heading">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 id="products-heading" style={{ fontSize: "1.75rem", margin: 0 }}>
          Products
        </h1>
        <Link href="/admin/products/new" className="btn waves-effect waves-light">
          New Product
        </Link>
      </div>

      <div className="card white">
        <div className="card-content">
          {page.items.length === 0 ? (
            <p className="grey-text">No products found.</p>
          ) : (
            <table className="striped responsive-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Brand</th>
                  <th>Base Price</th>
                  <th>Variants</th>
                  <th>Total Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.status}</td>
                    <td>{item.brandName ?? "—"}</td>
                    <td>{formatBdt(item.basePrice)}</td>
                    <td>{item.variantCount}</td>
                    <td>{item.totalStock}</td>
                    <td>
                      <Link
                        href={`/admin/products/${item.id}`}
                        className="btn-small"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {page.nextCursor !== null && (
            <div style={{ marginTop: "16px" }}>
              <Link
                href={`/admin/products?cursor=${encodeURIComponent(page.nextCursor)}`}
                className="btn-flat"
              >
                Next Page
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
