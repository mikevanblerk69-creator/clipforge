export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-white">Terms of Service</h1>
        <p className="text-gray-400 mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ClipForge ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>ClipForge is an AI-powered video generation platform. Users purchase credits to generate videos using artificial intelligence models. Credits are consumed upon successful video generation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Credits and Payments</h2>
            <p>Credits are purchased via PayFast and are non-refundable once consumed. Unused credits may be refunded within 7 days of purchase if no videos have been generated. All prices are in South African Rand (ZAR) unless otherwise stated.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. User Content</h2>
            <p>You retain ownership of content you create using ClipForge. You are responsible for ensuring you have the rights to any input material (images, audio, text) you submit. You grant ClipForge a limited licence to process your content solely for the purpose of generating your requested output.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Prohibited Use</h2>
            <p>You may not use ClipForge to create content that is illegal, defamatory, deceptive, or that infringes third-party intellectual property rights. We reserve the right to terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Limitation of Liability</h2>
            <p>ClipForge is provided "as is". We do not guarantee uninterrupted service. Our liability is limited to the value of credits purchased in the 30 days prior to any claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:support@clipforge.app" className="text-violet-400 hover:underline">support@clipforge.app</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
