type NumberInputWheelEvent = Pick<WheelEvent, 'deltaX' | 'deltaY' | 'preventDefault'>;

/** Prevents a focused number input from stepping while preserving page scrolling and focus. */
export function preserveNumberInputOnWheel(event: NumberInputWheelEvent) {
  event.preventDefault();
  window.scrollBy({ left: event.deltaX, top: event.deltaY, behavior: 'auto' });
}
