import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams, useLocation } from "react-router-dom";
import OptimizedImage from "@/components/OptimizedImage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ChatProps {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread?: boolean;
  space_id?: string;
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
  space_id,
}) => {
  return (
    <div 
      className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" 
      onClick={onClick}
    >
      <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
        <OptimizedImage 
          src={avatar || ""}
          alt={name} 
          className="w-full h-full"
          fallbackSrc="https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=200&auto=format&fit=crop"
        />
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <h3 className={`font-medium truncate max-w-[160px] ${unread ? "text-black" : ""}`} title={name}>{name}</h3>
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
  const [searchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get('chat');
  const location = useLocation();
  
  // Get selectedChatId from location state if available
  const stateSelectedChatId = location.state?.selectedChatId;

  const [chats, setChats] = useState<ChatProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<ChatProps | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [spaceImages, setSpaceImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUserAndChats = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          setUserId(userData.user.id);
          
          try {
            // Use our updated edge function with userId in the request body
            const { data: chatsData, error } = await supabase.functions
              .invoke('get_user_chats', {
                body: { userId: userData.user.id }
              });
              
            if (error) {
              console.error("Error fetching chats:", error);
              toast.error("Erro ao carregar conversas: " + (error.message || "Tente novamente mais tarde"));
              
              // Fallback query if Edge Function fails
              const { data: fallbackChatsData, error: fallbackError } = await supabase
                .from("chats")
                .select("*")
                .or(`user_id.eq.${userData.user.id},owner_id.eq.${userData.user.id}`)
                .is('deleted', false)
                .order('last_message_time', { ascending: false });
                
              if (fallbackError) {
                console.error("Fallback query error:", fallbackError);
                throw fallbackError;
              }
              
              await processChatsData(fallbackChatsData, userData.user.id);
            } else if (chatsData) {
              await processChatsData(chatsData, userData.user.id);
            }
          } catch (error) {
            console.error("Error processing chats:", error);
            toast.error("Erro ao processar conversas: " + (error.message || "Tente novamente mais tarde"));
          }
        }
      } catch (error) {
        console.error("Error in fetchUserAndChats:", error);
        toast.error("Erro ao carregar conversas: " + (error.message || "Tente novamente mais tarde"));
      } finally {
        setLoading(false);
      }
    };
    
    // New helper function to process chats data
    const processChatsData = async (chatsData, userId) => {
      if (Array.isArray(chatsData)) {
        // Collect all space IDs to fetch their images
        const spaceIds = chatsData
          .filter(chat => chat.space_id)
          .map(chat => chat.space_id);
        
        // Initialize empty image map
        let localImageMap = {};
        
        // Fetch space photos for all spaces at once
        if (spaceIds.length > 0) {
          const { data: spacesData } = await supabase
            .from("spaces")
            .select("id, space_photos(storage_path)")
            .in("id", spaceIds);
          
          // Get signed URLs for all spaces with photos
          if (spacesData) {
            await Promise.all(spacesData.map(async (space) => {
              if (space.space_photos && space.space_photos.length > 0) {
                try {
                  const { data: urlData } = await supabase.storage
                    .from('spaces')
                    .createSignedUrl(space.space_photos[0].storage_path, 3600);
                    
                  if (urlData?.signedUrl) {
                    localImageMap[space.id] = urlData.signedUrl;
                  }
                } catch (err) {
                  console.error("Error getting signed URL for space:", space.id, err);
                }
              }
            }));
          }
          
          setSpaceImages(localImageMap);
        }
        
        const formattedChats = chatsData.map(chat => ({
          id: chat.id,
          name: chat.space_name || "Conversa",
          lastMessage: chat.last_message || "Iniciar conversa...",
          time: formatTime(chat.last_message_time),
          space_id: chat.space_id,
          avatar: chat.space_id && localImageMap[chat.space_id] ? localImageMap[chat.space_id] : chat.space_image || "",
          unread: chat.has_unread && chat.last_message_sender_id !== userId
        }));
        
        setChats(formattedChats);
        
        // Priority for selecting chat: 
        // 1. stateSelectedChatId (from navigation state)
        // 2. chatIdFromUrl (from URL parameter)
        const chatToSelect = stateSelectedChatId || chatIdFromUrl;
        
        if (chatToSelect) {
          console.log("Setting selected chat from parameters:", chatToSelect);
          setSelectedChat(chatToSelect);
        }
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
            // Ignore updates for deleted chats
            if (updatedChat.deleted) {
              return currentChats.filter(chat => chat.id !== updatedChat.id);
            }
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
  }, [chatIdFromUrl, stateSelectedChatId]); // Include stateSelectedChatId in dependencies
  
  // Load messages when a chat is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;
      
      try {
        console.log("Fetching messages for chat:", selectedChat);
        
        const { data: selectedChatInfo, error: chatError } = await supabase
          .from("chats")
          .select("*")
          .eq("id", selectedChat)
          .single();
          
        if (chatError) {
          console.error("Error fetching chat info:", chatError);
          throw chatError;
        }
        
        if (selectedChatInfo) {
          // Find the chat in our local state to get the UI info
          const chatProps = chats.find(c => c.id === selectedChat);
          if (chatProps) {
            setChatInfo(chatProps);
          } else {
            // If not found in local state, create basic info from DB
            setChatInfo({
              id: selectedChatInfo.id,
              name: selectedChatInfo.space_name || "Conversa",
              lastMessage: selectedChatInfo.last_message || "",
              time: formatTime(selectedChatInfo.last_message_time),
              avatar: selectedChatInfo.space_image || "",
              space_id: selectedChatInfo.space_id
            });
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
          
        if (error) {
          console.error("Error fetching messages:", error);
          throw error;
        }
        
        if (messagesData) {
          console.log("Loaded messages:", messagesData.length);
          
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
  
  const handleDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      // Update chat to mark it as deleted
      const { error: chatUpdateError } = await supabase
        .from("chats")
        .update({ deleted: true })
        .eq("id", chatToDelete);
        
      if (chatUpdateError) throw chatUpdateError;
      
      // Update the UI by removing the deleted chat
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatToDelete));
      
      // If the deleted chat was selected, clear the selection
      if (selectedChat === chatToDelete) {
        setSelectedChat(null);
        setMessages([]);
        setChatInfo(null);
      }
      
      toast.success("Conversa excluída com sucesso");
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Erro ao excluir conversa");
    } finally {
      // Close the dialog
      setChatToDelete(null);
    }
  };
  
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="container px-4 pb-16 max-w-4xl mx-auto">
      {!selectedChat ? (
        // Chat list view
        <>
          <div className="relative mb-6 mt-6">
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
        <div className="flex flex-col h-[calc(100vh-64px)]">
          {/* Chat header */}
          <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-xl shadow-sm">
            <div className="flex items-center">
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
                    <OptimizedImage 
                      src={chatInfo.space_id ? spaceImages[chatInfo.space_id] || "" : chatInfo.avatar || ""}
                      alt={chatInfo.name} 
                      className="w-full h-full"
                      fallbackSrc="https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=200&auto=format&fit=crop"
                    />
                  </div>
                  <div className="max-w-[180px]">
                    <h3 className="font-medium truncate text-sm" title={chatInfo.name}>{chatInfo.name}</h3>
                  </div>
                </div>
              )}
            </div>

            {/* Delete chat button in top right corner */}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setChatToDelete(selectedChat)}
            >
              <Trash2 size={18} />
            </Button>
          </div>
          
          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
            {messages.length > 0 ? (
              messages.map(message => (
                <div 
                  key={message.id} 
                  className={cn(
                    "mb-4 flex",
                    message.is_mine ? "justify-end" : "justify-start"
                  )}
                >
                  <div className="max-w-[80%] inline-block">
                    <div 
                      className={cn(
                        "rounded-2xl p-3 px-4 inline-block", 
                        message.is_mine 
                          ? "bg-iparty text-white rounded-tr-none" 
                          : "bg-white rounded-tl-none"
                      )}
                    >
                      {message.content}
                    </div>
                    <div 
                      className={cn(
                        "text-xs mt-1 text-muted-foreground",
                        message.is_mine ? "text-right" : ""
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </div>
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
          
          {/* Message input */}
          <div className="p-4 pt-2 bg-white border-t">
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
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Esta conversa e todas as suas mensagens serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;
