
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Explore from "./pages/Explore";
import Vendors from "./pages/Vendors";
import VendorDetails from "./pages/VendorDetails";
import Map from "./pages/Map";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import HelpSupport from "./pages/HelpSupport";
import NotFound from "./pages/NotFound";
import EventSpaceDetails from "./pages/EventSpaceDetails";
import RegisterSpace from "./pages/RegisterSpace";
import RegisterVendor from "./pages/RegisterVendor";
import SpaceApproval from "./pages/SpaceApproval";
import VendorApproval from "./pages/VendorApproval";
import AdminManagement from "./pages/AdminManagement";
import UserSpaces from "./pages/UserSpaces";
import UserVendors from "./pages/UserVendors";
import EditSpace from "./pages/EditSpace";
import EditVendor from "./pages/EditVendor";
import PromoteSpace from "./pages/PromoteSpace";
import SubscriptionsManagement from "./pages/SubscriptionsManagement";
import Index from "./pages/Index";
import { useSpaceDeletionNotifications } from "./hooks/useSpaceDeletionNotifications";
import { useVendorDeletionNotifications } from "./hooks/useVendorDeletionNotifications";

// Create a QueryClient instance outside of the component
const queryClient = new QueryClient();

// Add a global CSS variable for the iparty color
import './index.css';
// Ensure we have the iparty color variable in :root in index.css

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Use space and vendor deletion notifications
  useSpaceDeletionNotifications();
  useVendorDeletionNotifications();

  useEffect(() => {
    // Set up auth state listener first
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log("Auth state changed:", _event);
        setSession(newSession);
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    return session ? children : <Navigate to="/login" replace />;
  };

  const AuthenticatedLayout = () => {
    return <Layout />;
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Configure toasters with position="top-right" to hide them */}
        <Toaster />
        <Sonner position="top-right" closeButton={false} className="opacity-0 invisible" />
        <BrowserRouter>
          <Routes>
            {/* Root route redirects to the index component */}
            <Route path="/" element={<Index />} />
            
            {/* Login Route */}
            <Route 
              path="/login" 
              element={session ? <Navigate to="/explore" replace /> : <Login />} 
            />
            
            {/* Forgot Password Route */}
            <Route 
              path="/forgot-password" 
              element={session ? <Navigate to="/explore" replace /> : <ForgotPassword />} 
            />
            
            {/* Reset Password Route - SEMPRE acessível, mesmo com sessão ativa */}
            <Route 
              path="/reset-password" 
              element={<ResetPassword />} 
            />
            
            {/* Privacy Policy Route - accessible without authentication */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            
            {/* Help Support Route - accessible without authentication */}
            <Route path="/help-support" element={<HelpSupport />} />
            
            {/* App Routes with Layout */}
            <Route element={
              <RequireAuth>
                <AuthenticatedLayout />
              </RequireAuth>
            }>
              <Route path="/explore" element={<Explore />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/vendor/:id" element={<VendorDetails />} />
              <Route path="/register-vendor" element={<RegisterVendor />} />
              <Route path="/edit-vendor/:id" element={<EditVendor />} />
              <Route path="/map" element={<Map />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/spaces/:id" element={<EventSpaceDetails />} />
              <Route path="/event-space/:id" element={<EventSpaceDetails />} />
              <Route path="/register-space" element={<RegisterSpace />} />
              <Route path="/space-approval" element={<SpaceApproval />} />
              <Route path="/vendor-approval" element={<VendorApproval />} />
              <Route path="/admin-management" element={<AdminManagement />} />
              <Route path="/subscriptions-management" element={<SubscriptionsManagement />} />
              <Route path="/user-spaces" element={<UserSpaces />} />
              <Route path="/user-vendors" element={<UserVendors />} />
              <Route path="/edit-space/:id" element={<EditSpace />} />
              <Route path="/promote-space" element={<PromoteSpace />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
