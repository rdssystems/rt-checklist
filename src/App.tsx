import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Clientes from "./pages/Clientes";
import MapaClientes from "./pages/MapaClientes";
import Settings from "./pages/Settings";
import ChecklistDesigner from "./pages/ChecklistDesigner";
import AplicarChecklist from "./pages/AplicarChecklist";
import ChecklistsProntos from "./pages/ChecklistsProntos";
import Visitas from "./pages/Visitas";
import Upgrade from "./pages/Upgrade";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/mapa-clientes" element={<MapaClientes />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/checklist-designer" element={<ChecklistDesigner />} />
            <Route path="/aplicar-checklist" element={<AplicarChecklist />} />
            <Route path="/checklists-prontos" element={<ChecklistsProntos />} />
            <Route path="/visitas" element={<Visitas />} />
            <Route path="/upgrade" element={<Upgrade />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
