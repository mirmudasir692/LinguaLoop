import * as React from 'react';

export function Tool({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={`my-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 ${className}`}>{children}</div>;
}
export function ToolHeader({ type, state, className }: { type: string; state: string; className?: string }) {
    const toolName = type.replace('tool-', '');
    return <div className={`mb-2 flex items-center justify-between font-medium text-gray-700 dark:text-gray-300 ${className}`}>🛠️ {toolName} ({state})</div>;
}
export function ToolContent({ children }: { children: React.ReactNode }) {
    return <div className="space-y-2">{children}</div>;
}
export function ToolInput({ input }: { input: Record<string, unknown> }) {
    return (
        <div className="text-sm">
            <span className="font-semibold text-gray-600 dark:text-gray-400">Input:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-gray-200 p-2 text-xs dark:bg-gray-800">{JSON.stringify(input, null, 2)}</pre>
        </div>
    );
}
export function ToolOutput({ output, errorText }: { output?: unknown; errorText?: string }) {
    if (errorText) return <div className="text-sm text-red-600 dark:text-red-400"><span className="font-semibold">Error:</span> {errorText}</div>;
    return (
        <div className="text-sm">
            <span className="font-semibold text-gray-600 dark:text-gray-400">Output:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-gray-200 p-2 text-xs dark:bg-gray-800">{JSON.stringify(output, null, 2)}</pre>
        </div>
    );
}