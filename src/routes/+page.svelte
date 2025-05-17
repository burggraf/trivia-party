<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import DarkModeToggle from "$lib/components/DarkModeToggle.svelte";
  import LanguageSelector from "$lib/components/LanguageSelector.svelte";
</script>

<div class="min-h-screen flex flex-col">
  <!-- Hero Section -->
  <main class="flex-1 container mx-auto px-4 py-16">
    <div class="text-center max-w-3xl mx-auto">
      <h1
        class="text-4xl font-bold tracking-tight sm:text-6xl mb-6 flex flex-col items-center gap-4"
      >
        <img src="/icon.svg" alt="Trivia Party Logo" class="w-32 h-32" />
        Trivia Party
      </h1>
      <div class="flex justify-center gap-4">
        <a href="/dashboard">
          <Button size="lg">Get Started</Button>
        </a>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="text-center p-6 border rounded-lg shadow-sm">
        <h2 class="text-xl font-semibold mb-4">Feature 1</h2>
        <p class="text-muted-foreground text-left space-y-2">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
      <div class="text-center p-6 border rounded-lg shadow-sm">
        <h2 class="text-xl font-semibold mb-4">Feature 2</h2>
        <p class="text-muted-foreground text-left space-y-2">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
      <div class="text-center p-6 border rounded-lg shadow-sm">
        <h2 class="text-xl font-semibold mb-4">Feature 3</h2>
        <p class="text-muted-foreground text-left space-y-2">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
      <div class="text-center p-6 border rounded-lg shadow-sm">
        <h2 class="text-xl font-semibold mb-4">Feature 4</h2>
        <p class="text-muted-foreground text-left space-y-2">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
    </div>
  </main>

  <footer class="border-t mt-8">
    <div class="container mx-auto px-4 py-6">
      <div
        class="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground"
      >
        <a href="/about" class="hover:text-foreground transition-colors"
          >About</a
        >
        <a href="/privacy" class="hover:text-foreground transition-colors"
          >Privacy Policy</a
        >
        <a href="/terms" class="hover:text-foreground transition-colors"
          >Terms of Service</a
        >
        <a href="/pricing" class="hover:text-foreground transition-colors"
          >Pricing</a
        >
      </div>
    </div>
  </footer>

  <div class="fixed bottom-4 right-4 flex gap-2">
    <DarkModeToggle />
    <LanguageSelector />
  </div>
</div>
