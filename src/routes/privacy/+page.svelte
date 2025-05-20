<script lang="ts">
  import PageTemplate from "$lib/components/PageTemplate.svelte";
</script>

<PageTemplate>
  {#snippet TopCenter()}
    <h1 class="text-3xl font-bold text-gray-900">Privacy Policy</h1>
  {/snippet}

  {#snippet Middle()}
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="mb-8">
        <p class="text-sm text-gray-500">Last Updated: May 20, 2025</p>
      </div>

      <div class="space-y-12">
        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
          <p class="text-gray-700">Welcome to Trivia Party! This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
          
          <div class="space-y-8">
            <div>
              <h3 class="text-xl font-medium text-gray-800 mb-3">2.1 Personal Information</h3>
              <p class="text-gray-700">We may collect personal information that you voluntarily provide to us, such as:</p>
              <ul class="list-disc pl-6 space-y-2 mt-2">
                <li class="text-gray-700">Name</li>
                <li class="text-gray-700">Email address</li>
                <li class="text-gray-700">Contact information</li>
                <li class="text-gray-700">Trivia preferences and settings</li>
              </ul>
            </div>

            <div>
              <h3 class="text-xl font-medium text-gray-800 mb-3">2.2 Usage Data</h3>
              <p class="text-gray-700">We automatically collect certain information when you use our services, including:</p>
              <ul class="list-disc pl-6 space-y-2 mt-2">
                <li class="text-gray-700">Device information</li>
                <li class="text-gray-700">Browser type and version</li>
                <li class="text-gray-700">IP address</li>
                <li class="text-gray-700">Usage statistics</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
          <p class="text-gray-700">We use your information to:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li class="text-gray-700">Provide and maintain our services</li>
            <li class="text-gray-700">Improve our services</li>
            <li class="text-gray-700">Respond to your inquiries</li>
            <li class="text-gray-700">Send you notifications and updates</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Sharing Your Information</h2>
          <p class="text-gray-700">We may share your information with:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li class="text-gray-700">Service providers who assist us in providing our services</li>
            <li class="text-gray-700">Legal authorities when required by law</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights</h2>
          <p class="text-gray-700">You have the right to:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li class="text-gray-700">Access your personal information</li>
            <li class="text-gray-700">Correct inaccurate information</li>
            <li class="text-gray-700">Delete your personal information</li>
            <li class="text-gray-700">Object to processing of your personal information</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">6. Security</h2>
          <p class="text-gray-700">We implement appropriate security measures to protect your personal information from unauthorized access, disclosure, or alteration.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">7. Children's Privacy</h2>
          <p class="text-gray-700">Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">8. Changes to This Privacy Policy</h2>
          <p class="text-gray-700">We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">9. Contact Us</h2>
          <p class="text-gray-700">If you have any questions about this Privacy Policy, please contact us at:</p>
          <p class="text-gray-700 mt-2">Email: support@triviaparty.com</p>
        </div>
      </div>
    </div>
  {/snippet}
</PageTemplate>
