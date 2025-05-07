import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface ChatProps {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread?: boolean;
}

interface MessageProps {
  id: string;
  content: string;
  sender_id: string;
  timestamp: string;
  is_mine: boolean;
}

const MessageItem: React.FC<ChatProps & { onClick: () => void }> = ({
  id,
  name,
  lastMessage,
  time,
  avatar,
  unread,
  onClick,
}) => {
  return (
    <div 
      className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" 
      onClick={onClick}
    >
      <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <h3 className={`font-medium ${unread ? "text-black" : ""}`}>{name}</h3>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className={`text-sm truncate ${unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
          {lastMessage}
        </p>
      </div>
      {unread && (
        <div className="ml-2 h-2 w-2 bg-iparty rounded-full"></div>
      )}
    </div>
  );
};

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Today, show time
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    // Yesterday
    return 'Ontem';
  } else if (diffDays < 7) {
    // Less than a week, show day of week
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  } else {
    // More than a week, show date
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
};

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get('chat');

  const [chats, setChats] = useState<ChatProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<ChatProps | null>(null);

  useEffect(() => {
    const fetchUserAndChats = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          setUserId(userData.user.id);
          
          // Fetch chats using direct query instead of RPC
          const { data: chatsData, error } = await supabase.functions
            .invoke('get_user_chats');
            
          if (error) {
            console.error("Error fetching chats:", error);
            // Fallback query if RPC is not available
            const { data: fallbackChatsData, error: fallbackError } = await supabase
              .from("chats")
              .select("*")
              .or(`user_id.eq.${userData.user.id},owner_id.eq.${userData.user.id}`)
              .order('last_message_time', { ascending: false });
              
            if (fallbackError) throw fallbackError;
            
            if (fallbackChatsData) {
              const formattedChats = fallbackChatsData.map(chat => ({
                id: chat.id,
                name: chat.space_name || "Conversa",
                lastMessage: chat.last_message || "Iniciar conversa...",
                time: formatTime(chat.last_message_time),
                avatar: chat.space_image || "https://source.unsplash.com/random/100x100?building",
                unread: chat.has_unread && chat.last_message_sender_id !== userData.user.id
              }));
              
              setChats(formattedChats);
              
              // If there's a chat ID in the URL, select it
              if (chatIdFromUrl) {
                setSelectedChat(chatIdFromUrl);
                
                // Remove the chat parameter from the URL
                searchParams.delete('chat');
                setSearchParams(searchParams);
              }
            }
          } else if (chatsData) {
            // Handle data if it's an array
            if (Array.isArray(chatsData)) {
              const formattedChats = chatsData.map(chat => ({
                id: chat.id,
                name: chat.space_name || "Conversa",
                lastMessage: chat.last_message || "Iniciar conversa...",
                time: formatTime(chat.last_message_time),
                avatar: chat.space_image || "https://source.unsplash.com/random/100x100?building",
                unread: chat.has_unread && chat.last_message_sender_id !== userData.user.id
              }));
              
              setChats(formattedChats);
              
              // If there's a chat ID in the URL, select it
              if (chatIdFromUrl) {
                setSelectedChat(chatIdFromUrl);
                
                // Remove the chat parameter from the URL
                searchParams.delete('chat');
                setSearchParams(searchParams);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
        toast.error("Erro ao carregar conversas");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndChats();
    
    // Setup subscription for real-time updates
    const channel = supabase
      .channel('public:chats')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'chats' }, 
        payload => {
          setChats(currentChats => {
            const updatedChat = payload.new as any;
            return currentChats.map(chat => {
              if (chat.id === updatedChat.id) {
                return {
                  ...chat,
                  lastMessage: updatedChat.last_message || chat.lastMessage,
                  time: formatTime(updatedChat.last_message_time),
                  unread: updatedChat.has_unread && updatedChat.last_message_sender_id !== userId
                };
              }
              return chat;
            });
          });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatIdFromUrl, searchParams, setSearchParams]);
  
  // Load messages when a chat is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;
      
      try {
        const { data: selectedChatInfo, error: chatError } = await supabase
          .from("chats")
          .select("*")
          .eq("id", selectedChat)
          .single();
          
        if (chatError) throw chatError;
        
        if (selectedChatInfo) {
          const chatProps = chats.find(c => c.id === selectedChat);
          if (chatProps) {
            setChatInfo(chatProps);
          }
          
          // Mark messages as read
          if (selectedChatInfo.has_unread && selectedChatInfo.last_message_sender_id !== userId) {
            await supabase
              .from("chats")
              .update({ has_unread: false })
              .eq("id", selectedChat);
              
            // Update local state to remove unread indicator
            setChats(currentChats => 
              currentChats.map(chat => 
                chat.id === selectedChat ? { ...chat, unread: false } : chat
              )
            );
          }
        }
        
        // Fetch messages for selected chat
        const { data: messagesData, error } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", selectedChat)
          .order("created_at", { ascending: true });
          
        if (error) throw error;
        
        if (messagesData) {
          const formattedMessages = messagesData.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            timestamp: msg.created_at,
            is_mine: msg.sender_id === userId
          }));
          
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Erro ao carregar mensagens");
      }
    };
    
    fetchMessages();
    
    // Setup subscription for real-time message updates
    const messagesChannel = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat}` }, 
        payload => {
          const newMsg = payload.new as any;
          setMessages(currentMsgs => [
            ...currentMsgs, 
            {
              id: newMsg.id,
              content: newMsg.content,
              sender_id: newMsg.sender_id,
              timestamp: newMsg.created_at,
              is_mine: newMsg.sender_id === userId
            }
          ]);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedChat, userId, chats]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !userId) return;
    
    try {
      setSendingMessage(true);
      
      // Insert new message
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          chat_id: selectedChat,
          sender_id: userId,
          content: newMessage
        });
        
      if (messageError) throw messageError;
      
      // Update chat with last message
      const { error: chatError } = await supabase
        .from("chats")
        .update({
          last_message: newMessage,
          last_message_time: new Date().toISOString(),
          last_message_sender_id: userId,
          has_unread: true
        })
        .eq("id", selectedChat);
        
      if (chatError) throw chatError;
      
      // Clear message input
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };
  
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      {!selectedChat ? (
        // Chat list view
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Buscar mensagens..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="animate-spin h-6 w-6 text-iparty" />
              </div>
            ) : filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <MessageItem 
                  key={chat.id} 
                  {...chat}
                  onClick={() => setSelectedChat(chat.id)}  
                />
              ))
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-2 text-muted-foreground">
                  {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa iniciada'}
                </p>
                <p className="text-sm text-muted-foreground/70">
                  {searchQuery ? 'Tente outro termo de busca' : 'Visite um espaço e clique no botão de mensagem para começar'}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        // Chat detail view
        <div className="flex flex-col h-[80vh]">
          {/* Chat header */}
          <div className="flex items-center p-4 border-b bg-white rounded-t-xl shadow-sm">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-2 p-1"
              onClick={() => setSelectedChat(null)}
            >
              <ArrowLeft size={20} />
            </Button>
            
            {chatInfo && (
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                  <img src={chatInfo.avatar} alt={chatInfo.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-medium">{chatInfo.name}</h3>
                </div>
              </div>
            )}
          </div>
          
          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
            {messages.length > 0 ? (
              messages.map(message => (
                <div 
                  key={message.id} 
                  className={`mb-4 max-w-[80%] ${message.is_mine ? 'ml-auto' : 'mr-auto'}`}
                >
                  <div className={`rounded-lg p-3 ${message.is_mine ? 'bg-iparty text-white' : 'bg-white'}`}>
                    {message.content}
                  </div>
                  <div className={`text-xs mt-1 ${message.is_mine ? 'text-right' : ''} text-muted-foreground`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Inicie uma conversa</p>
                <p className="text-sm text-muted-foreground/70">Envie uma mensagem para começar</p>
              </div>
            )}
          </div>
          
          {/* Message input - Modified to remove padding-bottom to reduce space */}
          <div className="p-4 pb-0 bg-white border-t rounded-b-xl">
            <form 
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <Textarea 
                placeholder="Digite sua mensagem..." 
                className="resize-none"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                type="submit" 
                disabled={sendingMessage || !newMessage.trim()}
                className="bg-iparty hover:bg-iparty-dark"
              >
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
