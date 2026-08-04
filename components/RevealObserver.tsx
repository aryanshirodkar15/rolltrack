"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Watches every [data-reveal] element and adds .is-visible the first time
// it scrolls into view, driving the CSS fade-rise in globals.css. A
// MutationObserver picks up elements rendered after mount (async lists),
// and re-running on pathname keeps client-side navigations covered.
export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );

    const observeAll = () =>
      document
        .querySelectorAll("[data-reveal]:not(.is-visible)")
        .forEach((el) => io.observe(el));

    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
