/** Iconografía lineal, trazo fino y geométrico. Sin estética infantil. */
const P: Record<string, string> = {
  home: 'M3.5 10.5 12 4l8.5 6.5V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z',
  wave: 'M4 10v4M7 7.5v9M10 4.5v15M13 8v8M16 6v12M19 10v4',
  market: 'M3.5 20.5h17M5.5 20.5v-8M9.5 20.5V8M13.5 20.5v-6M17.5 20.5V5M5.5 12.5l4-4.5 4 6 4-9',
  create: 'M7 3.5h7l4.5 4.5v12.5H7zM14 3.5V8h4.5',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  bell: 'M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 21h4',
  mic: 'M12 14.5a3 3 0 0 0 3-3v-5a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21',
  attach: 'M19.5 11.5 12 19a4.6 4.6 0 0 1-6.5-6.5l8-8a3 3 0 0 1 4.3 4.3l-7.9 7.9a1.5 1.5 0 0 1-2.2-2.1l7.1-7.2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chev: 'M9.5 6l6 6-6 6',
  down: 'M6 9.5l6 6 6-6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6 6 18',
  send: 'M5 12h13M12 5l7 7-7 7',
  house: 'M4 10.5 12 4.5l8 6V20H4zM10 20v-5h4v5',
  doc: 'M7 3.5h7l4.5 4.5v12.5H7zM14 3.5V8h4.5M10 12.5h5.5M10 16h5.5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
  bars: 'M6.5 20V13M11 20V8.5M15.5 20V4M20 20v-7',
  sparkle: 'M12 3.5l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7zM18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  heart: 'M12 19.5s-7-4.3-7-9.7A4 4 0 0 1 12 7.2a4 4 0 0 1 7 2.6c0 5.4-7 9.7-7 9.7z',
  users: 'M9 11.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.5 19.5c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6M16.5 11a2.6 2.6 0 1 0 0-5.2M17 14.8c2 .2 3.4 1.6 4 4',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.5H15',
  chart: 'M4 20.5h16M7 17v-3.5M11 17v-6M15 17v-4.5M5 11.5l5-5 3.5 3L19 4M15.5 4H19v3.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  copy: 'M9 9h10.5v11.5H9zM15.5 9V4.5H4.5V16H9',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM18 14h2v2M14 18.5V20h2M18 18h2v2h-2',
  calendar: 'M4.5 6h15v14h-15zM4.5 10h15M9 3.5V7M15 3.5V7',
  phone: 'M6 4h3.5l1.8 4.5L9 10a10.5 10.5 0 0 0 5 5l1.5-2.3L20 14.5V18a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 4.5 5.6 1.5 1.5 0 0 1 6 4z',
  alert: 'M12 4.5 20.5 19.5h-17zM12 10v4M12 16.8v.2',
  pin: 'M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  message: 'M4.5 5.5h15v10.5H10l-5.5 4z',
  trend: 'M4 17l5.5-5.5 4 4L20 9M15 9h5v5',
  pen: 'M4.5 19.5l.8-3.8L16 5a2 2 0 0 1 2.9 2.9L8.3 18.7zM14.5 6.5l3 3',
  bulb: 'M9.5 18h5M10.5 21h3M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
  image: 'M3.5 5.5h17v13h-17zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20.5 15l-5-5-9.5 8.5',
  plus: 'M12 5v14M5 12h14',
  layers: 'M12 4 3.5 8.5 12 13l8.5-4.5zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5',
  signal: 'M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM8.2 15.8a5.4 5.4 0 0 1 0-7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.4 18.6a9.4 9.4 0 0 1 0-13.2M18.6 5.4a9.4 9.4 0 0 1 0 13.2',
  play: 'M8 5.5v13l10.5-6.5z',
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, stroke = 1.6, fill = false, className }: { name: string; size?: number; stroke?: number; fill?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[name] ?? P.sparkle} />
    </svg>
  );
}
