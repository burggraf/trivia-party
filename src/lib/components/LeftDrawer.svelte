<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import SearchForm from "$lib/components/search-form.svelte";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import OrgSwitcher from "@/components/org-switcher.svelte";
  import {
    GalleryVerticalEnd,
    Minus,
    Plus,
    AudioWaveform,
    Command,
    Settings,
    BookOpen,
    Code,
    Box,
    SwatchBook,
    Sparkles,
    Mail,
    Users,
  } from "lucide-svelte";
  import NavUser from "$lib/components/nav-user.svelte";
  import type { ComponentProps } from "svelte";
  import { sidebarState } from "./LeftDrawer.svelte.ts";
  import { getUser } from "@/services/backend.svelte.ts";
  import { t } from "$lib/i18n/index.svelte.ts";

  const user = $derived(getUser());

  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  const navMain = $derived([
    {
      title: $t("menu.messages.title"),
      url: "#",
      icon: Mail,
      isActive: false,
      items: [
        {
          title: $t("menu.messages.inbox"),
          url: "/messages",
        },
      ],
    },
    {
      title: $t("menu.people.title"),
      url: "#",
      icon: Users,
      isActive: false,
      items: [
        {
          title: $t("menu.people.contacts"),
          url: "/contacts",
        },
      ],
    },
    {
      title: $t("menu.properties.title"),
      url: "#",
      icon: Sparkles,
      isActive: false,
      items: [
        {
          title: $t("menu.properties.list"),
          url: "/properties",
        },
        {
          title: $t("menu.properties.map"),
          url: "/properties/map",
        },
        {
          title: $t("menu.properties.simpleMap"),
          url: "/map",
        },
        {
          title: $t("menu.properties.organizations"),
          url: "/orgs",
        },
      ],
    },
    {
      title: $t("menu.information.title"),
      url: "#",
      icon: BookOpen,
      isOpen: false,
      items: [
        {
          title: $t("menu.information.about"),
          url: "/about",
        },
        {
          title: $t("menu.information.terms"),
          url: "/terms",
        },
        {
          title: $t("menu.information.privacy"),
          url: "/privacy",
        },
      ],
    },
    {
      title: $t("menu.samples.title"),
      url: "#",
      icon: Sparkles,
      isActive: false,
      items: [
        {
          title: $t("menu.samples.alert"),
          url: "/samples/alert",
        },
        {
          title: $t("menu.samples.loading"),
          url: "/samples/loading",
        },
      ],
    },
  ]);

  $effect(() => {
    // Set initial open state based on stored state
    navMain.forEach((item) => {
      if (
        sidebarState?.openMenus &&
        Array.isArray(sidebarState.openMenus) &&
        sidebarState.openMenus.includes(item.title)
      ) {
        item.isOpen = true;
      }
    });
  });
</script>

<Sidebar.Root class="z-50">
  <Sidebar.Header>
    <div class="pt-[var(--safe-area-inset-top,0px)]">
      <OrgSwitcher />
    </div>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.Menu>
        <SearchForm />
        {#each navMain as mainItem, index (mainItem.title)}
          <Collapsible.Root
            open={sidebarState?.openMenus &&
              Array.isArray(sidebarState.openMenus) &&
              sidebarState.openMenus.includes(mainItem.title)}
            class="group/collapsible"
            onOpenChange={(isOpen) => {
              sidebarState?.toggleMenu?.(mainItem.title, isOpen);
            }}
          >
            <Sidebar.MenuItem>
              <Collapsible.Trigger>
                {#snippet child({ props })}
                  <Sidebar.MenuButton {...props}>
                    {#if mainItem.icon}
                      <mainItem.icon class="mr-2 h-4 w-4" />
                    {/if}
                    {mainItem.title}
                    <Plus
                      class="ml-auto group-data-[state=open]/collapsible:hidden"
                    />
                    <Minus
                      class="ml-auto group-data-[state=closed]/collapsible:hidden"
                    />
                  </Sidebar.MenuButton>
                {/snippet}
              </Collapsible.Trigger>
              {#if mainItem.items?.length}
                <Collapsible.Content>
                  <Sidebar.MenuSub>
                    {#each mainItem.items as item (item.title)}
                      <Sidebar.MenuSubItem>
                        <Sidebar.MenuSubButton
                          isActive={sidebarState.activeItem === item.title}
                        >
                          {#snippet child({ props })}
                            <a
                              href={item.url}
                              {...props}
                              onclick={() =>
                                sidebarState.setActiveItem(item.title)}
                            >
                              {item.title}
                            </a>
                          {/snippet}
                        </Sidebar.MenuSubButton>
                      </Sidebar.MenuSubItem>
                    {/each}
                  </Sidebar.MenuSub>
                </Collapsible.Content>
              {/if}
            </Sidebar.MenuItem>
          </Collapsible.Root>
        {/each}
      </Sidebar.Menu>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Footer>
    <div class="pb-[var(--safe-area-inset-bottom,0px)]">
      <NavUser />
    </div>
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
