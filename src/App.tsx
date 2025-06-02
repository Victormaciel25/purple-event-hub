
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Explore from "./pages/Explore";
import RegisterSpace from "./pages/RegisterSpace";
import EditSpace from "./pages/EditSpace";
import EventSpaceDetails from "./pages/EventSpaceDetails";
import RegisterVendor from "./pages/RegisterVendor";
import Vendors from "./pages/Vendors";
import VendorDetails from "./pages/VendorDetails";
import UserSpaces from "./pages/UserSpaces";
import UserVendors from "./pages/UserVendors";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import SpaceApproval from "./pages/SpaceApproval";
import VendorApproval from "./pages/VendorApproval";
import AdminManagement from "./pages/AdminManagement";
import PromoteSpace from "./pages/PromoteSpace";
import Map from "./pages/Map";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    const updateVH = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    
    updateVH();
    window.addEventListener('resize', updateVH);
    
    return () => window.removeEventListener('resize', updateVH);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/register-space" element={<RegisterSpace />} />
            <Route path="/edit-space/:id" element={<EditSpace />} />
            <Route path="/space/:id" element={<EventSpaceDetails />} />
            <Route path="/register-vendor" element={<RegisterVendor />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/vendor/:id" element={<VendorDetails />} />
            <Route path="/my-spaces" element={<UserSpaces />} />
            <Route path="/my-vendors" element={<UserVendors />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/space-approval" element={<SpaceApproval />} />
            <Route path="/vendor-approval" element={<VendorApproval />} />
            <Route path="/admin-management" element={<AdminManagement />} />
            <Route path="/promote-space/:id" element={<PromoteSpace />} />
            <Route path="/map" element={<Map />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
