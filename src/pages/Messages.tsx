import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Define the Chat type
type Chat = {
  id: string;
  created_at: string;
  user_id: string;
  owner_id: string;
  space_id: string;
  space_name: string;
  space_image: string | null;
  last_message: string;
  last_message_time: string;
  deleted: boolean;
};

const Messages = () => {
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const chatId = queryParams.get('chat');
    const shouldOpen = queryParams.get('open') === 'true';
    
    if (chatId && shouldOpen && chats) {
      // Selecionar o chat específico
      const targetChat = chats.find(chat => chat.id === chatId);
      if (targetChat) {
        // Assumindo que você tem uma função como esta para selecionar um chat
        selectChat(targetChat);
        
        // Limpar os parâmetros da URL após processar
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [chats]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get_user_chats');

      if (error) {
        console.error("Error fetching chats:", error);
        toast.error("Erro ao carregar as conversas");
      }

      setChats(data);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Erro inesperado ao carregar as conversas");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Erro ao carregar as mensagens");
      }

      setMessages(data || []);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Erro inesperado ao carregar as mensagens");
    }
  };

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const sendMessage = async () => {
    if (!selectedChat) {
      toast.error("Selecione um conversa para enviar a mensagem");
      return;
    }

    if (!newMessage.trim()) {
      toast.error("A mensagem não pode estar vazia");
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Auth error:", userError);
        throw userError;
      }

      if (!userData.user) {
        console.error("No user data");
        toast.error("Você precisa estar logado para enviar mensagens");
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: userData.user.id,
          content: newMessage,
        })
        .select('*')
        .single();

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Erro ao enviar a mensagem");
        return;
      }

      setMessages([...messages, data]);
      setNewMessage("");

      // Update last message in chats table
      await supabase
        .from('chats')
        .update({
          last_message: newMessage,
          last_message_time: new Date().toISOString()
        })
        .eq('id', selectedChat.id);

      // Refresh chats to update the last message
      fetchChats();

    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Erro inesperado ao enviar a mensagem");
    }
  };

  const confirmDeleteChat = (chatId: string) => {
    setDeleteChatId(chatId);
    setDeleteDialogOpen(true);
  };

  const deleteChat = async () => {
    if (!deleteChatId) {
      toast.error("ID do chat não especificado");
      return;
    }

    setIsDeleting(true);
    try {
      // Mark the chat as deleted instead of physically removing it
      const { error } = await supabase
        .from('chats')
        .update({ deleted: true })
        .eq('id', deleteChatId);

      if (error) {
        console.error("Error deleting chat:", error);
        toast.error("Erro ao deletar a conversa");
      } else {
        toast.success("Conversa deletada com sucesso");
        setDeleteDialogOpen(false);
        setSelectedChat(null);
        fetchChats(); // Refresh chats after deletion
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Erro inesperado ao deletar a conversa");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-iparty" />
        <p className="mt-4 text-muted-foreground">Carregando mensagens...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-8 p-4">
      <h1 className="text-2xl font-bold mb-4">Mensagens</h1>

      <div className="flex">
        {/* Chat List */}
        <div className="w-1/4 border-r pr-4">
          <h2 className="text-lg font-semibold mb-2">Conversas</h2>
          {chats && chats.length > 0 ? (
            <ul className="space-y-2">
              {chats.map((chat) => (
                <li
                  key={chat.id}
                  className={`p-2 rounded cursor-pointer ${selectedChat?.id === chat.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  onClick={() => selectChat(chat)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{chat.space_name}</div>
                      <div className="text-sm text-gray-500">{chat.last_message}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteChat(chat.id);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma conversa encontrada.</p>
          )}
        </div>

        {/* Message Area */}
        <div className="w-3/4 pl-4">
          {selectedChat ? (
            <div>
              <h2 className="text-lg font-semibold mb-2">{selectedChat.space_name}</h2>
              <div className="space-y-2">
                {messages.map((message) => {
                  // Get current user ID to determine message alignment
                  const getCurrentUserId = async () => {
                    const { data } = await supabase.auth.getUser();
                    return data.user?.id;
                  };
                  
                  // Use isCurrentUser state for message alignment
                  const [isCurrentUser, setIsCurrentUser] = useState(false);
                  
                  useEffect(() => {
                    const checkUser = async () => {
                      const userId = await getCurrentUserId();
                      setIsCurrentUser(message.sender_id === userId);
                    };
                    checkUser();
                  }, [message.sender_id]);
                  
                  return (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-100 ml-auto text-right'
                          : 'bg-gray-100 mr-auto'
                      }`}
                    >
                      <p>{message.content}</p>
                      <span className="text-xs text-gray-500">{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <textarea
                  className="w-full p-2 border rounded"
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button onClick={sendMessage} className="mt-2">Enviar</Button>
              </div>
            </div>
          ) : (
            <p>Selecione uma conversa para ver as mensagens.</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteChat()}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;
