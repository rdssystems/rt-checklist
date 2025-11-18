import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, 
  Home, 
  Users, 
  ClipboardList, 
  FileCheck, 
  LogOut,
  Shield,
  Map,
  Settings as SettingsIcon,
  CheckSquare
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState("Vigilância");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        loadSettings(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session && event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        loadSettings(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadSettings = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("company_name, logo_url")
      .eq("id", userId)
      .maybeSingle();
    
    if (data) {
      setCompanyName(data.company_name || "Vigilância");
      setLogoUrl(data.logo_url || "");
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      toast.success("Logout realizado com sucesso!");
    }
  };

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: FileCheck, label: "Fazer Inspeção", path: "/aplicar-checklist" },
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: Map, label: "Mapa de Clientes", path: "/mapa-clientes" },
    { icon: ClipboardList, label: "Criar Checklist", path: "/checklist-designer" },
    { icon: CheckSquare, label: "Checklists Prontos", path: "/checklists-prontos" },
    { icon: SettingsIcon, label: "Configurações", path: "/settings" },
  ];

  const NavContent = () => (
    <>
      {navItems.map((item) => {
        const isActive = window.location.pathname === item.path;
        return (
          <Button
            key={item.path}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-12 rounded-xl font-medium transition-all duration-200",
              isActive 
                ? "bg-primary text-primary-foreground shadow-md hover:bg-primary-hover" 
                : "hover:bg-accent/50"
            )}
            onClick={() => {
              navigate(item.path);
              setMobileMenuOpen(false);
            }}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Button>
        );
      })}
      <div className="flex-1" />
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 h-12 rounded-xl font-medium text-destructive hover:bg-destructive-light hover:text-destructive transition-all duration-200"
        onClick={handleSignOut}
      >
        <LogOut className="w-5 h-5" />
        Sair
      </Button>
    </>
  );

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col p-4">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
          ) : (
            <div className="bg-gradient-primary p-2 rounded-lg">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg">{companyName}</h1>
          </div>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <NavContent />
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
            ) : (
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="font-bold">{companyName} Sanitária</h1>
            </div>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <nav className="flex flex-col gap-2 mt-8">
                <NavContent />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;
