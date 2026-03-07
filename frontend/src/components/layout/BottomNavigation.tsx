import React from "react";
import { Home, List, CreditCard, UserPlus, Search } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCredit: () => void;
}

export default function BottomNavigation({
  activeTab,
  setActiveTab,
  onOpenCredit,
}: BottomNavProps) {
  const getNavClass = (tabName: string) =>
    `flex flex-col items-center p-2 transition ${activeTab === tabName ? "text-blue-600" : "text-gray-500 hover:text-blue-500"}`;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pb-safe pt-2 px-2 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-40">
      <button
        onClick={() => setActiveTab("inicio")}
        className={getNavClass("inicio")}
      >
        <Home className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-medium">Inicio</span>
      </button>

      <button
        onClick={() => setActiveTab("listado")}
        className={getNavClass("listado")}
      >
        <List className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-medium">Listado</span>
      </button>

      {/* Botón Central Destacado (Abre el Modal de tu código original) */}
      <button
        onClick={onOpenCredit}
        className="flex flex-col items-center p-2 text-gray-500 hover:text-blue-600 transition relative -top-3"
      >
        <div className="bg-blue-600 p-3 rounded-full shadow-lg text-white active:scale-95 transition-transform">
          <CreditCard className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-medium mt-1">Crédito</span>
      </button>

      <button
        onClick={() => setActiveTab("cliente")}
        className={getNavClass("cliente")}
      >
        <UserPlus className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-medium">Cliente</span>
      </button>

      <button
        onClick={() => setActiveTab("consultas")}
        className={getNavClass("consultas")}
      >
        <Search className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-medium">Consultas</span>
      </button>
    </nav>
  );
}
