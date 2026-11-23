import type { Metadata } from "next";

import { TrackOrderClient } from "@/components/store/track-order-client";

export const metadata: Metadata = {
  title: "অর্ডার ট্র্যাক করুন | BASA World",
  description: "আপনার ফোন নম্বর এবং ওটিপি দিয়ে ডেলিভারি অগ্রগতি যাচাই করুন।",
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; order?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="py-6 font-sans">
      <div className="text-center max-w-xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
          অর্ডার ট্র্যাকিং সেবা
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          আপনার অর্ডারকৃত অর্গানিক খাদ্যপণ্যের বর্তমান অবস্থান ও ডেলিভারি স্ট্যাটাস জানতে নিচের ফর্মটি পূরণ করুন।
        </p>
      </div>
      <TrackOrderClient
        initialPhone={params.phone ?? ""}
        initialOrder={params.order ?? ""}
      />
    </div>
  );
}
