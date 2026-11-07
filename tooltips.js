// Visual equivalents of existing accessible names; no duplicate announcement.
export function initTooltips(root = document) {
  const tooltip = root.createElement("div");
  tooltip.className = "action-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("aria-hidden", "true");
  const hasPopover = "showPopover" in tooltip;
  if (hasPopover) tooltip.setAttribute("popover", "manual");
  root.body.append(tooltip);
  let trigger = null;
  let timer;
  let overTooltip = false;

  function hide() {
    clearTimeout(timer);
    if (hasPopover && !tooltip.hidden) tooltip.hidePopover();
    tooltip.hidden = true;
    trigger = null;
  }

  function position() {
    if (!trigger?.isConnected) {
      hide();
      return;
    }
    const anchor = trigger.getBoundingClientRect();
    const box = tooltip.getBoundingClientRect();
    const gap = 8;
    const left = Math.max(
      gap,
      Math.min(anchor.right - box.width, innerWidth - box.width - gap),
    );
    const below = anchor.bottom + gap;
    const top =
      below + box.height <= innerHeight - gap
        ? below
        : Math.max(gap, anchor.top - box.height - gap);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function show(button) {
    clearTimeout(timer);
    if (trigger !== button) hide();
    trigger = button;
    tooltip.textContent = button.ariaLabel;
    tooltip.lang = button.lang;
    tooltip.dir = "auto";
    tooltip.hidden = false;
    if (hasPopover && !tooltip.matches(":popover-open")) tooltip.showPopover();
    position();
  }

  function scheduleHide() {
    clearTimeout(timer);
    timer = setTimeout(
      safe(() => {
        if (!overTooltip && trigger !== root.activeElement) hide();
      }),
      150,
    );
  }

  function safe(action) {
    return (event) => {
      try {
        action(event);
      } catch (error) {
        console.warn(
          "Tooltip unavailable; accessible button labels remain available.",
          error,
        );
        tooltip.hidden = true;
        trigger = null;
      }
    };
  }

  root.addEventListener(
    "pointerover",
    safe((event) => {
      const button = event.target.closest?.(".favorite");
      if (
        button &&
        event.pointerType !== "touch" &&
        !button.contains(event.relatedTarget)
      )
        show(button);
    }),
  );
  root.addEventListener(
    "pointerout",
    safe((event) => {
      if (
        trigger?.contains(event.target) &&
        !trigger.contains(event.relatedTarget)
      )
        scheduleHide();
    }),
  );
  root.addEventListener(
    "focusin",
    safe((event) => {
      if (event.target.matches?.(".favorite")) show(event.target);
      else hide();
    }),
  );
  root.addEventListener(
    "focusout",
    safe((event) => {
      if (event.target === trigger) scheduleHide();
    }),
  );
  tooltip.addEventListener(
    "pointerenter",
    safe(() => {
      overTooltip = true;
      clearTimeout(timer);
    }),
  );
  tooltip.addEventListener(
    "pointerleave",
    safe(() => {
      overTooltip = false;
      scheduleHide();
    }),
  );
  root.addEventListener(
    "keydown",
    safe((event) => {
      if (event.key === "Escape") hide();
    }),
  );
  root.addEventListener(
    "click",
    safe((event) => {
      if (trigger?.contains(event.target)) show(trigger);
      else hide();
    }),
  );
  root.addEventListener("scroll", safe(hide), true);
  window.addEventListener("resize", safe(hide));
  // Card rebuilding (language changes) and filtering invalidate the visible tip.
  new MutationObserver(
    safe(() => {
      if (trigger && (!trigger.isConnected || !trigger.getClientRects().length))
        hide();
      else if (trigger && tooltip.textContent !== trigger.ariaLabel)
        show(trigger);
    }),
  ).observe(root.querySelector("#stations"), {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-label", "hidden"],
  });
}
