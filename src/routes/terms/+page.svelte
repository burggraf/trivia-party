<script lang="ts">
  import PageTemplate from "$lib/components/PageTemplate.svelte";
  /*
  const actionItems: any[] = [
    {
      groupName: "Group Header Here",
      groupItems: [
        {
          icon: IconFromLucide,
          label: "Item Label Here",
          onClick: () => {console.log("item was clicked")},
        },
      ],
    }
  ];
  */
</script>

<PageTemplate>
  {#snippet TopCenter()}
    <h1 class="text-3xl font-bold">Terms of Service</h1>
  {/snippet}

  {#snippet Middle()}
    <div class="max-w-4xl mx-auto px-4 py-8 legal-page">
      <div class="mb-8">
        <p class="last-updated text-sm">Last Updated: May 20, 2025</p>
      </div>

      <div class="space-y-12">
        <div>
          <h2 class="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p>Welcome to Trivia Party! By accessing or using our services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">2. Service Description</h2>
          <p>Trivia Party provides a platform for playing trivia games and managing trivia parties. Our services include:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Creating and managing trivia games</li>
            <li>Inviting players to participate</li>
            <li>Tracking game scores and statistics</li>
            <li>Managing player contacts and parties</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul class="list-disc pl-6 space-y-2 mt-2">
            <li>Provide accurate and complete information</li>
            <li>Maintain the confidentiality of your account credentials</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Use the services for legitimate purposes only</li>
          </ul>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
          <p>All content on the Trivia Party platform, including but not limited to text, graphics, and software, is the property of Trivia Party and is protected by copyright laws.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">5. Account Termination</h2>
          <p>We reserve the right to terminate or suspend your account if you violate these Terms of Service or engage in any prohibited activities.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
          <p>Trivia Party shall not be liable for any indirect, incidental, or consequential damages arising out of the use of our services.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">7. Changes to Terms</h2>
          <p>We may update these Terms of Service from time to time. Your continued use of the services constitutes acceptance of any changes.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">8. Governing Law</h2>
          <p>These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction where Trivia Party is headquartered.</p>
        </div>

        <div>
          <h2 class="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p>If you have any questions about these Terms of Service, please contact us at:</p>
          <p class="mt-2">Email: support@triviaparty.com</p>
        </div>
      </div>
    </div>
  {/snippet}

  <!--{#snippet BottomLeft()}{/snippet}-->
  <!--{#snippet BottomCenter()}{/snippet}-->
  <!--{#snippet BottomRight()}{/snippet}-->
</PageTemplate>
