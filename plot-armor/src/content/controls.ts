// Floating "reveal all in this thread" control — the escape hatch that makes
// aggressive blurring safe: one click clears the whole thread when the user is
// actually caught up. Appears only while something is still hidden.

let bar: HTMLElement | null = null;
let handler: (() => void) | null = null;

/** Registers the callback invoked when the user clicks "reveal all". */
export function onRevealAll(fn: () => void): void {
  handler = fn;
}

/** Shows/updates the bar for `count` hidden comments, or removes it at 0. */
export function updateRevealAllBar(count: number): void {
  if (count <= 0) {
    bar?.remove();
    bar = null;
    return;
  }
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "plotarmor-bar";
    const btn = document.createElement("button");
    btn.className = "plotarmor-bar-btn";
    btn.addEventListener("click", () => handler?.());
    bar.appendChild(btn);
    document.body.appendChild(bar);
  }
  bar.querySelector("button")!.textContent = `🛡 ${count} hidden · Reveal all (I'm caught up)`;
}
