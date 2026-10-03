import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export function BlinkitIcon({ className = "w-5 h-5", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <rect width="32" height="32" rx="8" fill="#F8CB46" />
      {/* Iconic Blinkit bold green lowercase 'b' */}
      <path
        d="M10 7.5H14.5V13.8C15.6 12.8 17.1 12.2 18.8 12.2C22.2 12.2 24.8 14.8 24.8 18.6C24.8 22.4 22.1 25 18.6 25C17 25 15.5 24.3 14.4 23.2V24.8H10V7.5ZM17.4 16C15.8 16 14.5 17.2 14.5 18.7C14.5 20.2 15.8 21.4 17.4 21.4C19 21.4 20.3 20.2 20.3 18.7C20.3 17.2 19 16 17.4 16Z"
        fill="#0C831F"
      />
    </svg>
  );
}

export function ZeptoIcon({ className = "w-5 h-5", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <rect width="32" height="32" rx="8" fill="#8B5CF6" />
      {/* Zepto Speed Lightning-Z */}
      <path
        d="M8.5 9.5H23.5V13L14.2 20.5H23.5V23.5H8.5V20L17.8 12.5H8.5V9.5Z"
        fill="#FFFFFF"
      />
      <circle cx="23" cy="9.5" r="2.5" fill="#EF4444" />
    </svg>
  );
}

export function InstamartIcon({ className = "w-5 h-5", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <rect width="32" height="32" rx="8" fill="#FC8019" />
      {/* Swiggy Instamart Location Swoosh */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 6.5C11.8 6.5 8.5 9.8 8.5 14C8.5 18.8 14.4 24.7 15.4 25.7C15.7 26 16.3 26 16.6 25.7C17.6 24.7 23.5 18.8 23.5 14C23.5 9.8 20.2 6.5 16 6.5ZM16 11.2C17.5 11.2 18.8 12.5 18.8 14C18.8 15.5 17.5 16.8 16 16.8C14.5 16.8 13.2 15.5 13.2 14C13.2 12.5 14.5 11.2 16 11.2Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function BigBasketIcon({ className = "w-5 h-5", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <rect width="32" height="32" rx="8" fill="#84C225" />
      {/* BigBasket 'bb' basket badge */}
      <path
        d="M9 10H13V15.2C13.8 14.4 14.8 14 16 14C18.2 14 20 15.8 20 18C20 20.2 18.2 22 16 22C14.8 22 13.8 21.6 13 20.8V22H9V10ZM15 16.8C14.2 16.8 13.5 17.3 13.2 18C13.5 18.7 14.2 19.2 15 19.2C15.7 19.2 16.2 18.7 16.2 18C16.2 17.3 15.7 16.8 15 16.8Z"
        fill="#FFFFFF"
      />
      <circle cx="21" cy="11" r="2.5" fill="#E11D48" />
    </svg>
  );
}

export function FlipkartMinutesIcon({ className = "w-5 h-5", size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <rect width="32" height="32" rx="8" fill="#2874F0" />
      {/* Flipkart 'F' with speed thunderbolt accent */}
      <path
        d="M10 8H22V12H15V14.5H20.5V18.5H15V24H10V8Z"
        fill="#FFE500"
      />
      <circle cx="21" cy="9.5" r="2.5" fill="#FFE500" />
    </svg>
  );
}

export function PlatformLogo({
  platform,
  className = "w-4 h-4",
  size,
}: {
  platform: string;
  className?: string;
  size?: number;
}) {
  const p = platform.toLowerCase();
  if (p.includes("blink")) return <BlinkitIcon className={className} size={size} />;
  if (p.includes("zept")) return <ZeptoIcon className={className} size={size} />;
  if (p.includes("insta") || p.includes("swiggy")) return <InstamartIcon className={className} size={size} />;
  if (p.includes("big") || p.includes("bb")) return <BigBasketIcon className={className} size={size} />;
  if (p.includes("flipkart") || p.includes("minute")) return <FlipkartMinutesIcon className={className} size={size} />;
  return (
    <div
      className={`rounded bg-zinc-800 text-zinc-300 font-bold uppercase flex items-center justify-center text-[10px] ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      {platform.slice(0, 2)}
    </div>
  );
}
