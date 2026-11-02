import React from 'react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'success' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
}

export function Alert({ variant = 'info', title, children, className = '', ...props }: AlertProps) {
  const styles = {
    error: {
      container: 'bg-[#FFF0F0] border-[#C93B3B]/30 text-[#16201C]',
      icon: (
        <svg className="w-4 h-4 text-[#C93B3B] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleClass: 'text-[#C93B3B]',
    },
    success: {
      container: 'bg-[#EBFBF3] border-[#2A7A4C]/30 text-[#16201C]',
      icon: (
        <svg className="w-4 h-4 text-[#2A7A4C] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleClass: 'text-[#2A7A4C]',
    },
    warning: {
      container: 'bg-[#FFF8EB] border-[#C97D1A]/30 text-[#16201C]',
      icon: (
        <svg className="w-4 h-4 text-[#C97D1A] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      titleClass: 'text-[#C97D1A]',
    },
    info: {
      container: 'bg-[#FAFAF7] border-[#E7E5DF] text-[#16201C]',
      icon: (
        <svg className="w-4 h-4 text-[#16201C] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleClass: 'text-[#16201C]',
    },
  }[variant]

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 p-3 rounded-[6px] border text-[13px] font-sans ${styles.container} ${className}`}
      {...props}
    >
      {styles.icon}
      <div className="flex-1">
        {title && <h4 className={`font-medium mb-0.5 text-[13px] ${styles.titleClass}`}>{title}</h4>}
        <div className="leading-normal text-[#6B7A72]">{children}</div>
      </div>
    </div>
  )
}
