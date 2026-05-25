import React from "react";

type IconName =
  | "home" | "grid" | "user" | "users" | "calendar" | "check" | "x"
  | "plus" | "search" | "bell" | "chevron" | "chevronD" | "arrow" | "arrowL"
  | "wallet" | "invoice" | "swim" | "pin" | "camera" | "qr" | "chart"
  | "settings" | "logout" | "menu" | "edit" | "trash" | "download" | "upload"
  | "eye" | "star" | "whatsapp" | "chat" | "school" | "book" | "flag"
  | "clipboard" | "sparkle" | "shield" | "target" | "sun" | "moon" | "info"
  | "warning" | "filter" | "sort" | "close" | "refresh" | "copy" | "sendWA"
  | "print" | "lock" | "archive" | "chevron-left" | "chevron-right";

interface IconProps {
  name: IconName | string;
  className?: string;
  strokeWidth?: number;
}

const PATHS: Record<string, React.ReactNode> = {
  home:      <><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></>,
  grid:      <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  user:      <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></>,
  users:     <><circle cx="9" cy="9" r="3.5"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c.8-3 3.4-4.5 6-4.5s5.2 1.5 6 4.5"/><path d="M15 20c.4-1.6 1.6-3 3-3"/></>,
  calendar:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  check:     <path d="M5 12l5 5 9-11"/>,
  x:         <path d="M6 6l12 12M18 6L6 18"/>,
  plus:      <path d="M12 5v14M5 12h14"/>,
  search:    <><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></>,
  bell:      <><path d="M6 16V11a6 6 0 1112 0v5l1.5 2H4.5L6 16z"/><path d="M10 21a2 2 0 004 0"/></>,
  chevron:   <path d="M9 6l6 6-6 6"/>,
  chevronD:  <path d="M6 9l6 6 6-6"/>,
  arrow:     <path d="M5 12h14M13 6l6 6-6 6"/>,
  arrowL:    <path d="M19 12H5M11 6l-6 6 6 6"/>,
  wallet:    <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.2" fill="currentColor" stroke="none"/></>,
  invoice:   <><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h8M9 17h5"/></>,
  swim:      <><path d="M3 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2"/><path d="M3 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2"/><circle cx="16" cy="6" r="2"/></>,
  pin:       <><path d="M12 21s7-7.6 7-13a7 7 0 10-14 0c0 5.4 7 13 7 13z"/><circle cx="12" cy="8" r="2.5"/></>,
  camera:    <><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></>,
  qr:        <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 19h2"/></>,
  chart:     <><path d="M4 20V8M10 20V4M16 20v-8M22 20H2"/></>,
  settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1A2 2 0 114.3 17l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1A2 2 0 117 4.3l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
  logout:    <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>,
  menu:      <><path d="M3 6h18M3 12h18M3 18h18"/></>,
  edit:      <><path d="M14 4l6 6L10 20H4v-6z"/></>,
  trash:     <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>,
  download:  <><path d="M12 4v12M6 12l6 6 6-6M4 20h16"/></>,
  upload:    <><path d="M12 20V8M6 12l6-6 6 6M4 4h16"/></>,
  eye:       <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  star:      <path d="M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.2L12 17l-5.5 3 1-6.2L3 9.5l6.3-.9z"/>,
  whatsapp:  <><path d="M20 12a8 8 0 11-3.3-6.5L20 4l-1.4 3.4A8 8 0 0120 12z"/><path d="M9 9c0 4 3 7 7 7l1.5-1.5-2-1.5-1 .8A4.7 4.7 0 0110 12l.8-1-1.5-2z" fill="currentColor"/></>,
  chat:      <><path d="M21 12a8 8 0 11-15.6 2.5L4 20l5.5-1.4A8 8 0 0121 12z"/></>,
  school:    <><path d="M3 10l9-5 9 5-9 5-9-5z"/><path d="M7 12v5c2 1.5 3 2 5 2s3-.5 5-2v-5"/></>,
  book:      <><path d="M4 4h7v16H4z"/><path d="M13 4h7v16h-7z"/></>,
  flag:      <><path d="M5 21V4M5 4h10l-2 4 2 4H5"/></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h4"/></>,
  sparkle:   <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></>,
  shield:    <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></>,
  target:    <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></>,
  sun:       <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon:      <path d="M21 13a8 8 0 11-10-10 7 7 0 0010 10z"/>,
  info:      <><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v4h1"/></>,
  warning:   <><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/></>,
  filter:    <path d="M4 5h16l-6 8v6l-4 2v-8z"/>,
  sort:      <><path d="M7 5v14M7 5l-3 3M7 5l3 3"/><path d="M17 19V5M17 19l-3-3M17 19l3-3"/></>,
  close:     <path d="M6 6l12 12M18 6L6 18"/>,
  refresh:   <><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
  copy:      <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></>,
  sendWA:        <><path d="M3 11l18-8-8 18-2-8z"/></>,
  print:         <><path d="M6 9V4h12v5"/><rect x="6" y="14" width="12" height="6" rx="1"/><path d="M6 14H4a2 2 0 01-2-2v-3a2 2 0 012-2h16a2 2 0 012 2v3a2 2 0 01-2 2h-2"/><circle cx="18" cy="11.5" r=".5" fill="currentColor"/></>,
  lock:          <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></>,
  archive:       <><path d="M4 7h16M4 7l2 13h12l2-13"/><path d="M10 11h4"/></>,
  "chevron-left": <path d="M15 6l-6 6 6 6"/>,
  "chevron-right": <path d="M9 6l6 6-6 6"/>,
};

export default function Icon({ name, className = "w-5 h-5", strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
