<script lang="ts">
  import PageTemplate from "$lib/components/PageTemplate.svelte";
</script>

<PageTemplate>
  {#snippet TopCenter()}
    <h1 class="text-3xl font-bold">Privacy Policy</h1>
  {/snippet}

  {#snippet Middle()}
    <div class="max-w-4xl mx-auto px-4 py-8 legal-page">
      <div class="mb-8">
        <p class="last-updated text-sm">Last Updated: May 20, 2025</p>
      </div>

      <div class="space-y-12">
        <div>
          <h2 class="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>Welcome to Trivia Party! This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          
          <div class="space-y-8">
            <div>
              <h3 class="text-xl font-medium mb-3">2.1 Personal Information</h3>
              <p>We may collect personal information that you voluntarily provide to us, such as:</p>
              <ul class="list-disc pl-6 space-y-2 mt-2">
                <li>Name</li>
                <li>Email address</li>
                <li>Contact information</li>
                <li>Trivia preferences and settings</li>
              </ul>
            </div>

            <div>
              <h3 class="text-xl font-medium mb-3">2.2 Usage Data</h3>
              <p>We automatically collect certain information when you use our services, including:</p>
              <ul class="list-disc pl-6 space-y-2 mt-2">
                <li>Device information</li>
                <li>Browser type and version</li>
                <li>IP address</li>
                <li>Usage statistics</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Provide and maintain our services</li>
            <li>Improve our services</li>
            <li>Respond to your inquiries</li>
            <li>Send you notifications and updates</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">4. Sharing Your Information</h2>
          <p>We may share your information with:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Service providers who assist us in providing our services</li>
            <li>Legal authorities when required by law</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your personal information</li>
            <li>Object to processing of your personal information</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">6. Security</h2>
          <p>We implement appropriate security measures to protect your personal information from unauthorized access, disclosure, or alteration.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">7. Children's Privacy</h2>
          <p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">8. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <p class="mt-2">Email: support@triviaparty.com</p>
        </div>
      </div>
    </div>
  {/snippet}
</PageTemplate>
