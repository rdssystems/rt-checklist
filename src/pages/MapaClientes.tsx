import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import L from "leaflet";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Cliente {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
}

import { getPlanStatus, type PlanStatus } from "@/lib/plan-limits";
import { Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MapaClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    const init = async () => {
      const status = await getPlanStatus();
      setPlanStatus(status);
      setLoadingPlan(false);

      if (status.isPremium) {
        fetchClientes();
      }
    };

    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) {
        toast.error("Erro ao carregar clientes");
        return;
      }

      setClientes(data || []);
    };

    init();
  }, []);

  // Calcular o centro do mapa baseado nos clientes
  const getMapCenter = (): LatLngExpression => {
    if (clientes.length === 0) return [-18.8666, -47.0577]; // Centro do Brasil
    
    const validClientes = clientes.filter(c => c.latitude && c.longitude);
    if (validClientes.length === 0) return [-18.8666, -47.0577];
    
    const avgLat = validClientes.reduce((sum, c) => sum + (c.latitude || 0), 0) / validClientes.length;
    const avgLng = validClientes.reduce((sum, c) => sum + (c.longitude || 0), 0) / validClientes.length;
    
    return [avgLat, avgLng];
  };

  if (loadingPlan) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!planStatus?.isPremium) {
    return (
      <Layout>
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              Mapa de Clientes
            </h1>
            <p className="text-muted-foreground">Visualize a logística das suas inspeções</p>
          </div>
          
          <Card className="relative overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900 h-[600px] flex items-center justify-center">
            {/* Background Map Placeholder (Blurred) */}
            <div className="absolute inset-0 opacity-20 filter blur-sm grayscale pointer-events-none">
               <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover" alt="Map Preview" />
            </div>

            <div className="relative z-10 max-w-lg text-center p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl mx-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Recurso Exclusivo Premium</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Geolocalização e roteirização inteligente estão disponíveis apenas para assinantes do plano <strong>RT Expert</strong>.
              </p>
              
              <div className="space-y-4">
                <Button className="w-full h-12 text-lg font-bold gap-2 shadow-lg shadow-primary/30 group">
                  <Sparkles className="w-5 h-5 fill-yellow-400 text-yellow-400 group-hover:scale-125 transition-transform" />
                  Garantir Acesso Premium
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-xs text-slate-500">
                  Teste grátis por 7 dias em sua primeira assinatura.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  if (clientes.length === 0) {
    return (
      <Layout>
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Mapa de Clientes</h1>
            <p className="text-muted-foreground">Visualize a localização de todos os seus clientes</p>
          </div>
          <Card className="shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum cliente com localização cadastrada ainda.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Mapa de Clientes</h1>
          <p className="text-muted-foreground">Visualize a localização de todos os seus clientes</p>
        </div>
        <div className="h-[600px] w-full rounded-lg overflow-hidden border border-border shadow-md">
          <MapContainer
            center={getMapCenter()}
            zoom={clientes.length > 0 ? 12 : 5}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {clientes.map((cliente) => {
              if (!cliente.latitude || !cliente.longitude) return null;
              
              const enderecoCompleto = [
                cliente.rua,
                cliente.bairro,
                cliente.cidade,
                cliente.estado,
                cliente.cep,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <Marker
                  key={cliente.id}
                  position={[cliente.latitude, cliente.longitude] as LatLngExpression}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold mb-1">
                        {cliente.nome_fantasia || cliente.razao_social}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong>Razão Social:</strong> {cliente.razao_social}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Endereço:</strong> {enderecoCompleto}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </Layout>
  );
};

export default MapaClientes;
