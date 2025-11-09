import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

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

// Fix for default marker icon
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MapaClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [center, setCenter] = useState<[number, number]>([-15.7939, -47.8828]); // Brasília default

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

      if (data && data.length > 0) {
        setClientes(data || []);
        // Set center to first client location
        const firstClient = data[0];
        if (firstClient.latitude && firstClient.longitude) {
          setCenter([Number(firstClient.latitude), Number(firstClient.longitude)]);
        }
      } else {
        setClientes([]);
      }
    };

    fetchClientes();
  }, []);

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
            center={center}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {clientes.map((cliente) => {
              if (cliente.latitude && cliente.longitude) {
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
                    position={[Number(cliente.latitude), Number(cliente.longitude)]}
                    icon={defaultIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold mb-1">
                          {cliente.nome_fantasia || cliente.razao_social}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Razão Social:</strong> {cliente.razao_social}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Endereço:</strong> {enderecoCompleto}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
              return null;
            })}
          </MapContainer>
        </div>
      </div>
    </Layout>
  );
};

export default MapaClientes;
