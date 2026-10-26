import React from 'react';

// [mark, wordmark, gap] in px: the lockups in frontend/brand/LOGO.md.
const SIZES = {
  sm: [24, 22, 10], // top bar
  md: [32, 28, 14], // footer / docs
  lg: [96, 100, 43], // login / splash
} as const;

interface LogoProps {
  variant: 'light' | 'dark'; // the background the logo sits on
  size?: keyof typeof SIZES;
}

// "Step" mark + live "myfund" wordmark.
export const Logo: React.FC<LogoProps> = ({ variant, size = 'sm' }) => {
  const [mark, text, gap] = SIZES[size];
  return (
    <span role="img" aria-label="MyFund" className="inline-flex items-center" style={{ gap }}>
      <img
        src={variant === 'dark' ? '/logo/logo-mark-on-ink.svg' : '/logo/logo-mark.svg'}
        width={mark}
        height={mark}
        alt=""
      />
      <span
        className={`font-sans font-semibold leading-none pb-0.5 ${variant === 'dark' ? 'text-white' : 'text-ink'}`}
        style={{ fontSize: text, letterSpacing: text <= 22 ? '-0.06em' : '-0.065em' }}
      >
        myfund
      </span>
    </span>
  );
};
