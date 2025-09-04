import { useState } from 'react';
import { 
  Gem, 
  Package, 
  ShoppingCart, 
  History, 
  BarChart3, 
  TrendingUp,
  DollarSign,
  Menu,
  X
} from 'lucide-react';
import CadastrarJoias from './components/CadastrarJoias';
import GerenciarEstoque from './components/GerenciarEstoque';
import RegistrarVendas from './components/RegistrarVendas';
import HistoricoVendas from './components/HistoricoVendas';
import Relatorios from './components/Relatorios';
import FluxoCaixa from './components/FluxoCaixa';
import GestaoInvestimentos from './components/GestaoInvestimentos';
import { Joia } from './types';

type Tab = 'cadastrar' | 'estoque' | 'vendas' | 'historico' | 'relatorios' | 'investimentos' | 'fluxo';

const tabs = [
  { id: 'cadastrar' as Tab, label: 'Cadastrar Joias', icon: Gem },
  { id: 'estoque' as Tab, label: 'Gerenciar Estoque', icon: Package },
  { id: 'vendas' as Tab, label: 'Registrar Vendas', icon: ShoppingCart },
  { id: 'historico' as Tab, label: 'Histórico', icon: History },
  { id: 'relatorios' as Tab, label: 'Relatórios', icon: BarChart3 },
  { id: 'investimentos' as Tab, label: 'Investimentos', icon: TrendingUp },
  { id: 'fluxo' as Tab, label: 'Fluxo de Caixa', icon: DollarSign },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('cadastrar');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [joiaParaEditar, setJoiaParaEditar] = useState<Joia | null>(null);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cadastrar':
        return <CadastrarJoias joiaEdicao={joiaParaEditar} onFinishEdicao={() => setJoiaParaEditar(null)} />;
      case 'estoque':
        return (
          <GerenciarEstoque
            onEditarJoia={(joia) => {
              setJoiaParaEditar(joia);
              setActiveTab('cadastrar');
            }}
          />
        );
      case 'vendas':
        return <RegistrarVendas />;
      case 'historico':
        return <HistoricoVendas />;
      case 'relatorios':
        return <Relatorios />;
      case 'investimentos':
        return <GestaoInvestimentos />;
      case 'fluxo':
        return <FluxoCaixa />;
      default:
        return <CadastrarJoias />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7EAA2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-center h-24">
            <div className="flex items-center">
              <img src="/sol-icon.png.png" alt="Sol" className="h-12 w-12 mr-4" />
              <h1 className="text-3xl sm:text-4xl font-extrabold gradient-text text-center">
                SOLARIE Acessórios
              </h1>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden absolute right-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block lg:w-64 space-y-2`}>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Navegação
              </h2>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-solarie-gradient text-gray-900 shadow-md'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-xl shadow-sm min-h-[600px]">
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
