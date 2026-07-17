// Applies (and toggles) the blur-with-label overlay on a spoiler comment.

/** Blurs an element and adds a click-to-reveal label naming the show. */
export function applyBlur(
  el: HTMLElement,
  showTitle: string | null,
  onReveal?: () => void,
): void {
  if (el.classList.contains("plotarmor-blurred")) return;
  el.classList.add("plotarmor-blurred");

  const label = document.createElement("div");
  label.className = "plotarmor-label";
  label.textContent = showTitle
    ? `Spoiler — ${showTitle} · click to reveal`
    : "Spoiler · click to reveal";
  label.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add("plotarmor-revealed");
    onReveal?.();
  });
  el.appendChild(label);
}
