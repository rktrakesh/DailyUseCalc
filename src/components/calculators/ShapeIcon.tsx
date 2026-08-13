export type GeometryShape = 'rectangle' | 'square' | 'circle' | 'triangle' | 'trapezoid' | 'ring';

export default function ShapeIcon({
  shape,
  className,
}: {
  shape: GeometryShape;
  className?: string;
}) {
  const geometry = {
    rectangle: <rect x="1.5" y="4" width="13" height="8" rx="0.75" />,
    square: <rect x="3" y="3" width="10" height="10" rx="0.75" />,
    circle: <circle cx="8" cy="8" r="5.25" />,
    triangle: <path d="M8 2.25 14 13H2L8 2.25Z" />,
    trapezoid: <path d="M4.25 3.25h7.5L14 12.75H2L4.25 3.25Z" />,
    ring: (
      <>
        <circle cx="8" cy="8" r="5.5" />
        <circle cx="8" cy="8" r="2.5" />
      </>
    ),
  }[shape];

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height="16"
      viewBox="0 0 16 16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35">
        {geometry}
      </g>
    </svg>
  );
}
