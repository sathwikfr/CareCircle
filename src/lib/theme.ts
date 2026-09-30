export const THEME_STORAGE_KEY = 'cc-theme';

/**
 * Inline <head> script: applies the saved theme, otherwise the system setting,
 * before first paint so there is no light/dark flash.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
