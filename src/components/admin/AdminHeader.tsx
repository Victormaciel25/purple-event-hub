
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminHeaderProps {
  title: string;
  backPath?: string;
}

const AdminHeader = ({ title, backPath = "/profile" }: AdminHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center mb-6">
      <Button variant="ghost" onClick={() => navigate(backPath)} className="mr-2 p-0 h-auto">
        <ArrowLeft size={24} />
      </Button>
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
};

export default AdminHeader;
