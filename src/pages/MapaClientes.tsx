import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

const MapaClientes = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);

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

  const handleTokenSubmit = () => {
    if (!mapboxToken.trim()) {
      toast.error("Por favor, insira seu token do Mapbox");
      return;
    }
    setTokenSaved(true);
    toast.success("Token salvo! Carregando mapa...");
  };

  useEffect(() => {
    if (!mapContainer.current || !tokenSaved || !mapboxToken || clientes.length === 0) return;

    mapboxgl.accessToken = mapboxToken;

    const bounds = new mapboxgl.LngLatBounds();
    clientes.forEach((cliente) => {
      if (cliente.longitude && cliente.latitude) {
        bounds.extend([cliente.longitude, cliente.latitude]);
      }
    });

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      bounds: bounds,
      fitBoundsOptions: { padding: 50 },
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    clientes.forEach((cliente) => {
      if (cliente.longitude && cliente.latitude) {
        const enderecoCompleto = [
          cliente.rua,
          cliente.bairro,
          cliente.cidade,
          cliente.estado,
          cliente.cep,
        ]
          .filter(Boolean)
          .join(", ");

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${cliente.nome_fantasia || cliente.razao_social}</h3>
            <p style="font-size: 0.875rem; color: #666; margin-bottom: 2px;"><strong>Razão Social:</strong> ${cliente.razao_social}</p>
            <p style="font-size: 0.875rem; color: #666;"><strong>Endereço:</strong> ${enderecoCompleto}</p>
          </div>
        `);

        new mapboxgl.Marker({ color: "#1e40af" })
          .setLngLat([cliente.longitude, cliente.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [clientes, tokenSaved, mapboxToken]);

  if (!tokenSaved) {
    return (
      <Layout>
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Configurar Mapa</h1>
            <p className="text-muted-foreground">Configure seu token do Mapbox para visualizar clientes</p>
          </div>
          <Card className="max-w-2xl shadow-md">
            <CardContent className="pt-6 space-y-4">
              <p className="text-muted-foreground">
                Para usar o mapa de clientes, você precisa inserir seu token público do Mapbox.
                Você pode obtê-lo em{" "}
                <a
                  href="https://mapbox.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
              <div>
                <Label htmlFor="mapbox-token">Token Público do Mapbox</Label>
                <Input
                  id="mapbox-token"
                  type="text"
                  placeholder="pk.ey..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleTokenSubmit}
                className="w-full bg-gradient-accent"
              >
                Salvar e Carregar Mapa
              </Button>
            </CardContent>
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
          <div ref={mapContainer} className="h-full w-full" />
        </div>
      </div>
    </Layout>
  );
};

export default MapaClientes;
