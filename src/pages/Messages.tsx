import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, ArrowLeft, Trash2, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import OptimizedImage from "@/components/OptimizedImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// Types
interface ChatProps {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread?: boolean;
  space_id?: string;
  deleted?: boolean;
}

interface MessageProps {
  id: string;
  content: string;
  sender_id: string;
  timestamp: string;
  is_mine: boolean;
}

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

// Helper Components
const ChatItem = ({ chat, onClick }: { chat: ChatProps; onClick: () => void }) => {
  return (
    <div 
      className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" 
      onClick={onClick}
    >
      <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
        <OptimizedImage 
          src={chat.avatar || ""}
          alt={chat.name} 
          className="w-full h-full"
          fallbackSrc="https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=200&auto=format&fit=crop"
        />
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <h3 className={`font-medium truncate max-w-[160px] ${chat.unread ? "text-black" : ""}`} title={chat.name}>{chat.name}</h3>
          <span className="text-xs text-muted-foreground">{chat.time}</span>
        </div>
        <p className={`text-sm truncate ${chat.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
          {chat.lastMessage}
        </p>
      </div>
      {chat.unread && (
        <div className="ml-2 h-2 w-2 bg-iparty rounded-full"></div>
      )}
    </div>
  );
};

const ChatHeader = ({ 
  userProfile, 
  chatInfo, 
  spaceImages, 
  chatCreatedAt 
}: { 
  userProfile: UserProfile | null;
  chatInfo: ChatProps | null;
  spaceImages: Record<string, string>;
  chatCreatedAt: string | null;
}) => {
  const formatChatDate = (isoString: string): string => {
    const date = new Date(isoString);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!chatInfo) return null;

  return (
    <div className="p-4 bg-white border-b space-y-3">
      {/* User Info */}
      {userProfile && (
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage 
              src={userProfile.avatar_url || ""} 
              alt={userProfile.first_name && userProfile.last_name 
                ? `${userProfile.first_name} ${userProfile.last_name}` 
                : userProfile.first_name || 'Usuário'
              } 
            />
            <AvatarFallback>
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-base">
              {userProfile.first_name && userProfile.last_name 
                ? `${userProfile.first_name} ${userProfile.last_name}` 
                : userProfile.first_name || 'Usuário'
              }
            </h3>
            <p className="text-sm text-muted-foreground">Conversando sobre</p>
          </div>
        </div>
      )}

      {/* Space Info */}
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 rounded-lg overflow-hidden">
          <OptimizedImage 
            src={chatInfo.space_id ? spaceImages[chatInfo.space_id] || chatInfo.avatar : chatInfo.avatar}
            alt={chatInfo.name} 
            className="w-full h-full object-cover"
            fallbackSrc="https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=200&auto=format&fit=crop"
          />
        </div>
        <div>
          <h3 className="font-medium text-base">{chatInfo.name}</h3>
          <p className="text-sm text-muted-foreground">Espaço para eventos</p>
        </div>
      </div>

      {/* Chat Date */}
      {chatCreatedAt && (
        <div className="text-center">
          <span className="text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
            {formatChatDate(chatCreatedAt)}
          </span>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ searchQuery = "", onBack }: { searchQuery?: string; onBack?: () => void }) => (
  <div className="p-8 text-center">
    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
    <p className="mt-2 text-muted-foreground">
      {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa iniciada'}
    </p>
    <p className="text-sm text-muted-foreground/70">
      {searchQuery ? 'Tente outro termo de busca' : 'Visite um espaço e clique no botão de mensagem para começar'}
    </p>
    {onBack && (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onBack}
        className="mt-4"
      >
        Voltar para lista de chats
      </Button>
    )}
  </div>
);

const LoadingState = () => (
  <div className="flex justify-center items-center p-8">
    <Loader2 className="animate-spin h-6 w-6 text-iparty" />
  </div>
);

const ErrorState = ({ message = "Erro ao carregar o chat", onBack }: { message?: string; onBack: () => void }) => (
  <div className="h-full flex flex-col items-center justify-center text-center">
    <MessageSquare className="h-12 w-12 text-red-400 mb-3" />
    <p className="text-red-500">{message}</p>
    <p className="text-sm text-muted-foreground/70 mt-2">
      Tente voltar e selecionar o chat novamente
    </p>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onBack}
      className="mt-4"
    >
      Voltar para lista de chats
    </Button>
  </div>
);

// Helper functions
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

// Main component
const Messages = () => {
  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Router
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract chatId from different sources with clear priority
  const chatIdFromParams = searchParams.get('chat');
  const chatIdFromState = location.state?.chatId;
  const spaceIdFromState = location.state?.spaceId;
  const spaceOwnerFromState = location.state?.spaceOwnerId;
  
  // State
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
  const [chatLoadError, setChatLoadError] = useState<boolean>(false);
  const [chatErrorMessage, setChatErrorMessage] = useState<string>("");
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [chatDeleted, setChatDeleted] = useState<boolean>(false);
  const [creatingNewChat, setCreatingNewChat] = useState<boolean>(false);
  const [otherUserProfile, setOtherUserProfile] = useState<UserProfile | null>(null);
  const [chatCreatedAt, setChatCreatedAt] = useState<string | null>(null);

  // Function to get user display name
  const getUserDisplayName = (): string => {
    console.log("Getting user display name, otherUserProfile:", otherUserProfile);
    
    if (!otherUserProfile) {
      console.log("No otherUserProfile found, returning 'Usuário'");
      return 'Usuário';
    }
    
    const { first_name, last_name } = otherUserProfile;
    console.log("User names:", { first_name, last_name });
    
    if (first_name && last_name) {
      const fullName = `${first_name} ${last_name}`;
      console.log("Returning full name:", fullName);
      return fullName;
    }
    
    if (first_name) {
      console.log("Returning first name only:", first_name);
      return first_name;
    }
    
    console.log("No valid names found, returning 'Usuário'");
    return 'Usuário';
  };

  // Function to process chats data
  const processChatsData = useCallback(async (chatsData: any[], currentUserId: string) => {
    // Collect all space IDs to fetch their images
    const spaceIds = chatsData
      .filter(chat => chat.space_id)
      .map(chat => chat.space_id);
    
    // Initialize empty image map
    let localImageMap: Record<string, string> = {};
    
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
      unread: chat.has_unread && chat.last_message_sender_id !== currentUserId,
      deleted: chat.deleted || false
    }));
    
    setChats(formattedChats);
    
    return formattedChats;
  }, []);

  // Function to check if a chat exists and is accessible
  const checkChatExists = useCallback(async (chatId: string) => {
    try {
      // Check if the chat exists and is not deleted
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking chat:", error);
        return { exists: false, isDeleted: false, error: error.message };
      }
      
      if (!data) {
        return { exists: false, isDeleted: false, error: "Chat not found" };
      }
      
      return { 
        exists: true, 
        isDeleted: data.deleted || false,
        data
      };
    } catch (error) {
      console.error("Exception checking chat:", error);
      return { exists: false, isDeleted: false, error: "Error checking chat" };
    }
  }, []);

  // Function to fetch user chats
  const fetchChats = useCallback(async (includeDeleted = false) => {
    try {
      setLoading(true);
      setChatLoadError(false);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        setUserId(userData.user.id);
        
        try {
          // Use edge function to get chats with includeDeleted parameter
          console.log("Fetching chats using edge function...");
          const { data: chatsData, error } = await supabase.functions
            .invoke('get_user_chats', {
              body: { include_deleted: includeDeleted }
            });
          
          if (error) {
            console.error("Edge function error:", error);
            throw error;
          }
          
          if (chatsData) {
            console.log("Chats data received:", chatsData);
            await processChatsData(chatsData, userData.user.id);
          }
        } catch (error) {
          console.error("Error with edge function, falling back to direct query:", error);
          
          // Fallback query if edge function fails
          let query = supabase
            .from("chats")
            .select("*")
            .or(`user_id.eq.${userData.user.id},owner_id.eq.${userData.user.id}`)
            .order('last_message_time', { ascending: false });
            
          // Only apply deleted filter if not including deleted chats  
          if (!includeDeleted) {
            query = query.eq('deleted', false);
          }
          
          const { data: fallbackChatsData, error: fallbackError } = await query;
            
          if (fallbackError) {
            console.error("Fallback query error:", fallbackError);
            throw fallbackError;
          }
          
          if (fallbackChatsData) {
            console.log("Fallback chats data received:", fallbackChatsData);
            await processChatsData(fallbackChatsData, userData.user.id);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Erro ao carregar conversas");
      setChatLoadError(true);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [processChatsData]);

  // Function to create a new chat for the same space
  const createOrFindChat = useCallback(async (spaceId: string, spaceOwnerId: string) => {
    if (!userId || !spaceId || !spaceOwnerId) {
      console.error("Missing required parameters for creating chat");
      return null;
    }

    try {
      setCreatingNewChat(true);
      
      // Check if there's an existing chat or create a new one using edge function
      console.log("Creating or finding chat for space:", spaceId);
      const { data: chatData, error } = await supabase.functions
        .invoke('get_chat_by_users_and_space', {
          body: { 
            current_user_id: userId, 
            space_owner_id: spaceOwnerId, 
            current_space_id: spaceId
          }
        });
      
      if (error) {
        console.error("Error creating/finding chat:", error);
        toast.error("Erro ao criar nova conversa");
        return null;
      }
      
      console.log("Chat creation/lookup result:", chatData);
      
      if (chatData && chatData.length > 0) {
        // Return the first chat ID without triggering another fetch first
        return chatData[0].id;
      }
      
      return null;
    } catch (error) {
      console.error("Error in createOrFindChat:", error);
      return null;
    } finally {
      setCreatingNewChat(false);
    }
  }, [userId]);

  // Function to load chat details and messages
  const loadChatDetails = useCallback(async (chatId: string) => {
    console.log("Loading chat details for:", chatId);
    try {
      setChatLoadError(false);
      setChatErrorMessage("");
      setChatDeleted(false);
      
      // Check if the chat exists and is not deleted
      const chatStatus = await checkChatExists(chatId);
      
      if (!chatStatus.exists) {
        console.error("Chat not found");
        toast.error("Chat não encontrado");
        setChatLoadError(true);
        setChatErrorMessage("Chat não encontrado");
        return;
      }
      
      if (chatStatus.isDeleted) {
        console.error("Chat is deleted");
        
        // If we have space details, try to create a new chat
        if (spaceIdFromState && spaceOwnerFromState) {
          console.log("Attempting to create new chat for deleted chat");
          const newChatId = await createOrFindChat(spaceIdFromState, spaceOwnerFromState);
          
          if (newChatId) {
            // Update the selected chat and navigate to it
            setSelectedChat(newChatId);
            navigate(`/messages?chat=${newChatId}`, { replace: true });
            
            // Load the new chat details
            await loadChatDetails(newChatId);
            return;
          }
        }
        
        // If creating a new chat failed or we don't have space details
        toast.error("Esta conversa foi excluída");
        setChatLoadError(true);
        setChatDeleted(true);
        setChatErrorMessage("Esta conversa foi excluída");
        return;
      }
      
      const chatData = chatStatus.data;
      console.log("Chat data loaded:", chatData);
      
      // Set chat created date
      setChatCreatedAt(chatData.created_at);
      
      // Get the other user's profile (the one we're chatting with)
      const otherUserId = chatData.user_id === userId ? chatData.owner_id : chatData.user_id;
      console.log("Other user ID:", otherUserId, "Current user ID:", userId);
      
      if (otherUserId) {
        console.log("Fetching profile for user:", otherUserId);
        
        // Fetch user profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .eq("id", otherUserId)
          .maybeSingle();
        
        console.log("Profile query result:", { profileData, profileError });
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching profile:", profileError);
          setOtherUserProfile(null);
        } else if (profileData) {
          console.log("Setting profile data:", profileData);
          setOtherUserProfile(profileData);
        } else {
          console.log("No profile data found - user may not have completed profile");
          // Set a basic profile with the user ID
          setOtherUserProfile({
            id: otherUserId,
            first_name: null,
            last_name: null,
            avatar_url: null
          });
        }
      } else {
        console.log("No other user ID found");
        setOtherUserProfile(null);
      }
      
      // Find chat info in the existing list or create a new entry
      const existingChat = chats.find(c => c.id === chatId);
      
      if (existingChat) {
        setChatInfo(existingChat);
        console.log("Using existing chat info:", existingChat);
      } else {
        const newChatInfo = {
          id: chatData.id,
          name: chatData.space_name || "Conversa",
          lastMessage: chatData.last_message || "Iniciar conversa...",
          time: formatTime(chatData.last_message_time),
          space_id: chatData.space_id,
          avatar: chatData.space_image || "",
          unread: chatData.has_unread && chatData.last_message_sender_id !== userId,
          deleted: chatData.deleted || false
        };
        
        setChatInfo(newChatInfo);
        console.log("Created new chat info:", newChatInfo);
        setChats(prev => [newChatInfo, ...prev.filter(c => c.id !== chatId)]);
      }
      
      // Mark messages as read if needed
      if (chatData.has_unread && chatData.last_message_sender_id !== userId) {
        await supabase
          .from("chats")
          .update({ has_unread: false })
          .eq("id", chatId);
          
        setChats(currentChats => 
          currentChats.map(chat => 
            chat.id === chatId ? { ...chat, unread: false } : chat
          )
        );
        
        console.log("Marked chat as read");
      }
      
      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      
      if (messagesError) {
        console.error("Messages query error:", messagesError);
        throw messagesError;
      }
      
      if (messagesData) {
        const formattedMessages = messagesData.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          timestamp: msg.created_at,
          is_mine: msg.sender_id === userId
        }));
        
        setMessages(formattedMessages);
        console.log("Loaded messages:", formattedMessages.length);
        
        // Scroll to bottom after messages are loaded
        setTimeout(() => {
          messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      
    } catch (error) {
      console.error("Error loading chat details:", error);
      setChatLoadError(true);
      setChatErrorMessage("Erro ao carregar detalhes do chat");
      toast.error("Erro ao carregar detalhes do chat");
    }
  }, [chats, userId, checkChatExists, createOrFindChat, navigate, spaceIdFromState, spaceOwnerFromState]);

  // Function to send a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !userId) return;
    
    try {
      setSendingMessage(true);
      
      // Check if chat exists and is not deleted before sending
      const chatStatus = await checkChatExists(selectedChat);
      
      if (!chatStatus.exists || chatStatus.isDeleted) {
        toast.error(chatStatus.isDeleted ? "Esta conversa foi excluída" : "Chat não encontrado");
        setChatLoadError(true);
        setChatDeleted(chatStatus.isDeleted);
        setChatErrorMessage(chatStatus.isDeleted ? "Esta conversa foi excluída" : "Chat não encontrado");
        setSendingMessage(false);
        return;
      }
      
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
      
      // Scroll to bottom
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Function to handle chat deletion
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
  
  // Effect to handle chat selection from navigation params
  useEffect(() => {
    // Only run after initial data is loaded
    if (!initialLoadComplete) return;
    
    // Clear URL param but keep the state
    if (chatIdFromParams && !chatIdFromState) {
      navigate('/messages', { replace: true });
    }
    
    // Use chatId from state first (highest priority), then from URL params
    const chatIdToSelect = chatIdFromState || chatIdFromParams;
    
    if (chatIdToSelect && chatIdToSelect !== selectedChat) {
      console.log("Setting selected chat from navigation:", chatIdToSelect);
      setSelectedChat(chatIdToSelect);
      
      // Load chat details without triggering another fetch first
      loadChatDetails(chatIdToSelect);
    }
    
    // Clear navigation state after using it
    if (location.state?.chatId) {
      // Create a new state object without chatId but keeping spaceId and spaceOwnerId
      const newState = { 
        spaceId: location.state.spaceId,
        spaceOwnerId: location.state.spaceOwnerId
      };
      navigate(".", { state: newState, replace: true });
    }
  }, [chatIdFromParams, chatIdFromState, initialLoadComplete, location.state, navigate, selectedChat, loadChatDetails]);
  
  // Effect to load chats and set up subscriptions - only runs once at component mount
  useEffect(() => {
    // Fetch chats (not including deleted by default)
    fetchChats(false);
    
    // Set up real-time subscription for chat updates
    const chatsChannel = supabase
      .channel('public:chats')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'chats' }, 
        payload => {
          const updatedChat = payload.new as any;
          
          // Ignore updates for deleted chats unless it's the selected chat
          if (updatedChat.deleted && updatedChat.id !== selectedChat) {
            setChats(currentChats => 
              currentChats.filter(chat => chat.id !== updatedChat.id)
            );
            return;
          }
          
          setChats(currentChats => {
            const chatExists = currentChats.some(c => c.id === updatedChat.id);
            
            if (chatExists) {
              // Update existing chat
              return currentChats
                .map(chat => {
                  if (chat.id === updatedChat.id) {
                    return {
                      ...chat,
                      lastMessage: updatedChat.last_message || chat.lastMessage,
                      time: formatTime(updatedChat.last_message_time),
                      unread: updatedChat.has_unread && updatedChat.last_message_sender_id !== userId,
                      deleted: updatedChat.deleted || false
                    };
                  }
                  return chat;
                })
                // Move the updated chat to the top
                .sort((a, b) => 
                  a.id === updatedChat.id ? -1 : b.id === updatedChat.id ? 1 : 0
                );
            } else if ((!updatedChat.deleted || updatedChat.id === selectedChat)) {
              // Add new chat if it's not in the list
              const newChat = {
                id: updatedChat.id,
                name: updatedChat.space_name || "Conversa",
                lastMessage: updatedChat.last_message || "Iniciar conversa...",
                time: formatTime(updatedChat.last_message_time),
                space_id: updatedChat.space_id,
                avatar: updatedChat.space_image || "",
                unread: updatedChat.has_unread && updatedChat.last_message_sender_id !== userId,
                deleted: updatedChat.deleted || false
              };
              return [newChat, ...currentChats];
            }
            
            return currentChats;
          });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(chatsChannel);
    };
  }, [fetchChats, userId, selectedChat]);

  // Effect to set up message subscription when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      // Set up real-time subscription for new messages
      const messagesChannel = supabase
        .channel(`messages_${selectedChat}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `chat_id=eq.${selectedChat}`
          }, 
          payload => {
            const newMsg = payload.new as any;
            
            // Add new message
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
            
            // Scroll to bottom
            setTimeout(() => {
              messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [selectedChat, userId]);
  
  // Handle back button click
  const handleBackToChats = useCallback(() => {
    setSelectedChat(null);
    setChatLoadError(false);
    setChatErrorMessage("");
    setChatDeleted(false);
    setOtherUserProfile(null);
    setChatCreatedAt(null);
    // Re-fetch non-deleted chats
    fetchChats(false);
  }, [fetchChats]);
  
  // Filter chats by search query and exclude deleted chats
  const filteredChats = chats.filter(chat => 
    !chat.deleted && chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="container px-4 pb-16 max-w-4xl mx-auto">
      {creatingNewChat ? (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-iparty mb-4" />
          <p className="text-lg">Criando nova conversa...</p>
        </div>
      ) : !selectedChat ? (
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
              <LoadingState />
            ) : filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <ChatItem 
                  key={chat.id} 
                  chat={chat}
                  onClick={() => {
                    setSelectedChat(chat.id);
                    loadChatDetails(chat.id);
                  }}
                />
              ))
            ) : (
              <EmptyState searchQuery={searchQuery} />
            )}
          </div>
        </>
      ) : (
        // Chat detail view
        <div className="flex flex-col h-[calc(100vh-64px)]">
          {/* Chat header with back button */}
          <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-xl shadow-sm">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="mr-3"
                onClick={handleBackToChats}
              >
                <ArrowLeft size={20} />
              </Button>
              
              <h2 className="font-medium">{getUserDisplayName()}</h2>
            </div>

            {/* Delete chat button */}
            {!chatDeleted && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setChatToDelete(selectedChat)}
              >
                <Trash2 size={18} />
              </Button>
            )}
          </div>

          {/* Chat info header */}
          <ChatHeader 
            userProfile={otherUserProfile}
            chatInfo={chatInfo}
            spaceImages={spaceImages}
            chatCreatedAt={chatCreatedAt}
          />
          
          {/* Messages area */}
          <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
            {chatLoadError ? (
              <ErrorState 
                message={chatErrorMessage || "Erro ao carregar o chat"} 
                onBack={handleBackToChats} 
              />
            ) : messages.length > 0 ? (
              <>
                {messages.map(message => (
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
                ))}
                <div ref={messageEndRef} />
              </>
            ) : (
              <EmptyState />
            )}
          </div>
          
          {/* Message input - only show if chat is not deleted */}
          {!chatDeleted && !chatLoadError && (
            <div className="p-4 pt-2 bg-white border-t">
              <form 
                className="flex items-end gap-2"
                onSubmit={handleSendMessage}
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
          )}
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
