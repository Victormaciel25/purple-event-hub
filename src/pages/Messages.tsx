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
              alt={`${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Usuário'} 
            />
            <AvatarFallback>
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-base">
              {`${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Usuário'}
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

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Ontem';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
};

// Main component
const Messages = () => {
  // ...todas as variáveis, useEffects e funções acima (sem alteração)

  // Get user display name for header (NOVA REGRA: sempre mostra nome + sobrenome se existir)
  const getUserDisplayName = () => {
    if (otherUserProfile) {
      const firstName = otherUserProfile.first_name || '';
      const lastName = otherUserProfile.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName.length > 0) return fullName;
    }
    return 'Usuário';
  };
  
  return (
    <div className="container px-4 pb-16 max-w-4xl mx-auto">
      {creatingNewChat ? (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-iparty mb-4" />
          <p className="text-lg">Criando nova conversa...</p>
        </div>
      ) : !selectedChat ? (
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
        <div className="flex flex-col h-[calc(100vh-64px)]">
          {/* Chat header com nome e sobrenome */}
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
              
              {/* Aqui mostra nome + sobrenome */}
              <h2 className="font-medium">
                {getUserDisplayName()}
              </h2>
            </div>
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
          
          {/* Mensagens */}
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
          
          {/* Campo para digitar mensagem */}
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
