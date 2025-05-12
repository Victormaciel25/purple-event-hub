
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
import Explore from "./pages/Explore";
import Vendors from "./pages/Vendors";
import Map from "./pages/Map";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import EventSpaceDetails from "./pages/EventSpaceDetails";
import RegisterSpace from "./pages/RegisterSpace";
import SpaceApproval from "./pages/SpaceApproval";
import AdminManagement from "./pages/AdminManagement";
import UserSpaces from "./pages/UserSpaces";
import EditSpace from "./pages/EditSpace";
import PromoteSpace from "./pages/PromoteSpace";

// Create a QueryClient instance outside of the component
const queryClient = new QueryClient();

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    return session ? children : <Navigate to="/" replace />;
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Login Route */}
            <Route 
              path="/" 
              element={session ? <Navigate to="/explore" replace /> : <Login />} 
            />
            
            {/* App Routes with Layout */}
            <Route element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }>
              <Route path="/explore" element={<Explore />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/map" element={<Map />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/spaces/:id" element={<EventSpaceDetails />} />
              <Route path="/event-space/:id" element={<EventSpaceDetails />} />
              <Route path="/register-space" element={<RegisterSpace />} />
              <Route path="/space-approval" element={<SpaceApproval />} />
              <Route path="/admin-management" element={<AdminManagement />} />
              <Route path="/user-spaces" element={<UserSpaces />} />
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
