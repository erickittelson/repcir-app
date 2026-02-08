import { getSession } from "@/lib/neon-auth";
import { SupportForm } from "@/components/support/support-form";
import { ChevronLeft, HelpCircle, MessageSquare, FileText } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Support",
  description: "Get help with Repcir",
};

export default async function SupportPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-[var(--repcir-black)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--repcir-black)]/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/you"
            className="p-2 -ml-2 text-white/60 hover:text-white transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-white">Support</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Link
            href="/faq"
            className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition"
          >
            <HelpCircle className="w-6 h-6 text-[var(--earned-gold)]" />
            <span className="text-xs text-white/60">FAQ</span>
          </Link>
          <Link
            href="mailto:support@repcir.com"
            className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition"
          >
            <MessageSquare className="w-6 h-6 text-[var(--earned-gold)]" />
            <span className="text-xs text-white/60">Email Us</span>
          </Link>
          <Link
            href="/terms"
            className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition"
          >
            <FileText className="w-6 h-6 text-[var(--earned-gold)]" />
            <span className="text-xs text-white/60">Terms</span>
          </Link>
        </div>

        {/* Contact Form */}
        <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-1">Contact Us</h2>
          <p className="text-sm text-white/50 mb-6">
            We typically respond within 24 hours.
          </p>
          <SupportForm
            userEmail={session?.user?.email || undefined}
            userName={session?.user?.name || undefined}
          />
        </div>
      </main>
    </div>
  );
}
