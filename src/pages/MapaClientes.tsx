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

const MapaClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
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

    fetchClientes();
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
