interface MenuState {
  openMenus: string[];
  activeItem: string | null;
}

class SidebarState {
  // Initialize openMenus as an empty array to ensure it's always iterable
  openMenus: string[] = [];
  activeItem: string | null = null;

  constructor() {
    // If you have initialization from localStorage or elsewhere, ensure it creates an array
    try {
      const savedState = localStorage.getItem("sidebarState");
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.openMenus = Array.isArray(parsed.openMenus)
          ? parsed.openMenus
          : [];
        this.activeItem = parsed.activeItem || null;
      }
    } catch (e) {
      console.error("Error initializing sidebar state:", e);
      this.openMenus = [];
    }
  }

  toggleMenu(menuTitle: string, isOpen: boolean) {
    // Ensure openMenus is an array before operating on it
    if (!Array.isArray(this.openMenus)) {
      this.openMenus = [];
    }

    if (isOpen) {
      // Add the menu to openMenus if it's not already there
      if (!this.openMenus.includes(menuTitle)) {
        this.openMenus = [...this.openMenus, menuTitle];
      }
    } else {
      // Remove the menu from openMenus
      this.openMenus = this.openMenus.filter((title) => title !== menuTitle);
    }

    // Optionally save to localStorage
    this.saveState();
  }

  setActiveItem(itemTitle: string) {
    this.activeItem = itemTitle;
    this.saveState();
  }

  private saveState() {
    try {
      localStorage.setItem(
        "sidebarState",
        JSON.stringify({
          openMenus: this.openMenus,
          activeItem: this.activeItem,
        }),
      );
    } catch (e) {
      console.error("Error saving sidebar state:", e);
    }
  }
}

export const sidebarState = new SidebarState();
