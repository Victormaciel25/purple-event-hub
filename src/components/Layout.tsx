
import React, { useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Calendar, Home, MapPin, MessageSquare, User } from "lucide-react";

const Layout = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  useEffect(() => {
    // Register service worker for caching
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }).catch(error => {
          console.error('ServiceWorker registration failed: ', error);
        });
      });
    }
    
    // Cleanup Mercado Pago elements whenever location changes
    const cleanupMercadoPagoElements = () => {
      // Remove any hidden inputs that Mercado Pago might have added
      const hiddenInputs = document.querySelectorAll('[id^="MPHidden"]');
      hiddenInputs.forEach((element) => {
        element.remove();
      });
      
      // Remove any iframes that Mercado Pago might have created
      const mpIframes = document.querySelectorAll('iframe[src*="mercadopago"]');
      mpIframes.forEach((iframe) => {
        iframe.remove();
      });
      
      // Remove any overlay elements that might have been created
      const overlays = document.querySelectorAll('.mercadopago-overlay');
      overlays.forEach((element) => {
        element.remove();
      });
    };
    
    // Initial cleanup
    cleanupMercadoPagoElements();
    
    // Cleanup on location change
    return () => {
      cleanupMercadoPagoElements();
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content - Modified to remove bottom padding */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-10">
        <NavLink
          to="/explore"
          className={`bottom-nav-item ${isActive("/explore") ? "active" : ""}`}
        >
          <Home size={24} />
          <span>Explorar</span>
        </NavLink>
        <NavLink
          to="/vendors"
          className={`bottom-nav-item ${isActive("/vendors") ? "active" : ""}`}
        >
          <Calendar size={24} />
          <span>Fornecedores</span>
        </NavLink>
        <NavLink
          to="/map"
          className={`bottom-nav-item ${isActive("/map") ? "active" : ""}`}
        >
          <MapPin size={24} />
          <span>Mapa</span>
        </NavLink>
        <NavLink
          to="/messages"
          className={`bottom-nav-item ${
            isActive("/messages") ? "active" : ""
          }`}
        >
          <MessageSquare size={24} />
          <span>Mensagens</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={`bottom-nav-item ${isActive("/profile") ? "active" : ""}`}
        >
          <User size={24} />
          <span>Perfil</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Layout;
