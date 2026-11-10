import React from 'react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
  strokeWidth?: number | string
}

const defaultProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function Package({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  )
}

export function Boxes({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
      <path d="m7 16.5-4.74-2.85" />
      <path d="m7 16.5 5-3" />
      <path d="M7 16.5v5.17" />
      <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
      <path d="m17 16.5-5-3" />
      <path d="m17 16.5 4.74-2.85" />
      <path d="M17 16.5v5.17" />
      <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
      <path d="M12 8 7.26 5.15" />
      <path d="m12 8 4.74-2.85" />
      <path d="M12 13.5V8" />
    </svg>
  )
}

export function Warehouse({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.1-1.78l8-4a2 2 0 0 1 1.8 0l8 4a2 2 0 0 1 1.1 1.78Z" />
      <path d="M6 18h12" />
      <path d="M6 14h12" />
      <rect x="10" y="10" width="4" height="12" />
    </svg>
  )
}

export function ShoppingCart({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}

export function Truck({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14v10" />
      <circle cx="17" cy="18.5" r="2.5" />
      <circle cx="7" cy="18.5" r="2.5" />
    </svg>
  )
}

export function Users({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function Search({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function Plus({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function Edit({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

export function Trash2({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export function AlertTriangle({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function CheckCircle2({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function XCircle({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

export function ChevronDown({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function ChevronRight({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function ChevronLeft({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export function ArrowRight({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function Filter({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

export function SlidersHorizontal({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <line x1="21" y1="4" x2="14" y2="4" />
      <line x1="10" y1="4" x2="3" y2="4" />
      <line x1="21" y1="12" x2="12" y2="12" />
      <line x1="8" y1="12" x2="3" y2="12" />
      <line x1="21" y1="20" x2="16" y2="20" />
      <line x1="12" y1="20" x2="3" y2="20" />
      <line x1="14" y1="2" x2="14" y2="6" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="16" y1="18" x2="16" y2="22" />
    </svg>
  )
}

export function ArrowUpDown({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </svg>
  )
}

export function Menu({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

export function X({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function LogOut({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function LayoutDashboard({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  )
}

export function History({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  )
}

export function DollarSign({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

export function CreditCard({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}

export function Barcode({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M3 5v14" />
      <path d="M8 5v14" />
      <path d="M12 5v14" />
      <path d="M17 5v14" />
      <path d="M21 5v14" />
    </svg>
  )
}

export function Folder({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  )
}

export function TrendingUp({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

export function ArrowDownRight({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="m7 7 10 10" />
      <path d="M17 7v10H7" />
    </svg>
  )
}

export function ArrowUpRight({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  )
}

export function Loader2({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={`animate-spin ${className}`} {...defaultProps} {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export function Mail({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

export function Lock({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function Eye({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOff({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

export function ShieldCheck({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function Check({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function KeyRound({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
      <circle cx="16.5" cy="7.5" r=".5" />
    </svg>
  )
}

export function Building2({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  )
}

export function Camera({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

export function ScanBarcode({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 8v8" />
      <path d="M12 8v8" />
      <path d="M17 8v8" />
    </svg>
  )
}

export function Calculator({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  )
}

export function FileSpreadsheet({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h2" />
      <path d="M14 13h2" />
      <path d="M8 17h2" />
      <path d="M14 17h2" />
    </svg>
  )
}

export function Banknote({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}

export function Upload({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

export function FileText({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  )
}

export function Printer({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  )
}

export function Phone({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...defaultProps} {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
