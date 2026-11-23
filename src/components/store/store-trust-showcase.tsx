import {
  Globe,
  HeartHandshake,
  Leaf,
  Package,
  ShieldCheck,
  Truck,
} from "@/components/store/icons";

export function StoreTrustShowcase() {
  const leftFeatures = [
    {
      title: "১০০% খাঁটি ও প্রাকৃতিক মধু",
      desc: "BASA World সরবরাহ করে ল্যাব টেস্টেড খাঁটি অর্গানিক মধু, যার রয়েছে বিশুদ্ধ স্বাদ ও পুষ্টির পূর্ণ নিশ্চয়তা।",
      icon: Leaf,
    },
    {
      title: "বিশুদ্ধ, স্বাস্থ্যকর ও নিরাপদ খাদ্য",
      desc: "আমাদের প্রতিটি খাদ্যপণ্য ভেজালমুক্ত, নিরাপদ ও স্বাস্থ্যসম্মত পরিবেশে পরম যত্নে প্যাকেটজাত করা হয়।",
      icon: Package,
    },
    {
      title: "ন্যায্যমূল্যে প্রিমিয়াম কোয়ালিটি",
      desc: "আমরা সেরা মানের খাঁটি পণ্য পৌঁছে দিই সবার সাধ্যের মধ্যে, যাতে পরিবারের সুস্থতা নিশ্চিত হয় প্রতিদিন।",
      icon: HeartHandshake,
    },
  ];

  const rightFeatures = [
    {
      title: "বিশ্বস্ত তাজা ও ফ্রেশ নিশ্চয়তা",
      desc: "সরাসরি নিজস্ব সোর্সিং থেকে শুরু করে হাইজিনিক প্যাকেজিং পর্যন্ত প্রতিটি ধাপে সর্বোচ্চ ফ্রেশনেস বজায় রাখা হয়।",
      icon: ShieldCheck,
    },
    {
      title: "২৪/৭ নির্ভরযোগ্য কাস্টমার সাপোর্ট",
      desc: "যেকোনো জিজ্ঞাসা, পরামর্শ কিংবা প্রোডাক্ট সম্পর্কিত সহায়তায় আমাদের আন্তরিক সাপোর্ট টিম সবসময় আপনার পাশে।",
      icon: Truck,
    },
    {
      title: "আস্থা ও সততায় প্রতিষ্ঠিত ব্র্যান্ড",
      desc: "হাজারো সচেতন পরিবারের প্রথম পছন্দ BASA World, কারণ আমরা সততা, বিশুদ্ধতা ও পারিবারিক সুস্থতাকে সর্বোচ্চ মূল্যায়ন করি।",
      icon: Globe,
    },
  ];

  return (
    <section
      aria-labelledby="trust-showcase-title"
      className="w-full bg-gradient-to-b from-[#EBF7EF] via-[#F4FAF6] to-[#E2F5E9] rounded-2xl border border-[#5F9118]/20 p-5 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden my-8 font-sans"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-white/50 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <span className="text-xs font-bold tracking-[0.2em] text-[#5F9118] uppercase inline-block mb-1.5">
          অর্গানিক • শতভাগ খাঁটি • স্বাস্থ্যকর
        </span>
        <h2
          id="trust-showcase-title"
          className="text-xl sm:text-3xl lg:text-4xl font-black text-[#0F2920] tracking-tight leading-snug sm:leading-tight"
        >
          বিশুদ্ধতার বিশ্বস্ত প্রতীক, সেরা মানে সেরা পছন্দ
        </h2>
        <p className="text-xs sm:text-sm text-[#637381] mt-2.5 leading-relaxed">
          BASA World-এ আমরা আপনার ও আপনার পরিবারের জন্য নিয়ে আসি শতভাগ
          কেমিক্যালমুক্ত ও স্বাস্থ্যসম্মত অর্গানিক খাদ্যপণ্য। সুন্দরবনের খাঁটি
          মধু, কাঠের ঘানির সরিষার তেল, প্রিমিয়াম গাওয়া ঘি থেকে শুরু করে বাছাইকৃত
          বাদাম ও খাদ্যশস্য—প্রতিটি পণ্য বিশুদ্ধতা ও শ্রেষ্ঠত্বের নিশ্চয়তা বহন করে।
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        <div className="lg:col-span-6 space-y-6">
          {leftFeatures.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-full bg-[#5F9118] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#5F9118]/25 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-[#0F2920] leading-snug group-hover:text-[#5F9118] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#637381] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-6 space-y-6">
          {rightFeatures.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-full bg-[#5F9118] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#5F9118]/25 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-[#0F2920] leading-snug group-hover:text-[#5F9118] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#637381] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
