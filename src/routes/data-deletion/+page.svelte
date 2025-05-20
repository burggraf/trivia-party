<script lang="ts">
  import PageTemplate from "$lib/components/PageTemplate.svelte";
</script>

<PageTemplate>
  {#snippet TopCenter()}
    <h1 class="text-3xl font-bold">Data Deletion Request</h1>
  {/snippet}

  {#snippet Middle()}
    <div class="max-w-4xl mx-auto px-4 py-8 legal-page">
      <div class="mb-8">
        <p class="last-updated text-sm">Last Updated: May 20, 2025</p>
      </div>

      <div class="space-y-12">
        <div>
          <h2 class="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>This Data Deletion Policy outlines how Trivia Party handles user data deletion requests and our commitment to respecting your privacy rights.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">2. Your Rights to Data Deletion</h2>
          <p>You have the right to request the deletion of your personal information that we have collected from you. This includes:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Personal profile information</li>
            <li>Trivia game history</li>
            <li>Contact information</li>
            <li>Communication preferences</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">3. How to Request Data Deletion</h2>
          <p>To request the deletion of your personal information, you can:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Contact our support team at support@triviaparty.com</li>
            <li>Provide your account email address</li>
            <li>Confirm your identity</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">4. Exceptions to Data Deletion</h2>
          <p>We may retain certain information as required by law or for legitimate business purposes, including:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Information needed to complete transactions</li>
            <li>Data required for legal compliance</li>
            <li>Information needed to prevent fraud</li>
            <li>Account history for security purposes</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">5. Response Time</h2>
          <p>We aim to respond to your deletion request within 30 days. If we need more time, we will notify you and provide an estimated completion date.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">6. Verification Process</h2>
          <p>To protect your privacy, we will verify your identity before processing your deletion request. This may include:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Confirming your email address</li>
            <li>Verifying account ownership</li>
            <li>Answering security questions</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">7. Impact of Data Deletion</h2>
          <p>Please note that deleting your data may result in:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Loss of access to your account</li>
            <li>Deletion of your trivia game history</li>
            <li>Removal of your preferences and settings</li>
            <li>Inability to recover deleted information</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
          <p>We may update this Data Deletion Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p>If you have any questions about this Data Deletion Policy, please contact us at:</p>
          <p class="mt-2">Email: support@triviaparty.com</p>
        </div>
      </div>
    </div>
  {/snippet}
</PageTemplate>
