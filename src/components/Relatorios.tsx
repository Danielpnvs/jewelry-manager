import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Filter, 
  Download, 
  Calendar,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Joia, Venda, FiltroRelatorio, RelatorioMensal } from '../types';
import { formatarMoeda, calcularEstatisticasEstoque } from '../utils/calculations';

const Relatorios: React.FC = () => {
  const { data: joias, loading: loadingJoias } = useFirestore<Joia>('joias');
  const { data: vendas, loading: loadingVendas } = useFirestore<Venda>('vendas');
  const [filtros, setFiltros] = useState<FiltroRelatorio>({
    dataInicio: '',
    dataFim: '',
    categoria: '',
    fornecedor: ''
  });

  const loading = loadingJoias || loadingVendas;

  // Filtrar dados baseado nos filtros
  const dadosFiltrados = useMemo(() => {
    const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
    const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : null;

    const joiasFiltradas = joias.filter(joia => {
      const dataCompra = new Date(joia.dataCompra);
      return (
        (filtros.categoria === '' || joia.categoria === filtros.categoria) &&
        (filtros.fornecedor === '' || joia.fornecedor === filtros.fornecedor) &&
        (!dataInicio || dataCompra >= dataInicio) &&
        (!dataFim || dataCompra <= dataFim)
      );
    });

    const vendasFiltradas = vendas.filter(venda => {
      const dataVenda = new Date(venda.dataVenda);
      return (
        (!dataInicio || dataVenda >= dataInicio) &&
        (!dataFim || dataVenda <= dataFim)
      );
    });

    return { joiasFiltradas, vendasFiltradas };
  }, [joias, vendas, filtros]);

  // Calcular estatísticas gerais
  const estatisticasGerais = useMemo(() => {
    const { joiasFiltradas, vendasFiltradas } = dadosFiltrados;
    const estatisticasEstoque = calcularEstatisticasEstoque(joiasFiltradas);
    
    const totalVendas = vendasFiltradas.reduce((total, venda) => total + venda.valorTotal, 0);
    const lucroRealVendas = vendasFiltradas.reduce((total, venda) => total + venda.lucroReal, 0);
    const quantidadeVendas = vendasFiltradas.length;

    return {
      ...estatisticasEstoque,
      totalVendasPeriodo: totalVendas,
      lucroRealPeriodo: lucroRealVendas,
      quantidadeVendasPeriodo: quantidadeVendas
    };
  }, [dadosFiltrados]);

  // Gerar relatório mensal
  const relatorioMensal = useMemo(() => {
    const { vendasFiltradas } = dadosFiltrados;
    const relatorioMap = new Map<string, RelatorioMensal>();

    vendasFiltradas.forEach(venda => {
      const data = new Date(venda.dataVenda);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      const mes = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      if (!relatorioMap.has(chave)) {
        relatorioMap.set(chave, {
          mes,
          ano: data.getFullYear(),
          joiasVendidas: 0,
          totalVendas: 0,
          lucroTotal: 0
        });
      }

      const itensArray = Array.isArray(venda.itens) ? venda.itens : [];
      const relatorio = relatorioMap.get(chave)!;
      relatorio.joiasVendidas += itensArray.reduce((total, item) => total + item.quantidade, 0);
      relatorio.totalVendas += venda.valorTotal;
      relatorio.lucroTotal += venda.lucroReal;
    });

    return Array.from(relatorioMap.values()).sort((a, b) => b.ano - a.ano);
  }, [dadosFiltrados]);

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: '',
      dataFim: '',
      categoria: '',
      fornecedor: ''
    });
  };

  const exportarRelatorio = () => {
    console.log('Exportar relatório:', {
      estatisticasGerais,
      relatorioMensal
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solarie-600"></div>
        <span className="ml-2 text-gray-600">Carregando relatórios...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="h-6 w-6 mr-2 text-solarie-600" />
          Relatórios
        </h2>
        <p className="text-gray-600 mt-2">
          Análise completa do seu negócio com métricas detalhadas
        </p>
      </div>

      {/* Filtros */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros do Relatório
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={limparFiltros}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpar Filtros
            </button>
            <button
              onClick={exportarRelatorio}
              className="btn-secondary text-sm flex items-center"
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <div className="relative">
              <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="date"
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={handleFiltroChange}
                className="input-field pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <div className="relative">
              <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="date"
                name="dataFim"
                value={filtros.dataFim}
                onChange={handleFiltroChange}
                className="input-field pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              name="categoria"
              value={filtros.categoria}
              onChange={handleFiltroChange}
              className="input-field"
            >
              <option value="">Todas as categorias</option>
              <option value="Anéis">Anéis</option>
              <option value="Brincos">Brincos</option>
              <option value="Colares">Colares</option>
              <option value="Pulseiras">Pulseiras</option>
              <option value="Pingentes">Pingentes</option>
              <option value="Conjuntos">Conjuntos</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fornecedor
            </label>
            <input
              type="text"
              name="fornecedor"
              value={filtros.fornecedor}
              onChange={handleFiltroChange}
              className="input-field"
              placeholder="Filtrar por fornecedor..."
            />
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Joias</p>
              <p className="text-2xl font-bold text-blue-600">{estatisticasGerais.totalJoias}</p>
              <p className="text-xs text-gray-500">
                {estatisticasGerais.joiasDisponiveis} disponíveis
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Valor Investido</p>
              <p className="text-2xl font-bold text-green-600">{formatarMoeda(estatisticasGerais.valorInvestido)}</p>
              <p className="text-xs text-gray-500">Custo total do estoque</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-solarie-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Valor do Estoque</p>
              <p className="text-2xl font-bold text-solarie-700">{formatarMoeda(estatisticasGerais.valorEstoque)}</p>
              <p className="text-xs text-gray-500">Valor de venda disponível</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Vendas no Período</p>
              <p className="text-2xl font-bold text-purple-600">{formatarMoeda(estatisticasGerais.totalVendasPeriodo)}</p>
              <p className="text-xs text-gray-500">{estatisticasGerais.quantidadeVendasPeriodo} vendas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Relatório Mensal */}
      {relatorioMensal.length > 0 && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Relatório Mensal Detalhado
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mês
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joias Vendidas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total de Vendas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lucro Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {relatorioMensal.map((relatorio, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {relatorio.mes}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{relatorio.joiasVendidas}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatarMoeda(relatorio.totalVendas)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {formatarMoeda(relatorio.lucroTotal)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Removidos cards de Categoria/Fornecedor */}
    </div>
  );
};

export default Relatorios;
