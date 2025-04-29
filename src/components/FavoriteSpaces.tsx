
import React from "react";
import { useEventSpaceFavorites } from "../hooks/useEventSpaceFavorites";
import EventSpaceCard from "./EventSpaceCard";

// This is the same data from EventSpaceDetails.tsx
// In a real app, this would come from a central store or API
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

const FavoriteSpaces: React.FC = () => {
  const { favorites } = useEventSpaceFavorites();
  const favoriteSpaces = eventSpaces.filter(space => favorites.includes(space.id));

  if (favoriteSpaces.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Você ainda não tem espaços favoritos.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {favoriteSpaces.map(space => (
        <EventSpaceCard key={space.id} {...space} />
      ))}
    </div>
  );
};

export default FavoriteSpaces;
