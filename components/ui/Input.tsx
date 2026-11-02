import React, { forwardRef, useId } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightElement, className = '', id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const describedBy = [
      error ? errorId : null,
      helperText && !error ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined

    return (
      <div className="w-full font-sans">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-[#16201C] mb-1.5"
          >
            {label}
            {props.required && <span className="text-[#C93B3B] ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#6B7A72]">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={`w-full rounded-[6px] border bg-white px-3 py-2 text-[13px] text-[#16201C] transition-colors placeholder:text-[#6B7A72] focus:outline-none disabled:bg-[#FAFAF7] disabled:text-[#6B7A72] disabled:cursor-not-allowed ${
              leftIcon ? 'pl-8' : ''
            } ${rightElement ? 'pr-9' : ''} ${
              error
                ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B] text-[#C93B3B]'
                : 'border-[#E7E5DF] hover:border-[#16201C]/40 focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D]'
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="mt-1 text-[12px] text-[#C93B3B]">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="mt-1 text-[12px] text-[#6B7A72]">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
