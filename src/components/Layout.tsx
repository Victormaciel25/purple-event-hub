
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

const Layout = () => {
  const location = useLocation();
  
  // Routes where we don't want to show the bottom navigation
  const noNavRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  const shouldShowNav = !noNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1">
        <Outlet />
      </main>
      {shouldShowNav && <Navigation />}
      <Toaster />
      <SonnerToaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            color: 'black'
          }
        }}
      />
    </div>
  );
};

export default Layout;
