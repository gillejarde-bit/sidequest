export const Z_INDEX = {
  map_base: 0,
  map_pins: 10,
  map_ui: 20,
  bottom_nav: 50,
  bottom_sheets: 55, // sheets slide from bottom but must STOP above the nav
  popups_menus: 60,  // More menu popup, tooltips
  modals: 100,       // Level up, streak alert, etc.
  toasts: 200        // Toast notifications
} as const
