import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import PasswordChangeChecker from "@/components/PasswordChangeChecker";
import CookieConsent from "@/components/CookieConsent";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OAuthCallback from "./pages/OAuthCallback";
import Clankovnice from "./pages/Clankovnice";
import Tipovacky from "./pages/Tipovacky";
import Redakce from "./pages/Redakce";
import Slovnik from "./pages/Slovnik";
import ClanekAlikNarozeniny from "./pages/ClanekAlikNarozeniny";


import Obchudek from "./pages/Obchudek";
import Inventar from "./pages/Inventar";
import Admin from "./pages/Admin";
import Posta from "./pages/Posta";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PravidlaOchranaOU from "./pages/PravidlaOchranaOU";
import AuthExternal from "./pages/AuthExternal";
import AuthEmail from "./pages/AuthEmail";
import Pozvankovnik from "./pages/Pozvankovnik";

const queryClient = new QueryClient();

const App = () => {
  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("Došlo k chybě. Zkuste to prosím znovu.");
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <PasswordChangeChecker>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/oauth" element={<OAuthCallback />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/" element={<Layout><Index /></Layout>} />
              <Route path="/clankovnice" element={<Layout><Clankovnice /></Layout>} />
              <Route path="/tipovacky" element={<Layout><Tipovacky /></Layout>} />
              
              <Route path="/obchudek" element={<Layout><Obchudek /></Layout>} />
              <Route path="/inventar" element={<Layout><Inventar /></Layout>} />
              <Route path="/admin" element={<Layout><Admin /></Layout>} />
              <Route path="/redakce" element={<Layout><Redakce /></Layout>} />
              <Route path="/pravidla-ochrana-ou" element={<Layout><PravidlaOchranaOU /></Layout>} />
              <Route path="/auth/exter" element={<AuthExternal />} />
              <Route path="/auth/email" element={<AuthEmail />} />
              <Route path="/posta" element={<Layout><Posta /></Layout>} />
              <Route path="/u/:username" element={<Layout><Profile /></Layout>} />
              <Route path="*" element={<Layout><NotFound /></Layout>} />
              <Route path="/pozvankovnik" element={<Layout><Pozvankovnik /></Layout>} />
              <Route path="/slovnik" element={<Layout><Slovnik /></Layout>} />
              <Route path="/clanek-alik-narozeniny" element={<Layout><ClanekAlikNarozeniny /></Layout>} />
              
          </Routes>
        </BrowserRouter>
      </PasswordChangeChecker>
    </TooltipProvider>
  </AuthProvider>
</QueryClientProvider>
  );
};

export default App;
