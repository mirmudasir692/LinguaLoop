import * as React from 'react';

export function PromptInput({ onSubmit, children, className }: { onSubmit: () => void; children: React.ReactNode; className?: string }) {
    return <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className={className}>{children}</form>;
}
export function PromptInputBody({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={className}>{children}</div>;
}
export function PromptInputTextarea({
    value, onChange, placeholder, disabled, className
}: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string
}) {
    return (
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white ${className}`}
            rows={1}
        />
    );
}