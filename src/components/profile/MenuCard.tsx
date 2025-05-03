
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  iconClassName?: string;
}

interface MenuCardProps {
  items: MenuItem[];
}

const MenuCard: React.FC<MenuCardProps> = ({ items }) => {
  if (items.length === 0) return null;
  
  return (
    <Card className="mb-6">
      <CardContent className="p-0">
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            <div 
              className="p-4 flex items-center cursor-pointer hover:bg-gray-50"
              onClick={item.onClick}
            >
              <item.icon size={20} className={`mr-3 ${item.iconClassName || "text-iparty"}`} />
              <span className={item.iconClassName?.includes("text-red-600") ? "font-medium" : ""}>{item.label}</span>
            </div>
            {index < items.length - 1 && <Separator />}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
};

export default MenuCard;
