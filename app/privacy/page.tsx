export default function PrivacyPolicy() {
  return (
    <main style={{
      fontFamily: "'IBM Plex Mono', monospace",
      maxWidth: "680px",
      margin: "0 auto",
      padding: "80px 24px",
      color: "#111",
      backgroundColor: "#fff",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        h1 { font-size: 18px; font-weight: 500; margin: 0 0 8px 0; letter-spacing: 0.02em; }
        h2 { font-size: 13px; font-weight: 500; margin: 40px 0 12px 0; text-transform: uppercase; letter-spacing: 0.08em; }
        p, li { font-size: 13px; line-height: 1.8; color: #333; margin: 0 0 12px 0; }
        ul { padding-left: 20px; margin: 0 0 12px 0; }
        li { margin-bottom: 4px; }
        .meta { font-size: 12px; color: #888; margin-bottom: 48px; }
        hr { border: none; border-top: 2px solid #111; margin: 0 0 48px 0; }
        a { color: #111; }
      `}</style>

      <h1>Privacy Policy</h1>
      <p className="meta">TRACES — TRACESla.com<br />Effective date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      <hr />

      <h2>Overview</h2>
      <p>
        TRACES is a cultural place discovery platform operated by Saiko. This Privacy Policy explains how we collect, use, and handle information when you use our website and services at TRACESla.com.
      </p>

      <h2>Information We Collect</h2>
      <p>We may collect the following types of information:</p>
      <ul>
        <li><strong>Usage data</strong> — pages visited, time spent, referring URLs, and browser type, collected automatically when you access our site.</li>
        <li><strong>Contact information</strong> — name and email address, if you choose to contact us or sign up for updates.</li>
        <li><strong>Public social media data</strong> — publicly available information from Instagram and other platforms, including business profile information, posts, and engagement data, used to inform our place coverage.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To operate and improve the TRACES platform and its place discovery features.</li>
        <li>To analyze usage patterns and inform editorial decisions.</li>
        <li>To respond to inquiries or support requests.</li>
        <li>To surface accurate, culturally relevant information about places and businesses.</li>
      </ul>

      <h2>Instagram and Meta Data</h2>
      <p>
        TRACES uses the Instagram Graph API to access publicly available business profile data, including bios, posts, and engagement metrics. This data is used solely to enrich place profiles within the TRACES platform. We do not store personal user data obtained through Instagram beyond what is necessary for platform operation, and we do not sell or share this data with third parties.
      </p>
      <p>
        Our use of Instagram data complies with Meta's Platform Terms and Developer Policies.
      </p>

      <h2>Data Sharing</h2>
      <p>
        We do not sell your personal information. We do not share your information with third parties except as necessary to operate the platform (e.g., hosting providers, analytics tools) or as required by law.
      </p>

      <h2>Data Retention</h2>
      <p>
        We retain usage data for as long as necessary to operate and improve the platform. You may request deletion of any personal information you have provided to us by contacting us directly.
      </p>

      <h2>Cookies</h2>
      <p>
        We may use cookies and similar tracking technologies to understand how users interact with TRACESla.com. You can disable cookies in your browser settings, though some features may not function as intended.
      </p>

      <h2>Your Rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, or delete personal information we hold about you. To exercise these rights, contact us at the address below.
      </p>

      <h2>Children's Privacy</h2>
      <p>
        TRACES is not directed at children under the age of 13. We do not knowingly collect personal information from children.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about this Privacy Policy or your data, contact us at:<br />
        <a href="mailto:Support@saikoSPORT.com">Support@saikoSPORT.com</a>
      </p>
    </main>
  );
}
