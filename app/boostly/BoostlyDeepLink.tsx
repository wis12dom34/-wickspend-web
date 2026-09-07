"use client";

import { useEffect } from "react";

function clickButtonByText(text: string) {
  const buttons = Array.from(document.querySelectorAll("button"));
  const target = buttons.find((button) => button.textContent?.trim() === text);
  if (target instanceof HTMLButtonElement) {
    target.click();
    return true;
  }
  return false;
}

export default function BoostlyDeepLink() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform");
    const category = params.get("category");
    if (!platform) return;

    let platformOpened = false;
    let categoryOpened = !category;

    const apply = () => {
      if (!platformOpened) platformOpened = clickButtonByText(platform);
      if (platformOpened && !categoryOpened && category) {
        categoryOpened = clickButtonByText(category);
      }
      return platformOpened && categoryOpened;
    };

    if (apply()) return;

    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = window.setTimeout(() => observer.disconnect(), 8000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
