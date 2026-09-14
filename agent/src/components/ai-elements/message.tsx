import * as React from 'react';

export function Message({
  from,
  children,
  className,
}: {
  from?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const isUser = from === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}>
      {children}
    </div>
  );
}
export function MessageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`max-w-[80%] rounded-lg px-4 py-2 ${className}`}>{children}</div>;
}
export function MessageResponse({ children }: { children: React.ReactNode }) {
  return <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{children}</div>;
}
