import React, { forwardRef, InputHTMLAttributes, ReactNode, useId, useState } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      id,
      type = 'text',
      className = '',
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : generatedId);
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordField = type === 'password';
    const computedType =
      isPasswordField && showPasswordToggle ? (isPasswordVisible ? 'text' : 'password') : type;

    const describedBy =
      [error ? errorId : undefined, !error && helperText ? helperId : undefined]
        .filter(Boolean)
        .join(' ') || undefined;

    return (
      <div className="input-group">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && (
              <span className="input-required-asterisk" aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </label>
        )}

        <div className="input-field-container">
          {leftIcon && (
            <span className="input-icon input-icon-left" aria-hidden="true">
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            type={computedType}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={[
              'input-field',
              leftIcon ? 'has-left-icon' : '',
              rightIcon || (isPasswordField && showPasswordToggle) ? 'has-right-icon' : '',
              error ? 'input-field-error' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />

          {isPasswordField && showPasswordToggle ? (
            <button
              type="button"
              className="input-password-toggle"
              onClick={() => setIsPasswordVisible((prev) => !prev)}
              tabIndex={-1}
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            >
              {isPasswordVisible ? (
                <svg
                  className="input-eye-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  className="input-eye-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          ) : (
            rightIcon && (
              <span className="input-icon input-icon-right" aria-hidden="true">
                {rightIcon}
              </span>
            )
          )}
        </div>

        {error && (
          <p id={errorId} className="input-error-text" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="input-helper-text">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
