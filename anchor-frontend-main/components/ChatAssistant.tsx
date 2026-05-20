import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';

export const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      text: "Hello! I'm your Supply Chain AI Agent. Ask me about SKU details, stock levels, or revenue forecasts.", 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Connect directly to your new FastAPI backend
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMsg.text })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: data.response,
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, botMsg]);
      
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: "I couldn't reach the Supply Chain server. Is the FastAPI backend running?", 
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-transform hover:scale-105 z-50 flex items-center justify-center"
        aria-label="Open AI Assistant"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-blue-400" />
          <span className="font-semibold">Supply Chain Agent</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            } ${msg.isError ? 'border-red-500 text-red-600' : ''}`}>
              <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
                 {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                 <span>{msg.role === 'user' ? 'You' : 'Agent'}</span>
              </div>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span className="text-xs text-gray-500">Agent is searching records...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about SKU data or run a forecast..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="p-2 bg-slate-900 text-white rounded-lg disabled:opacity-50 hover:bg-slate-800 transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};




// import React, { useState, useRef, useEffect } from 'react';
// import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
// import { createChatSession, sendMessageToChat } from '../services/geminiService';
// import { ChatMessage } from '../types';

// export const ChatAssistant: React.FC = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [messages, setMessages] = useState<ChatMessage[]>([
//     { id: '1', role: 'model', text: "Hello Operator. I'm connected to the Anchor Console. How can I assist you with system diagnostics today?", timestamp: new Date() }
//   ]);
//   const [input, setInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const chatSession = useRef<any>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (isOpen && !chatSession.current) {
//       try {
//         chatSession.current = createChatSession();
//       } catch (e) {
//         console.warn("API Key might be missing for chat");
//       }
//     }
//   }, [isOpen]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const handleSend = async () => {
//     if (!input.trim()) return;
    
//     const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
//     setMessages(prev => [...prev, userMsg]);
//     setInput('');
//     setIsLoading(true);

//     try {
//       if (!chatSession.current) {
//          chatSession.current = createChatSession();
//       }
//       const responseText = await sendMessageToChat(chatSession.current, userMsg.text);
      
//       const botMsg: ChatMessage = { 
//         id: (Date.now() + 1).toString(), 
//         role: 'model', 
//         text: responseText, 
//         timestamp: new Date() 
//       };
//       setMessages(prev => [...prev, botMsg]);
//     } catch (err) {
//       const errorMsg: ChatMessage = { 
//         id: (Date.now() + 1).toString(), 
//         role: 'model', 
//         text: "I encountered an error processing your request. Please check your API configuration.", 
//         timestamp: new Date(),
//         isError: true
//       };
//       setMessages(prev => [...prev, errorMsg]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   if (!isOpen) {
//     return (
//       <button 
//         onClick={() => setIsOpen(true)}
//         className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-transform hover:scale-105 z-50 flex items-center justify-center"
//         aria-label="Open AI Assistant"
//       >
//         <Bot size={24} />
//       </button>
//     );
//   }

//   return (
//     <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden font-sans">
//       {/* Header */}
//       <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
//         <div className="flex items-center gap-2">
//           <Bot size={20} className="text-blue-400" />
//           <span className="font-semibold">Console Assistant</span>
//         </div>
//         <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
//           <X size={20} />
//         </button>
//       </div>

//       {/* Messages */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
//         {messages.map((msg) => (
//           <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//             <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
//               msg.role === 'user' 
//                 ? 'bg-blue-600 text-white rounded-br-none' 
//                 : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
//             }`}>
//               <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
//                  {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
//                  <span>{msg.role === 'user' ? 'You' : 'Gemini'}</span>
//               </div>
//               <div className="whitespace-pre-wrap">{msg.text}</div>
//             </div>
//           </div>
//         ))}
//         {isLoading && (
//           <div className="flex justify-start">
//              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
//                 <Loader2 size={16} className="animate-spin text-blue-600" />
//                 <span className="text-xs text-gray-500">Processing...</span>
//              </div>
//           </div>
//         )}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input */}
//       <div className="p-4 bg-white border-t border-gray-100">
//         <form 
//           onSubmit={(e) => { e.preventDefault(); handleSend(); }}
//           className="flex items-center gap-2"
//         >
//           <input
//             type="text"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             placeholder="Ask about anchors, logs, or metrics..."
//             className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
//           />
//           <button 
//             type="submit" 
//             disabled={isLoading || !input.trim()}
//             className="p-2 bg-slate-900 text-white rounded-lg disabled:opacity-50 hover:bg-slate-800 transition-colors"
//           >
//             <Send size={18} />
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };