import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import Promote from "./pages/Promote";
import PromoteSpace from "./pages/PromoteSpace";
import PromoteVendor from "./pages/PromoteVendor";
import SubscriptionsManagement from "./pages/SubscriptionsManagement";
import DeleteAccount from "./pages/DeleteAccount";
import Index from "./pages/Index";
import VendorPendingApproval from "./components/VendorPendingApproval";
import SplashScreen from "./components/SplashScreen";
import { NotificationProvider } from "./components/NotificationProvider";
import { Geolocation } from "@capacitor/geolocation"; 

import "./index.css";

const queryClient = new QueryClient();

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);


  useEffect(() => {
    // Splash screen timer
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    const url = new URL(window.location.href);
    const type = url.searchParams.get("type");
    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token");

    const isRecovery = type === "recovery" && accessToken && refreshToken;

    if (isRecovery) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(() => {
        console.log("Sessão de recuperação iniciada.");
        setIsPasswordRecovery(true);
      });
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => {
      clearTimeout(splashTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    return session ? children : <Navigate to="/login" replace />;
  };

  const AuthenticatedLayout = () => {
    return <Layout />;
  };

  // Show splash screen
  if (showSplash) {
    return <SplashScreen />;
  }

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" closeButton={false} className="opacity-0 invisible" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/login"
              element={
                isPasswordRecovery
                  ? <Navigate to="/reset-password" replace />
                  : (session ? <Navigate to="/explore" replace /> : <Login />)
              }
            />
            <Route
              path="/forgot-password"
              element={
                isPasswordRecovery
                  ? <Navigate to="/reset-password" replace />
                  : (session ? <Navigate to="/explore" replace /> : <ForgotPassword />)
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/help-support" element={<HelpSupport />} />

            <Route
              element={
                <RequireAuth>
                  <AuthenticatedLayout />
                </RequireAuth>
              }
            >
              <Route path="/explore" element={<Explore />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/vendor/:id" element={<VendorDetails />} />
              <Route path="/vendor-pending/:id" element={<VendorPendingApproval />} />
              <Route path="/register-vendor" element={<RegisterVendor />} />
              <Route path="/edit-vendor/:id" element={<EditVendor />} />
              <Route path="/map" element={<Map />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/delete-account" element={<DeleteAccount />} />
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
              <Route path="/promote" element={<Promote />} />
              <Route path="/promote-space" element={<PromoteSpace />} />
              <Route path="/promote-vendor" element={<PromoteVendor />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

export default App;
