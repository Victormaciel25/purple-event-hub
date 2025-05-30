
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminHeaderProps {
  title: string;
  backPath?: string;
}

const AdminHeader = ({ title, backPath = "/profile" }: AdminHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
        <ChevronLeft size={20} />
      </Button>
      <h1 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">{title}</h1>
      <div></div> {/* Empty div for spacing */}
    </div>
  );
};

export default AdminHeader;
