export interface RectLike {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface SizeLike {
  width: number;
  height: number;
}

export interface ViewportLike {
  width: number;
  height: number;
}

export interface PopoverPositionResult {
  top: number;
  left: number;
  placement: "bottom" | "top";
}

export function calculatePopoverPosition(
  anchorRect: RectLike,
  cardSize: SizeLike,
  viewport: ViewportLike,
  offset: number = 8,
  padding: number = 12
): PopoverPositionResult {
  let placement: "bottom" | "top" = "bottom";
  let top = anchorRect.bottom + offset;

  // If bottom overflows viewport, flip to top if there is more room or if it fits
  const overflowBottom = top + cardSize.height > viewport.height;
  const spaceAbove = anchorRect.top - offset - cardSize.height;

  if (overflowBottom && spaceAbove >= 0) {
    placement = "top";
    top = spaceAbove;
  } else if (overflowBottom && spaceAbove > (viewport.height - (anchorRect.bottom + offset))) {
    placement = "top";
    top = Math.max(padding, spaceAbove);
  }

  // Horizontal positioning: align with anchor left
  let left = anchorRect.left;

  // Prevent right overflow
  if (left + cardSize.width > viewport.width - padding) {
    left = viewport.width - cardSize.width - padding;
  }

  // Prevent left overflow
  left = Math.max(padding, left);

  return {
    top: Math.round(top),
    left: Math.round(left),
    placement,
  };
}

export function shouldCloseOnScroll(eventType: string, isInsideCard: boolean): boolean {
  if (eventType === "scroll" || eventType === "wheel") {
    return true;
  }
  if (eventType === "touchmove") {
    return !isInsideCard;
  }
  return false;
}

