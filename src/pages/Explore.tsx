
import React from "react";
import EventSpaceCard from "@/components/EventSpaceCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const eventSpaces = [
  {
    id: "1",
    name: "Espaço Vila Garden",
    address: "Rua das Flores, 123 - São Paulo",
    price: 3500,
    image: "https://source.unsplash.com/photo-1473177104440-ffee2f376098",
  },
  {
    id: "2",
    name: "Salão Golden Hall",
    address: "Av. Paulista, 1000 - São Paulo",
    price: 5000,
    image: "https://source.unsplash.com/photo-1487958449943-2429e8be8625",
  },
  {
    id: "3",
    name: "Alameda Jardins",
    address: "Alameda Santos, 500 - São Paulo",
    price: 4200,
    image: "https://source.unsplash.com/photo-1496307653780-42ee777d4833",
  },
  {
    id: "4",
    name: "Casa de Festas Luminária",
    address: "Rua Augusta, 789 - São Paulo",
    price: 3800,
    image: "https://source.unsplash.com/photo-1721322800607-8c38375eef04",
  },
];

const Explore = () => {
  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Explorar Espaços</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar espaços de eventos..." 
          className="pl-10"
        />
      </div>

      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-medium">Categorias</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button className="bg-iparty text-white rounded-full px-4 py-1.5 text-sm whitespace-nowrap">
            Todos
          </button>
          <button className="bg-secondary text-foreground rounded-full px-4 py-1.5 text-sm whitespace-nowrap">
            Casamentos
          </button>
          <button className="bg-secondary text-foreground rounded-full px-4 py-1.5 text-sm whitespace-nowrap">
            Corporativo
          </button>
          <button className="bg-secondary text-foreground rounded-full px-4 py-1.5 text-sm whitespace-nowrap">
            Aniversários
          </button>
          <button className="bg-secondary text-foreground rounded-full px-4 py-1.5 text-sm whitespace-nowrap">
            Formaturas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {eventSpaces.map((space) => (
          <EventSpaceCard key={space.id} {...space} />
        ))}
      </div>
    </div>
  );
};

export default Explore;
