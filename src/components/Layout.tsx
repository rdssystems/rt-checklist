import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Home,
  Users,
  ClipboardList,
  FileCheck,
  LogOut,
  ClipboardCheck,
  Sparkles,
  Map,
  Settings as SettingsIcon,
  CheckSquare,
  Search,
  Bell,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState("RT-Expert");
  const [logoUrl, setLogoUrl] = useState("");
  const [userName, setUserName] = useState("Usuário");
  const [avatarUrl, setAvatarUrl] = useState("");

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
      .select("company_name, logo_url, nome_rt, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    const profileData = data as any;

    if (profileData) {
      setCompanyName(profileData.company_name || "RT-Expert");
      setLogoUrl(profileData.logo_url || "");
      setUserName(profileData.nome_rt || "Usuário");
      setAvatarUrl(profileData.avatar_url || "");
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
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: ClipboardList, label: "Criar Checklist", path: "/checklist-designer" },
    { icon: FileCheck, label: "Fazer Inspeção", path: "/aplicar-checklist" },
    { icon: Map, label: "Mapa de Clientes", path: "/mapa-clientes" },
    { icon: CheckSquare, label: "Checklists Prontos", path: "/checklists-prontos" },
  ];

  const SideNav = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;

        if (item.path === "/checklist-designer" && isMobile) {
          return (
            <div
              key={item.path}
              onClick={() => {
                setMobileMenuOpen(false);
                toast.info("Para melhor experiência visual, crie e edite seus checklists através de um Computador ou Tela Grande.", { icon: "🖥️" });
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Acesse via Computador"
            >
              <item.icon className="w-5 h-5 opacity-50" />
              <span>{item.label}</span>
            </div>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white" />
          ) : (
            <div className="relative flex items-center justify-center w-10 h-10 group shrink-0">
              <div className="absolute inset-0 bg-primary opacity-20 blur-md rounded-full group-hover:opacity-30 transition-opacity duration-500"></div>
              <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-lg shadow-md shadow-primary/30 border border-white/20">
                <ClipboardCheck className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 border-[1.5px] border-white dark:border-slate-900 rounded-full flex items-center justify-center shadow-sm z-10">
                <Sparkles className="w-[5px] h-[5px] text-teal-950 fill-teal-950" />
              </div>
            </div>
          )}
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
            {companyName === "RT-Expert" ? (
              <span className="flex items-center gap-0.5">
                RT<span className="text-primary font-light">Expert</span>
              </span>
            ) : (
              companyName
            )}
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <SideNav isMobile={false} />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors cursor-pointer",
              location.pathname === "/settings"
                ? "bg-primary/10 text-primary"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <SettingsIcon className="w-5 h-5" />
            <span>Configurações</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg font-medium transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">

        {/* Header Desktop */}
        <header className="hidden md:flex h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 items-center justify-between px-8 z-10 shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Pesquisar por vistorias, clientes ou relatórios..."
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative cursor-pointer outline-none">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2"></div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 group outline-none cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">
                    {userName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Responsável Técnico</p>
                </div>
                <Avatar className="size-9 ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-primary transition-all">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mr-4 mt-2" align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Perfil / Empresa</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Header */}
        <div className="md:hidden flex h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm bg-white" />
            ) : (
              <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                <div className="relative flex items-center justify-center w-7 h-7 bg-gradient-to-br from-primary to-blue-700 rounded-md shadow-sm border border-white/20">
                  <ClipboardCheck className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-400 border-[1.5px] border-white dark:border-slate-900 rounded-full flex items-center justify-center shadow-sm z-10">
                  <Sparkles className="w-1 h-1 text-teal-950 fill-teal-950" />
                </div>
              </div>
            )}
            <h1 className="font-extrabold text-lg truncate max-w-[150px]">
              {companyName === "RT-Expert" ? (
                <span className="flex items-center gap-0.5">
                  RT<span className="text-primary font-light">Expert</span>
                </span>
              ) : (
                companyName
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg outline-none">
              <Bell className="w-5 h-5" />
            </button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg outline-none">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-6 py-8 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="font-extrabold text-xl truncate">
                    {companyName === "RT-Expert" ? (
                      <span className="flex items-center gap-0.5">
                        RT<span className="text-primary font-light">Expert</span>
                      </span>
                    ) : (
                      companyName
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 truncate">{userName}</p>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                  <SideNav isMobile={true} />
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
                      location.pathname === "/settings"
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <SettingsIcon className="w-5 h-5" />
                    <span>Configurações</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-left"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sair</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
