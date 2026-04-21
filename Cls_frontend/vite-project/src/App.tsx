import axios from 'axios';
import { Bot, Loader2, RefreshCw, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ChatInterface = () => {
  // history state will store the messages in the format your API expects: 
  // [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }]
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };

    // Optimistically update UI
    setHistory((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/chat', {
        message: input,
        history: history, // Sending current history to the backend
      });

      // Your API returns { reply: "...", history: [...] }
      // We update our local history with what the server processed
      if (response.data.history) {
        setHistory(response.data.history);
      } else {
        // Fallback if history isn't returned correctly
        const botMessage = { role: 'assistant', content: response.data.reply };
        setHistory((prev) => [...prev, botMessage]);
      }

    } catch (error) {
      console.error("API Error:", error);
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', content: " Error connecting to server. Is the backend running?" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => setHistory([]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg">Tavily-Talk</h1>
            <p className="text-xs text-slate-400">Live Web Search Enabled</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
          title="Clear Conversation"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      {/* Chat Area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {history.filter(m => m.role !== 'system').map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-700 border border-slate-600'
                }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-orange-400" />}
              </div>

              <div className={`p-4 rounded-2xl ${msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content || (msg.tool_calls ? "Searching the web..." : "")}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center gap-3">
              <Loader2 className="animate-spin text-orange-500" size={18} />
              <span className="text-sm text-slate-400 italic">Llama is thinking & searching...</span>
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-500 disabled:opacity-50 disabled:hover:bg-orange-600 transition-all font-bold flex items-center gap-2"
          >
            <Send size={18} />
            <span className="hidden md:inline">Send</span>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatInterface;