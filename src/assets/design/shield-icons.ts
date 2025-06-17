/* ================================
   Shield Iconography System
   Scalable SVG Components
   ================================ */

export interface ShieldIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'brand';
  state?: 'safe' | 'warning' | 'danger' | 'neutral' | 'scanning';
  variant?: 'filled' | 'outline' | 'minimal';
  className?: string;
  ariaLabel?: string;
}

export class ShieldIconSystem {
  private static sizeMap = {
    xs: 12,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 64,
    brand: 128
  };

  private static colorMap = {
    safe: 'var(--color-safe-green)',
    warning: 'var(--color-warning-amber)',
    danger: 'var(--color-danger-red)',
    neutral: 'var(--color-secondary)',
    scanning: 'var(--color-link)'
  };

  /* ================================
     Base Shield Shape
     ================================ */
  private static getShieldPath(): string {
    return `M12 2L3 7v6c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-9-5z`;
  }

  private static getShieldOutlinePath(): string {
    return `M12 2L3 7v6c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-9-5zm0 2.18L19 8v5c0 4.52-2.98 7.9-7 8.93C7.98 20.9 5 17.52 5 13V8l7-3.82z`;
  }

  private static getMinimalShieldPath(): string {
    return `M12 2l7 4v7c0 5.55-3.84 9.74-9 11-5.16-1.26-9-5.45-9-11V6l9-4z`;
  }

  /* ================================
     State-Specific Inner Elements
     ================================ */
  private static getSafeCheckmark(): string {
    return `<path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  private static getWarningExclamation(): string {
    return `<path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  private static getDangerX(): string {
    return `<path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  private static getScanningDots(): string {
    return `
      <circle cx="8" cy="12" r="1" fill="currentColor">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0s"/>
      </circle>
      <circle cx="12" cy="12" r="1" fill="currentColor">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.5s"/>
      </circle>
      <circle cx="16" cy="12" r="1" fill="currentColor">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="1s"/>
      </circle>
    `;
  }

  /* ================================
     Icon Generation Methods
     ================================ */
  public static generateShieldIcon({
    size = 'md',
    state = 'neutral',
    variant = 'filled',
    className = '',
    ariaLabel
  }: ShieldIconProps): string {
    const sizeValue = this.sizeMap[size];
    const color = this.colorMap[state];
    
    let shieldPath: string;
    let fillOpacity = '1';
    
    switch (variant) {
      case 'outline':
        shieldPath = this.getShieldOutlinePath();
        fillOpacity = '0';
        break;
      case 'minimal':
        shieldPath = this.getMinimalShieldPath();
        fillOpacity = '0.1';
        break;
      default:
        shieldPath = this.getShieldPath();
        fillOpacity = '1';
    }

    let innerElement = '';
    switch (state) {
      case 'safe':
        innerElement = this.getSafeCheckmark();
        break;
      case 'warning':
        innerElement = this.getWarningExclamation();
        break;
      case 'danger':
        innerElement = this.getDangerX();
        break;
      case 'scanning':
        innerElement = this.getScanningDots();
        break;
    }

    const strokeWidth = variant === 'outline' ? '1.5' : '0';
    const label = ariaLabel || `${state} shield icon`;

    return `
      <svg
        width="${sizeValue}"
        height="${sizeValue}"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="shield-icon shield-icon--${size} shield-icon--${state} shield-icon--${variant} ${className}"
        role="img"
        aria-label="${label}"
      >
        <path
          d="${shieldPath}"
          fill="${color}"
          fill-opacity="${fillOpacity}"
          stroke="${variant === 'outline' ? color : 'none'}"
          stroke-width="${strokeWidth}"
        />
        ${innerElement}
      </svg>
    `;
  }

  /* ================================
     Predefined Icon Variants
     ================================ */
  public static safeShield(size: ShieldIconProps['size'] = 'md'): string {
    return this.generateShieldIcon({
      size,
      state: 'safe',
      variant: 'filled',
      ariaLabel: 'Content verified as safe'
    });
  }

  public static warningShield(size: ShieldIconProps['size'] = 'md'): string {
    return this.generateShieldIcon({
      size,
      state: 'warning',
      variant: 'filled',
      ariaLabel: 'Content flagged as suspicious'
    });
  }

  public static dangerShield(size: ShieldIconProps['size'] = 'md'): string {
    return this.generateShieldIcon({
      size,
      state: 'danger',
      variant: 'filled',
      ariaLabel: 'Content identified as threat'
    });
  }

  public static scanningShield(size: ShieldIconProps['size'] = 'md'): string {
    return this.generateShieldIcon({
      size,
      state: 'scanning',
      variant: 'minimal',
      ariaLabel: 'Scanning content for authenticity'
    });
  }

  public static neutralShield(size: ShieldIconProps['size'] = 'md'): string {
    return this.generateShieldIcon({
      size,
      state: 'neutral',
      variant: 'outline',
      ariaLabel: 'Soft-Armor protection'
    });
  }

  /* ================================
     Extension Icon Variations
     ================================ */
  public static generateExtensionIcon(size: 16 | 48 | 128): string {
    return `
      <svg
        width="${size}"
        height="${size}"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="extension-icon"
      >
        <!-- Background Circle -->
        <circle
          cx="64"
          cy="64"
          r="60"
          fill="url(#shieldGradient)"
          stroke="var(--color-border)"
          stroke-width="2"
        />
        
        <!-- Shield Shape -->
        <path
          d="M64 20L32 36v32c0 29.6 20.48 51.87 32 58.67 11.52-6.8 32-29.07 32-58.67V36L64 20z"
          fill="white"
          stroke="none"
        />
        
        <!-- Inner Shield -->
        <path
          d="M64 28L40 40v28c0 21.6 14.08 36.53 24 42 9.92-5.47 24-20.4 24-42V40L64 28z"
          fill="var(--color-safe-green)"
        />
        
        <!-- Checkmark -->
        <path
          d="M54 64l6 6 12-12"
          stroke="white"
          stroke-width="4"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        
        <!-- Gradient Definition -->
        <defs>
          <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:var(--color-bg-secondary);stop-opacity:1" />
            <stop offset="100%" style="stop-color:var(--color-bg-tertiary);stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  /* ================================
     CSS Classes for Icons
     ================================ */
  public static getIconStyles(): string {
    return `
      .shield-icon {
        display: inline-block;
        vertical-align: middle;
        transition: all var(--duration-fast) var(--ease-out);
      }

      .shield-icon--xs { width: var(--icon-xs); height: var(--icon-xs); }
      .shield-icon--sm { width: var(--icon-sm); height: var(--icon-sm); }
      .shield-icon--md { width: var(--icon-md); height: var(--icon-md); }
      .shield-icon--lg { width: var(--icon-lg); height: var(--icon-lg); }
      .shield-icon--xl { width: var(--icon-xl); height: var(--icon-xl); }
      .shield-icon--xxl { width: var(--icon-xxl); height: var(--icon-xxl); }
      .shield-icon--brand { width: var(--icon-brand); height: var(--icon-brand); }

      .shield-icon--safe {
        color: var(--color-safe-green);
      }

      .shield-icon--warning {
        color: var(--color-warning-amber);
      }

      .shield-icon--danger {
        color: var(--color-danger-red);
      }

      .shield-icon--neutral {
        color: var(--color-secondary);
      }

      .shield-icon--scanning {
        color: var(--color-link);
      }

      .shield-icon:hover {
        transform: scale(1.05);
      }

      .shield-icon--scanning:hover {
        transform: none; /* Don't scale animated icons */
      }

      /* High contrast mode overrides */
      @media (prefers-contrast: high) {
        .shield-icon--safe { color: #006600; }
        .shield-icon--warning { color: #cc6600; }
        .shield-icon--danger { color: #cc0000; }
      }

      /* Reduced motion overrides */
      @media (prefers-reduced-motion: reduce) {
        .shield-icon {
          transition: none;
        }
        
        .shield-icon:hover {
          transform: none;
        }
        
        .shield-icon--scanning circle {
          animation: none !important;
          opacity: 1 !important;
        }
      }
    `;
  }
}

/* ================================
   Utility Functions
   ================================ */
export function createShieldIconElement(props: ShieldIconProps): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = ShieldIconSystem.generateShieldIcon(props);
  return container.firstElementChild as HTMLElement;
}

export function insertShieldIcon(
  target: HTMLElement, 
  props: ShieldIconProps, 
  position: 'before' | 'after' | 'replace' = 'before'
): void {
  const iconElement = createShieldIconElement(props);
  
  switch (position) {
    case 'before':
      target.insertBefore(iconElement, target.firstChild);
      break;
    case 'after':
      target.appendChild(iconElement);
      break;
    case 'replace':
      target.innerHTML = '';
      target.appendChild(iconElement);
      break;
  }
}

/* ================================
   Export Types
   ================================ */
export type { ShieldIconProps };
export { ShieldIconSystem as default };