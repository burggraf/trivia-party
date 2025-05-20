<script lang="ts">
  import PageTemplate from "$lib/components/PageTemplate.svelte";
</script>

<PageTemplate>
  {#snippet TopCenter()}
    <h1 class="text-3xl font-bold text-gray-900">Data Deletion Policy</h1>
  {/snippet}

  {#snippet Middle()}
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="mb-8">
        <p class="text-sm text-gray-500">Last Updated: May 20, 2025</p>
      </div>

      <div class="space-y-12">
        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
          <p class="text-gray-700">This Data Deletion Policy outlines how Trivia Party handles user data deletion requests and our commitment to respecting your privacy rights.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">2. Your Rights to Data Deletion</h2>
          <p class="text-gray-700">You have the right to request the deletion of your personal information that we have collected from you. This includes:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li class="text-gray-700">Personal profile information</li>
            <li class="text-gray-700">Trivia game history</li>
            <li class="text-gray-700">Contact information</li>
            <li class="text-gray-700">Communication preferences</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">3. How to Request Data Deletion</h2>
          <p class="text-gray-700">To request the deletion of your personal information, you can:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li class="text-gray-700">Contact our support team at support@triviaparty.com</li>
            <li class="text-gray-700">Provide your account email address</li>
            <li class="text-gray-700">Confirm your identity</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">4. Exceptions to Data Deletion</h2>
          <p class="text-gray-700">We may retain certain information as required by law or for legitimate business purposes, including:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li class="text-gray-700">Information needed to complete transactions</li>
            <li class="text-gray-700">Data required for legal compliance</li>
            <li class="text-gray-700">Information needed to prevent fraud</li>
            <li class="text-gray-700">Account history for security purposes</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">5. Response Time</h2>
          <p class="text-gray-700">We aim to respond to your deletion request within 30 days. If we need more time, we will notify you and provide an estimated completion date.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">6. Verification Process</h2>
          <p class="text-gray-700">To protect your privacy, we will verify your identity before processing your deletion request. This may include:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li class="text-gray-700">Confirming your email address</li>
            <li class="text-gray-700">Verifying account ownership</li>
            <li class="text-gray-700">Answering security questions</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">7. Impact of Data Deletion</h2>
          <p class="text-gray-700">Please note that deleting your data may result in:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li class="text-gray-700">Loss of access to your account</li>
            <li class="text-gray-700">Deletion of your trivia game history</li>
            <li class="text-gray-700">Removal of your preferences and settings</li>
            <li class="text-gray-700">Inability to recover deleted information</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">8. Changes to This Policy</h2>
          <p class="text-gray-700">We may update this Data Deletion Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">9. Contact Us</h2>
          <p class="text-gray-700">If you have any questions about this Data Deletion Policy, please contact us at:</p>
          <p class="text-gray-700 mt-2">Email: support@triviaparty.com</p>
        </div>
      </div>
    </div>
  {/snippet}
</PageTemplate>
