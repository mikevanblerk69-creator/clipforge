export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-white">Privacy Policy</h1>
        <p className="text-gray-400 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>We collect your email address and name when you register. We collect usage data including videos generated, credits purchased, and session activity. Payment information is processed securely by PayFast — we do not store your card details.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>Your information is used to provide the Service, process payments, send transactional emails (e.g. video ready notifications), and improve the platform. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Data Storage</h2>
            <p>Your account data is stored securely on Supabase servers hosted in the European Union. Generated videos are stored for 30 days after creation and then deleted unless saved to your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Cookies</h2>
            <p>We use session cookies for authentication. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Your Rights (POPIA)</h2>
            <p>In accordance with South Africa's Protection of Personal Information Act (POPIA), you have the right to access, correct, or delete your personal information. Submit requests to <a href="mailto:privacy@clipforge.app" className="text-violet-400 hover:underline">privacy@clipforge.app</a></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Third-Party Services</h2>
            <p>We use Replicate for AI video generation, Supabase for database and authentication, and PayFast for payment processing. Each has their own privacy policy governing their data handling.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Contact</h2>
            <p>Privacy concerns: <a href="mailto:privacy@clipforge.app" className="text-violet-400 hover:underline">privacy@clipforge.app</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
