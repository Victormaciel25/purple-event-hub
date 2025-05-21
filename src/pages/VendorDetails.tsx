
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, Star, ArrowLeft, MapPin, Calendar, Clock } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  contactNumber: string;
  image: string;
  description?: string;
  address?: string;
  workingHours?: string;
  availableDays?: string[];
}

// This would come from a database in a real app
const vendorsData: Vendor[] = [
  {
    id: "1",
    name: "Buffet Delicias",
    category: "Buffet",
    rating: 4.8,
    contactNumber: "(11) 99999-8888",
    image: "https://source.unsplash.com/random/800x600?food",
    description: "Especialistas em buffet para casamentos, festas corporativas e eventos sociais. Oferecemos um menu variado com opções nacionais e internacionais.",
    address: "Av. Paulista, 1000 - São Paulo, SP",
    workingHours: "09:00 - 18:00",
    availableDays: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  },
  {
    id: "2",
    name: "DJ Master Sound",
    category: "DJ",
    rating: 4.7,
    contactNumber: "(11) 98888-7777",
    image: "https://source.unsplash.com/random/800x600?dj",
    description: "DJ profissional com mais de 10 anos de experiência. Especializado em casamentos e festas corporativas com equipamentos de última geração.",
    address: "Rua Augusta, 500 - São Paulo, SP",
    workingHours: "14:00 - 23:00",
    availableDays: ["Quinta", "Sexta", "Sábado", "Domingo"]
  },
  {
    id: "3",
    name: "Flor & Arte Decorações",
    category: "Decoração",
    rating: 5.0,
    contactNumber: "(11) 97777-6666",
    image: "https://source.unsplash.com/random/800x600?flowers",
    description: "Decoração personalizada para eventos. Utilizamos flores frescas e materiais de alta qualidade para criar ambientes únicos e memoráveis.",
    address: "Rua Oscar Freire, 200 - São Paulo, SP",
    workingHours: "10:00 - 19:00",
    availableDays: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  },
  {
    id: "4",
    name: "Click Fotografias",
    category: "Fotografia",
    rating: 4.9,
    contactNumber: "(11) 96666-5555",
    image: "https://source.unsplash.com/random/800x600?camera",
    description: "Equipe de fotógrafos profissionais especializados em capturar momentos especiais de forma natural e artística em seu evento.",
    address: "Alameda Santos, 800 - São Paulo, SP",
    workingHours: "09:00 - 20:00",
    availableDays: ["Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
  },
];

const VendorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    // In a real application, this would be an API call to get vendor details
    const foundVendor = vendorsData.find(v => v.id === id);
    if (foundVendor) {
      setVendor(foundVendor);
    }
  }, [id]);

  if (!vendor) {
    return (
      <div className="container px-4 py-6 max-w-4xl mx-auto flex items-center justify-center h-[80vh]">
        <p>Fornecedor não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-4 pl-0 flex items-center text-gray-600"
      >
        <ArrowLeft size={20} className="mr-1" />
        <span>Voltar</span>
      </Button>

      <div className="w-full h-64 rounded-xl overflow-hidden mb-6">
        <OptimizedImage
          src={vendor.image}
          alt={vendor.name}
          className="w-full h-full"
          loadingClassName="animate-pulse bg-gray-200"
        />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{vendor.name}</h1>
          <div className="flex items-center text-yellow-500">
            <span className="text-lg font-medium mr-1">{vendor.rating}</span>
            <Star size={20} fill="currentColor" />
          </div>
        </div>
        
        <Badge variant="outline" className="mb-4 bg-secondary">
          {vendor.category}
        </Badge>
        
        <p className="text-gray-700 mb-6">{vendor.description}</p>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <Phone size={20} className="text-iparty mr-3 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Contato</h3>
              <p className="text-gray-700">{vendor.contactNumber}</p>
            </div>
          </div>
          
          {vendor.address && (
            <div className="flex items-start">
              <MapPin size={20} className="text-iparty mr-3 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Endereço</h3>
                <p className="text-gray-700">{vendor.address}</p>
              </div>
            </div>
          )}
          
          {vendor.workingHours && (
            <div className="flex items-start">
              <Clock size={20} className="text-iparty mr-3 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Horário de Atendimento</h3>
                <p className="text-gray-700">{vendor.workingHours}</p>
              </div>
            </div>
          )}
          
          {vendor.availableDays && vendor.availableDays.length > 0 && (
            <div className="flex items-start">
              <Calendar size={20} className="text-iparty mr-3 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Dias Disponíveis</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {vendor.availableDays.map((day) => (
                    <Badge key={day} variant="secondary" className="text-xs">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Button className="w-full mb-4 bg-iparty text-white hover:bg-iparty/90">
        Entrar em Contato
      </Button>

      <div className="h-20"></div> {/* Space for bottom nav */}
    </div>
  );
};

export default VendorDetails;
