import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { answerQuestion } from '@/data/wardsData';

interface Message {
  id: number;
  text: string;
  isBot: boolean;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: 'Xin chào! Tôi là trợ lý tra cứu thông tin phường/xã Hải Phòng. Bạn có thể hỏi về đặc sản, địa điểm, dân số, diện tích hoặc nguồn gốc sáp nhập của bất kỳ phường/xã nào.',
      isBot: true,
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: input,
      isBot: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Get answer from data
    setTimeout(() => {
      const answer = answerQuestion(input);
      const botMessage: Message = {
        id: Date.now() + 1,
        text: answer,
        isBot: true,
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Format message text (handle markdown-like formatting)
  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Handle bold text
      const formattedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return (
        <span
          key={i}
          className="block"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 left-3 sm:left-auto z-50 sm:w-96 sm:max-w-[calc(100vw-3rem)] h-[70vh] sm:h-[500px] max-h-[calc(100vh-7rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="map-header px-4 py-3 flex items-center gap-3">
            <Bot className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Trợ lý Tra cứu</h3>
              <p className="text-xs opacity-80">Hỏi về thông tin phường/xã</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.isBot ? '' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      message.isBot
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {message.isBot ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] ${
                      message.isBot ? 'chat-bubble-bot' : 'chat-bubble-user'
                    }`}
                  >
                    <div className="text-sm leading-relaxed">
                      {formatMessage(message.text)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Nhập câu hỏi của bạn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleSend} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ví dụ: "Phường Hồng Bàng có đặc sản gì?"
            </p>
          </div>
        </div>
      )}
    </>
  );
}
