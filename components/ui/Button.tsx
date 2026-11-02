import React from 'react'
import { Spinner } from './Spinner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-[6px] transition-colors duration-100 ease-out select-none cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A33D] focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed'

  const variantClasses = {
    primary:
      'bg-[#16201C] text-[#FAFAF7] hover:bg-black active:bg-[#262626] border border-[#16201C]',
    secondary:
      'bg-white text-[#16201C] border border-[#E7E5DF] hover:bg-[#F4F3EF] hover:border-[#16201C]/20',
    outline:
      'border border-[#E7E5DF] bg-transparent text-[#16201C] hover:bg-[#F4F3EF] hover:border-[#16201C]/20',
    danger:
      'bg-[#C93B3B] text-white hover:bg-[#B32D2D] active:bg-[#9B2323]',
    ghost:
      'text-[#6B7A72] hover:text-[#16201C] hover:bg-black/[0.04]',
  }[variant]

  const sizeClasses = {
    sm: 'h-7 text-xs px-2.5 gap-1.5',
    md: 'h-8 text-[13px] px-3 gap-2',
    lg: 'h-9 text-sm px-4 gap-2',
  }[size]

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} className="text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  )
}
