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
import { filterOffensiveContent } from "@/utils/contentModeration";

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
  user_id?: string;
  owner_id?: string;
}

interface MessageProps {
  id: string;
  content: string;
  sender_id: string;
  timestamp: string;
  is_mine: boolean;
  is_ai_response?: boolean;
}

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

// Helper Components
const ChatItem = ({ chat, onClick, otherUserName }: { 
  chat: ChatProps; 
  onClick: () => void; 
  otherUserName?: string;
}) => {
  return (
    <div 
      className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" 
      onClick={onClick}
    >
      <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
        <OptimizedImage 
          src={chat.name === "Espaço excluído" ? "/placeholder.svg" : (chat.avatar || "")}
          alt={chat.name} 
          className="w-full h-full"
          fallbackSrc="https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=200&auto=format&fit=crop"
        />
      </div>
      <div className="flex-1 flex items-center justify-between">
        <div className="flex flex-col truncate max-w-[200px]">
          {otherUserName && (
            <h3 className="font-bold text-sm truncate" title={otherUserName}>
              {otherUserName}
            </h3>
          )}
          <h4 className={`font-normal text-sm truncate ${chat.name === "Espaço excluído" ? "text-muted-foreground italic" : "text-muted-foreground"}`} title={chat.name}>
            {chat.name}
          </h4>
          <p className={`text-sm truncate ${chat.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            {chat.lastMessage}
          </p>
        </div>
        <div className="flex flex-col items-end ml-4">
          <span className="text-xs text-muted-foreground mb-1">{chat.time}</span>
          {chat.unread && (
            <div className="h-2 w-2 bg-iparty rounded-full"></div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatHeader = ({ 
  chatInfo, 
  spaceImages, 
  chatCreatedAt,
  vendorCategory 
}: { 
  chatInfo: ChatProps | null;
  spaceImages: Record<string, string>;
  chatCreatedAt: string | null;
  vendorCategory?: string;
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
      {/* Space Info */}
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 rounded-lg overflow-hidden">
          <OptimizedImage 
            src={chatInfo.name === "Espaço excluído" ? "/placeholder.svg" : (chatInfo.space_id ? spaceImages[chatInfo.space_id] || chatInfo.avatar : chatInfo.avatar)}
            alt={chatInfo.name} 
            className="w-full h-full object-cover"
            fallbackSrc="https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=200&auto=format&fit=crop"
          />
        </div>
        <div>
          <h3 className={`font-medium text-base ${chatInfo.name === "Espaço excluído" ? "text-muted-foreground italic" : ""}`}>
            {chatInfo.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {chatInfo.name === "Espaço excluído" ? "Este espaço foi removido" : 
             chatInfo.space_id ? "Espaço para eventos" : 
             vendorCategory || "Fornecedor de serviços"}
          </p>
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

const EmptyState = ({ searchQuery = "", chatFilter = 'spaces', onBack }: { searchQuery?: string; chatFilter?: 'spaces' | 'vendors'; onBack?: () => void }) => (
  <div className="p-8 text-center">
    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
    <p className="mt-2 text-muted-foreground">
      {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa iniciada'}
    </p>
    <p className="text-sm text-muted-foreground/70">
      {searchQuery ? 'Tente outro termo de busca' : `Visite um ${chatFilter === 'spaces' ? 'espaço' : 'fornecedor'} e clique no botão de mensagem para começar`}
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
  const vendorIdFromState = location.state?.vendorId;
  const vendorOwnerFromState = location.state?.vendorOwnerId;
  
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
  const [chatUserNames, setChatUserNames] = useState<Record<string, string>>({});
  const [chatFilter, setChatFilter] = useState<'spaces' | 'vendors'>('spaces');
  const [vendorCategory, setVendorCategory] = useState<string | null>(null);

  // Function to get user display name
  const getUserDisplayName = (): string => {
    console.log("getUserDisplayName called, otherUserProfile:", otherUserProfile);
    if (!otherUserProfile) return 'Usuário';
    const { first_name, last_name } = otherUserProfile;
    if (first_name && last_name) return `${first_name} ${last_name}`;
    if (first_name) return first_name;
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
      
      // Get public URLs for all spaces with photos
      if (spacesData) {
        spacesData.forEach((space) => {
          if (space.space_photos && space.space_photos.length > 0) {
            try {
              const photoPath = space.space_photos[0].storage_path;
              
              // Se já é uma URL completa, usar diretamente
              if (photoPath.startsWith('http')) {
                localImageMap[space.id] = photoPath;
              } else {
                // Criar URL pública a partir do storage path
                const { data: publicUrlData } = supabase.storage
                  .from('spaces')
                  .getPublicUrl(photoPath);
                
                if (publicUrlData?.publicUrl) {
                  localImageMap[space.id] = publicUrlData.publicUrl;
                }
              }
            } catch (err) {
              console.error("Error getting public URL for space:", space.id, err);
            }
          }
        });
      }
      
      setSpaceImages(localImageMap);
    }
    
    // Collect other user IDs to fetch their profiles
    const otherUserIds = chatsData.map(chat => 
      chat.user_id === currentUserId ? chat.owner_id : chat.user_id
    );
    
    // Fetch profiles for all other users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", otherUserIds);
    
    // Create a map of user IDs to display names
    const userNamesMap: Record<string, string> = {};
    if (profilesData) {
      profilesData.forEach(profile => {
        const displayName = profile.first_name && profile.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name || 'Usuário';
        userNamesMap[profile.id] = displayName;
      });
    }
    
    setChatUserNames(userNamesMap);
    
    const formattedChats = chatsData.map(chat => ({
      id: chat.id,
      name: chat.space_name || chat.vendor_name || "Conversa",
      lastMessage: chat.last_message || "Iniciar conversa...",
      time: formatTime(chat.last_message_time),
      space_id: chat.space_id,
      avatar: chat.space_id && localImageMap[chat.space_id] ? localImageMap[chat.space_id] : chat.space_image || chat.vendor_image || "",
      unread: chat.has_unread && chat.last_message_sender_id !== currentUserId,
      deleted: chat.deleted || false,
      user_id: chat.user_id,
      owner_id: chat.owner_id
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

  // Function to create a new chat for the same space or vendor
  const createOrFindChat = useCallback(async (spaceId: string | null, spaceOwnerId: string | null, vendorId?: string, vendorOwnerId?: string) => {
    if (!userId) {
      console.error("Missing userId for creating chat");
      return null;
    }

    // Validate that we have either space or vendor info
    if ((!spaceId || !spaceOwnerId) && (!vendorId || !vendorOwnerId)) {
      console.error("Missing required parameters for creating chat");
      return null;
    }

    try {
      setCreatingNewChat(true);
      
      // For space chats, use existing logic
      if (spaceId && spaceOwnerId) {
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
          console.error("Error creating/finding space chat:", error);
          toast.error("Erro ao criar nova conversa");
          return null;
        }
        
        if (chatData && chatData.length > 0) {
          return chatData[0].id;
        }
      }
      
      // For vendor chats, create directly in the database
      if (vendorId && vendorOwnerId) {
        console.log("Creating or finding chat for vendor:", vendorId);
        
        // Check if chat already exists
        const { data: existingChat, error: searchError } = await supabase
          .from('chats')
          .select('*')
          .eq('vendor_id', vendorId)
          .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
          .or(`user_id.eq.${vendorOwnerId},owner_id.eq.${vendorOwnerId}`)
          .eq('deleted', false)
          .maybeSingle();

        if (searchError) {
          console.error("Error searching for existing vendor chat:", searchError);
        }

        if (existingChat) {
          return existingChat.id;
        }

        // Get vendor details for chat creation
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('name, images')
          .eq('id', vendorId)
          .single();

        if (vendorError) {
          console.error("Error fetching vendor data:", vendorError);
          toast.error("Erro ao buscar dados do fornecedor");
          return null;
        }

        // Create new vendor chat
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert({
            user_id: userId,
            owner_id: vendorOwnerId,
            vendor_id: vendorId,
            vendor_name: vendorData.name,
            vendor_image: vendorData.images?.[0] || null,
            last_message_time: new Date().toISOString(),
            has_unread: false
          })
          .select('*')
          .single();

        if (createError) {
          console.error("Error creating vendor chat:", createError);
          toast.error("Erro ao criar conversa com fornecedor");
          return null;
        }

        return newChat.id;
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
    console.log("=== Loading chat details for:", chatId, "===");
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
          console.log("Attempting to create new chat for deleted space chat");
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
        
        // If we have vendor details, try to create a new chat
        if (vendorIdFromState && vendorOwnerFromState) {
          console.log("Attempting to create new chat for deleted vendor chat");
          const newChatId = await createOrFindChat(null, null, vendorIdFromState, vendorOwnerFromState);
          
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
      console.log("=== Chat data loaded ===", chatData);
      
      // Set chat created date
      setChatCreatedAt(chatData.created_at);
      
      // Get other user ID (the user we're chatting with)
      const otherUserId = chatData.user_id === userId ? chatData.owner_id : chatData.user_id;
      
      console.log("Other user ID:", otherUserId);
      console.log("Current user ID:", userId);
      
      // Query the profiles table for the other user
      const { data: profilesData, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .eq("id", otherUserId);

      console.log("profilesData:", profilesData);
      console.log("Profile query error:", profileError);

      if (profilesData && profilesData.length > 0) {
        const profileData = profilesData[0];
        console.log("Setting otherUserProfile to:", profileData);
        setOtherUserProfile(profileData);
      } else {
        console.log("No profile found in array, setting to null. Profile may not exist in profiles table.");
        setOtherUserProfile(null);
        
        // Try to get user email from auth.users as fallback using edge function
        try {
          const { data: userData, error: userError } = await supabase.functions
            .invoke('get_user_by_email', {
              body: { user_id: otherUserId }
            });
          
          console.log("User data from edge function:", userData, "Error:", userError);
          
          if (userData && userData.email) {
            setOtherUserProfile({
              id: otherUserId,
              first_name: userData.email.split('@')[0],
              last_name: null,
              avatar_url: null
            });
          }
        } catch (error) {
          console.error("Error getting user by email:", error);
        }
      }
      
      // If this is a vendor chat, fetch vendor category
      if (chatData.vendor_id) {
        console.log("Fetching vendor category for vendor_id:", chatData.vendor_id);
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('category')
          .eq('id', chatData.vendor_id)
          .single();
          
        if (vendorData && !vendorError) {
          console.log("Setting vendor category:", vendorData.category);
          setVendorCategory(vendorData.category);
        } else {
          console.error("Error fetching vendor category:", vendorError);
          setVendorCategory(null);
        }
      } else {
        setVendorCategory(null);
      }
      
      // Find chat info in the existing list or create a new entry
      const existingChat = chats.find(c => c.id === chatId);
      
      if (existingChat) {
        setChatInfo(existingChat);
        console.log("Using existing chat info:", existingChat);
      } else {
        const newChatInfo = {
          id: chatData.id,
          name: chatData.space_name || chatData.vendor_name || "Conversa",
          lastMessage: chatData.last_message || "Iniciar conversa...",
          time: formatTime(chatData.last_message_time),
          space_id: chatData.space_id,
          avatar: chatData.space_image || chatData.vendor_image || "",
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
  is_mine: msg.sender_id === userId,
  is_ai_response: msg.is_ai_response === true,
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
  }, [chats, userId, checkChatExists, createOrFindChat, navigate, spaceIdFromState, spaceOwnerFromState, vendorIdFromState, vendorOwnerFromState]);

  // Function to send a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !userId) return;
    
    try {
      setSendingMessage(true);
      let currentChatId = selectedChat;
      
      // Check if this is a new chat that needs to be created
      if (selectedChat === 'new-chat-placeholder') {
        if (spaceIdFromState && spaceOwnerFromState) {
          // Create the chat for space
          const newChatId = await createOrFindChat(spaceIdFromState, spaceOwnerFromState);
          
          if (!newChatId) {
            toast.error("Erro ao criar conversa");
            setSendingMessage(false);
            return;
          }
          
          // Update the selected chat
          setSelectedChat(newChatId);
          currentChatId = newChatId;
          
          // Update URL to reflect the new chat
          navigate(`/messages?chat=${newChatId}`, { replace: true });
        } else if (vendorIdFromState && vendorOwnerFromState) {
          // Create the chat for vendor
          const newChatId = await createOrFindChat(null, null, vendorIdFromState, vendorOwnerFromState);
          
          if (!newChatId) {
            toast.error("Erro ao criar conversa");
            setSendingMessage(false);
            return;
          }
          
          // Update the selected chat
          setSelectedChat(newChatId);
          currentChatId = newChatId;
          
          // Update URL to reflect the new chat
          navigate(`/messages?chat=${newChatId}`, { replace: true });
        } else {
          toast.error("Erro: informações não encontradas");
          setSendingMessage(false);
          return;
        }
      }
      
      if (!currentChatId) {
        toast.error("Erro: chat não identificado");
        setSendingMessage(false);
        return;
      }
      
      // Check if chat exists and is not deleted before sending
      const chatStatus = await checkChatExists(currentChatId);
      
      if (!chatStatus.exists || chatStatus.isDeleted) {
        toast.error(chatStatus.isDeleted ? "Esta conversa foi excluída" : "Chat não encontrado");
        setChatLoadError(true);
        setChatDeleted(chatStatus.isDeleted);
        setChatErrorMessage(chatStatus.isDeleted ? "Esta conversa foi excluída" : "Chat não encontrado");
        setSendingMessage(false);
        return;
      }
      
      // Filter offensive content before sending
      const filteredMessage = filterOffensiveContent(newMessage);
      
      // Insert new message with filtered content
const { data: insertedMessage, error: messageError } = await supabase
  .from("messages")
  .insert({
    chat_id: currentChatId,
    sender_id: userId,
    content: filteredMessage
  })
  .select("*")
  .single();
        
      if (messageError) throw messageError;
      
      // Update chat with last message (also filtered)
      const { error: chatError } = await supabase
        .from("chats")
        .update({
          last_message: filteredMessage,
          last_message_time: new Date().toISOString(),
          last_message_sender_id: userId,
          has_unread: true
        })
        .eq("id", currentChatId);
        
if (chatError) throw chatError;
      
      // Trigger AI auto-reply (non-blocking)
      try {
        if (insertedMessage?.id) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error("Session error:", sessionError);
            return;
          }
          
          if (session?.access_token) {
            console.log("Triggering AI response for message:", insertedMessage.id);
            const aiResponse = await supabase.functions.invoke('ai-chat-response', {
              body: {
                chat_id: currentChatId,
                message_id: insertedMessage.id,
              },
              headers: {
                // Fallback IDs in headers in case body is stripped by any intermediary
                'x-chat-id': String(currentChatId || ''),
                'x-message-id': String(insertedMessage.id || ''),
              }
            });
            
            if (aiResponse.error) {
              console.error("AI response error:", aiResponse.error);
            } else {
              console.log("AI response success:", aiResponse.data);
            }
          } else {
            console.warn("No access token available for AI request");
          }
        }
      } catch (err) {
        console.error("AI reply invocation failed:", err);
      }
      
      // Clear message input
      setNewMessage("");
      
      // Refresh chats to show the new chat if it was just created
      if (selectedChat === 'new-chat-placeholder') {
        await fetchChats(false);
        await loadChatDetails(currentChatId);
      }
      
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
    const locationState = location.state as any;
    
    // Check if we have space info to create a new chat (when coming from space details)
    if (locationState?.spaceId && locationState?.spaceOwnerId && !chatIdFromParams && !chatIdFromState) {
      console.log("Setting up for new space chat creation:", locationState);
      setSelectedChat('new-chat-placeholder');
      setChatInfo({
        id: 'new-chat-placeholder',
        name: locationState.spaceName || "Conversa",
        lastMessage: "Digite sua primeira mensagem...",
        time: "",
        avatar: locationState.spaceImage || "",
        space_id: locationState.spaceId
      });
      return;
    }
    
    // Check if we have vendor info to create a new chat (when coming from vendor details)
    if (locationState?.vendorId && locationState?.vendorOwnerId && !chatIdFromParams && !chatIdFromState) {
      console.log("Setting up for new vendor chat creation:", locationState);
      setSelectedChat('new-chat-placeholder');
      setChatInfo({
        id: 'new-chat-placeholder',
        name: locationState.vendorName || "Conversa",
        lastMessage: "Digite sua primeira mensagem...",
        time: "",
        avatar: locationState.vendorImage || ""
      });
      return;
    }
    
    // Only run after initial data is loaded for existing chats
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
  is_mine: newMsg.sender_id === userId,
  is_ai_response: newMsg.is_ai_response === true,
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
    setVendorCategory(null);
    // Re-fetch non-deleted chats
    fetchChats(false);
  }, [fetchChats]);
  
  // Filter chats by search query, exclude deleted chats, and filter by type
  const filteredChats = chats.filter(chat => {
    if (chat.deleted) return false;
    
    // Filter by type (spaces vs vendors)
    const isSpaceChat = !!chat.space_id;
    if (chatFilter === 'spaces' && !isSpaceChat) return false;
    if (chatFilter === 'vendors' && isSpaceChat) return false;
    
    const searchLower = searchQuery.toLowerCase();
    const chatNameMatch = chat.name.toLowerCase().includes(searchLower);
    
    // Find the other user ID for this chat by looking up the original chat data
    const chatIndex = chats.findIndex(c => c.id === chat.id);
    const userNames = Object.values(chatUserNames);
    const otherUserName = userNames[chatIndex] || '';
    const userNameMatch = otherUserName.toLowerCase().includes(searchLower);
    
    return chatNameMatch || userNameMatch;
  });
  
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
          <div className="relative mb-4 mt-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Buscar mensagens..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex bg-muted/30 rounded-lg p-1 border">
              <Button 
                variant={chatFilter === 'spaces' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChatFilter('spaces')}
                className={chatFilter === 'spaces' ? 
                  'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' : 
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              >
                Espaços
              </Button>
              <Button 
                variant={chatFilter === 'vendors' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChatFilter('vendors')}
                className={chatFilter === 'vendors' ? 
                  'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' : 
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              >
                Fornecedores
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <LoadingState />
            ) : filteredChats.length > 0 ? (
              filteredChats.map(chat => {
                // Find the original chat data to get the correct user IDs
                const originalChatData = chats.find(c => c.id === chat.id);
                if (!originalChatData) return null;
                
                // Determine which user is the "other" user (not the current user)
                const otherUserId = originalChatData.user_id === userId 
                  ? originalChatData.owner_id 
                  : originalChatData.user_id;
                
                const otherUserName = otherUserId ? chatUserNames[otherUserId] : null;

                return (
                  <ChatItem 
                    key={chat.id} 
                    chat={chat}
                    otherUserName={otherUserName}
                    onClick={() => {
                      setSelectedChat(chat.id);
                      loadChatDetails(chat.id);
                    }}
                  />
                );
              }).filter(Boolean)
            ) : (
              <EmptyState searchQuery={searchQuery} chatFilter={chatFilter} />
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
            chatInfo={chatInfo}
            spaceImages={spaceImages}
            chatCreatedAt={chatCreatedAt}
            vendorCategory={vendorCategory}
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
                        {filterOffensiveContent(message.content)}
                      </div>
<div 
  className={cn(
    "text-xs mt-1 text-muted-foreground",
    message.is_mine ? "text-right" : ""
  )}
>
  {formatTime(message.timestamp)}{message.is_ai_response && !message.is_mine ? (
    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">IA</span>
  ) : null}
</div>
                    </div>
                  </div>
                ))}
                <div ref={messageEndRef} />
              </>
            ) : selectedChat === 'new-chat-placeholder' ? (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-2 text-muted-foreground">Nenhuma conversa iniciada</p>
                <p className="text-sm text-muted-foreground/70">
                  Digite sua primeira mensagem para iniciar a conversa
                </p>
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
          
          {/* Message input - only show if chat is not deleted and exists (or is placeholder) */}
          {!chatDeleted && !chatLoadError && (selectedChat === 'new-chat-placeholder' || selectedChat) && (
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
