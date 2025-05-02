
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MessageProps {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unread?: boolean;
}

const conversations: MessageProps[] = [
  {
    id: "1",
    name: "Espaço Vila Garden",
    lastMessage: "Temos disponibilidade para o dia 15/06",
    time: "10:30",
    avatar: "https://source.unsplash.com/random/100x100?building",
    unread: true,
  },
  {
    id: "2",
    name: "Buffet Delícias",
    lastMessage: "Enviamos o orçamento por e-mail",
    time: "09:15",
    avatar: "https://source.unsplash.com/random/100x100?food",
  },
  {
    id: "3",
    name: "DJ Master Sound",
    lastMessage: "Pode me enviar a playlist do evento?",
    time: "Ontem",
    avatar: "https://source.unsplash.com/random/100x100?dj",
  },
  {
    id: "4",
    name: "Salão Golden Hall",
    lastMessage: "Aguardamos sua confirmação",
    time: "10/04",
    avatar: "https://source.unsplash.com/random/100x100?hall",
  },
];

const MessageItem: React.FC<MessageProps> = ({
  id,
  name,
  lastMessage,
  time,
  avatar,
  unread,
}) => {
  return (
    <div className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
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

const Messages = () => {
  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar mensagens..." 
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {conversations.map((conversation) => (
          <MessageItem key={conversation.id} {...conversation} />
        ))}
      </div>
    </div>
  );
};

export default Messages;
