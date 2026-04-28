"use client";

import { useCallback, useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme";

function subscribe(onStoreChange: () => void) {
  const el = document.documentElement;
  const mo = new MutationObserver(onStoreChange);
  mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

/** Server renders as dark-first to match theme script defaults. */
function getServerSnapshot() {
  return true;
}

export function useDomDark() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function toggleTheme() {
  const root = document.documentElement;
  const nextDark = root.classList.toggle("dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextDark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}
