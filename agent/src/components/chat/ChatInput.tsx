import { useState } from 'react';
import { Send } from 'lucide-react';

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2 bg-white">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message…"
        disabled={disabled}
        className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 disabled:opacity-50"
      >
        <Send size={20} />
      </button>
    </form>
  );
}
