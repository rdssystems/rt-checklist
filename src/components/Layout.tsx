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
  Shield
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session && event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: ClipboardList, label: "Criar Checklist", path: "/checklist-designer" },
    { icon: FileCheck, label: "Aplicar Checklist", path: "/aplicar-checklist" },
  ];

  const NavContent = () => (
    <>
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 hover:bg-accent",
            window.location.pathname === item.path && "bg-primary/10 text-primary"
          )}
          onClick={() => {
            navigate(item.path);
            setMobileMenuOpen(false);
          }}
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </Button>
      ))}
      <div className="flex-1" />
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
          <div className="bg-gradient-primary p-2 rounded-lg">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Vigilância</h1>
            <p className="text-xs text-muted-foreground">Sanitária RT</p>
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
            <div className="bg-gradient-primary p-2 rounded-lg">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold">Vigilância Sanitária</h1>
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
