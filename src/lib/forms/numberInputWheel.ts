type NumberInputWheelEvent = Pick<WheelEvent, 'deltaX' | 'deltaY' | 'preventDefault'> & {
  currentTarget?: Pick<HTMLInputElement, 'blur' | 'readOnly' | 'value'>;
};

/** Prevents a focused number input from stepping while preserving page scrolling and focus. */
export function preserveNumberInputOnWheel(event: NumberInputWheelEvent) {
  event.preventDefault();
  window.scrollBy({ left: event.deltaX, top: event.deltaY, behavior: 'auto' });
}
