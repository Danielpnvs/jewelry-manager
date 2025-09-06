import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Eye,
  Settings,
  X,
  Package
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Joia, LoteInvestimento, Venda } from '../types';
import { formatarMoeda } from '../utils/calculations';

const GestaoInvestimentos: React.FC = () => {
  const { data: joias, loading: loadingJoias } = useFirestore<Joia>('joias');
  const { data: vendas, loading: loadingVendas } = useFirestore<Venda>('vendas');
  const { data: lotes, loading: loadingLotes, update: updateLote } = useFirestore<LoteInvestimento>('lotes');
  
  const [modalAberto, setModalAberto] = useState<'detalhes' | 'edicao' | 'confirmacao' | null>(null);
  const [loteSelecionado, setLoteSelecionado] = useState<LoteInvestimento | null>(null);
  const [divisaoLucro, setDivisaoLucro] = useState({
    reinvestimento: 50,
    reservaEmergencia: 30,
    lucroLiquido: 20
  });

  const loading = loadingJoias || loadingLotes || loadingVendas;

  // Agrupar joias por fornecedor + dataCompra (lote por data)
  const lotesPorFornecedor = useMemo(() => {
    const grupos = new Map<string, Joia[]>();
    joias.forEach(joia => {
      const data = joia.dataCompra ? new Date(joia.dataCompra) : undefined;
      const chaveData = data ? new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString().split('T')[0] : 'sem-data';
      const chave = `${joia.fornecedor}__${chaveData}`;
      if (!grupos.has(chave)) {
        grupos.set(chave, []);
      }
      grupos.get(chave)!.push(joia);
    });

    // Mapear vendas por fornecedor+dataCompra
    const vendasPorGrupo = new Map<string, { valorVendido: number; lucroObtido: number; quantidadeVendida: number; valorEmbalagem: number }>();
    vendas.forEach(venda => {
      const itens = Array.isArray(venda.itens) ? venda.itens : [];
      itens.forEach(item => {
        const data = item.joia.dataCompra ? new Date(item.joia.dataCompra) : undefined;
        const chaveData = data ? new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString().split('T')[0] : 'sem-data';
        const chave = `${item.joia.fornecedor}__${chaveData}`;
        const atual = vendasPorGrupo.get(chave) || { valorVendido: 0, lucroObtido: 0, quantidadeVendida: 0, valorEmbalagem: 0 };
        atual.valorVendido += item.subtotal;
        atual.lucroObtido += (item.precoUnitario - item.joia.custoAquisicao) * item.quantidade;
        atual.quantidadeVendida += item.quantidade;
        atual.valorEmbalagem += (item.joia.custoEmbalagem || 0) * item.quantidade;
        vendasPorGrupo.set(chave, atual);
      });
    });

    return Array.from(grupos.entries()).map(([chave, joiasLote]) => {
      const [fornecedor, dataStr] = chave.split('__');
      const valorInvestido = joiasLote.reduce((total, joia) => 
        total + (joia.custoAquisicao * joia.quantidade), 0
      );
      const vendasFornecedor = vendasPorGrupo.get(chave) || { valorVendido: 0, lucroObtido: 0, quantidadeVendida: 0, valorEmbalagem: 0 };
      const valorVendido = vendasFornecedor.valorVendido;
      const lucroObtido = vendasFornecedor.lucroObtido;
      const totalJoias = joiasLote.reduce((total, joia) => total + joia.quantidade, 0);
      const joiasVendidas = vendasFornecedor.quantidadeVendida;
      const percentualVendido = totalJoias > 0 ? (joiasVendidas / totalJoias) * 100 : 0;
      const valorEmbalagemVendida = vendasFornecedor.valorEmbalagem;

      // Buscar configuração de divisão de lucro existente ou usar padrão
      const loteExistente = lotes.find(lote => (lote as any).fornecedor === fornecedor && ((lote as any).dataLote === dataStr));
      const divisaoLucroConfig = loteExistente?.divisaoLucro || {
        reinvestimento: 50,
        reservaEmergencia: 30,
        lucroLiquido: 20
      };

      return {
        id: loteExistente?.id || `temp-${fornecedor}-${dataStr}`,
        fornecedor,
        joias: joiasLote,
        valorInvestido,
        valorVendido,
        lucroObtido,
        percentualVendido,
        joiasVendidas,
        valorEmbalagemVendida,
        divisaoLucro: divisaoLucroConfig,
        createdAt: loteExistente?.createdAt || new Date(),
        updatedAt: loteExistente?.updatedAt || new Date(),
        dataLote: dataStr
      } as LoteInvestimento;
    });
  }, [joias, lotes, vendas]);

  const abrirDetalhes = (lote: LoteInvestimento) => {
    setLoteSelecionado(lote);
    setModalAberto('detalhes');
  };

  const abrirEdicao = (lote: LoteInvestimento) => {
    setLoteSelecionado(lote);
    setDivisaoLucro(lote.divisaoLucro);
    setModalAberto('edicao');
  };

  const salvarDivisaoLucro = async () => {
    if (!loteSelecionado) return;

    try {
      const novasDivisoes = {
        reinvestimento: divisaoLucro.reinvestimento,
        reservaEmergencia: divisaoLucro.reservaEmergencia,
        lucroLiquido: divisaoLucro.lucroLiquido
      };

      // Verificar se soma 100%
      const total = novasDivisoes.reinvestimento + novasDivisoes.reservaEmergencia + novasDivisoes.lucroLiquido;
      if (total !== 100) {
        alert('A soma das porcentagens deve ser igual a 100%');
        return;
      }

      await updateLote(loteSelecionado.id, {
        divisaoLucro: novasDivisoes
      });

      setModalAberto(null);
      setLoteSelecionado(null);
    } catch (error) {
      console.error('Erro ao salvar divisão de lucro:', error);
    }
  };

  const ajustarPorcentagem = (campo: keyof typeof divisaoLucro, valor: number) => {
    const novasDivisoes = { ...divisaoLucro, [campo]: valor };
    
    // Ajustar automaticamente as outras porcentagens
    const total = Object.values(novasDivisoes).reduce((sum, val) => sum + val, 0);
    if (total > 100) {
      // Se passou de 100%, reduzir proporcionalmente as outras
      const outrosCampos = Object.keys(divisaoLucro).filter(k => k !== campo) as Array<keyof typeof divisaoLucro>;
      const excesso = total - 100;
      const valorOutros = outrosCampos.reduce((sum, k) => sum + novasDivisoes[k], 0);
      
      if (valorOutros > 0) {
        outrosCampos.forEach(k => {
          const proporcao = novasDivisoes[k] / valorOutros;
          novasDivisoes[k] = Math.max(0, novasDivisoes[k] - (excesso * proporcao));
        });
      }
    }

    setDivisaoLucro(novasDivisoes);
  };

  const calcularDistribuicaoLucro = (lucro: number, divisao: LoteInvestimento['divisaoLucro']) => {
    return {
      reinvestimento: (lucro * divisao.reinvestimento) / 100,
      reservaEmergencia: (lucro * divisao.reservaEmergencia) / 100,
      lucroLiquido: (lucro * divisao.lucroLiquido) / 100
    };
  };

  const getCorProgresso = (percentual: number) => {
    if (percentual < 25) return 'bg-red-500';
    if (percentual < 50) return 'bg-yellow-500';
    if (percentual < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solarie-600"></div>
        <span className="ml-2 text-gray-600">Carregando investimentos...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <TrendingUp className="h-6 w-6 mr-2 text-solarie-600" />
          Gestão de Investimentos
        </h2>
        <p className="text-gray-600 mt-2">
          Acompanhe o desempenho dos seus investimentos por fornecedor
        </p>
      </div>

      {lotesPorFornecedor.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum investimento encontrado</h3>
          <p className="text-gray-500">Cadastre algumas joias para começar a acompanhar seus investimentos por fornecedor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lotesPorFornecedor.map((lote) => {
            const baseDistribuicao = Math.max(0, lote.valorVendido - (lote as any).valorEmbalagemVendida || 0);
            const distribuicao = calcularDistribuicaoLucro(baseDistribuicao, lote.divisaoLucro);
            const dataLoteFmt = (lote as any).dataLote ? new Date((((lote as any).dataLote as string) + 'T12:00:00')).toLocaleDateString('pt-BR') : '';
            
            return (
              <div key={lote.id} className="card hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {lote.fornecedor}{dataLoteFmt ? ` • ${dataLoteFmt}` : ''}
                  </h3>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => abrirDetalhes(lote)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => abrirEdicao(lote)}
                      className="p-1 text-yellow-600 hover:text-yellow-800"
                      title="Editar divisão de lucro"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progresso de vendas */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progresso de Vendas</span>
                    <span>{lote.percentualVendido.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getCorProgresso(lote.percentualVendido)}`}
                      style={{ width: `${Math.min(lote.percentualVendido, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Métricas principais */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Valor Investido:</span>
                    <span className="font-medium text-gray-900">{formatarMoeda(lote.valorInvestido)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Valor Vendido:</span>
                    <span className="font-medium text-green-600">{formatarMoeda(lote.valorVendido)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Lucro Obtido:</span>
                    <span className="font-semibold text-solarie-600">{formatarMoeda(lote.lucroObtido)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total de Joias:</span>
                    <span className="font-medium">{lote.joias.reduce((total, joia) => total + joia.quantidade, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Joias Vendidas:</span>
                    <span className="font-medium text-red-600">{(lote as any).joiasVendidas || 0}</span>
                  </div>
                </div>

                {/* Distribuição do lucro (se houver lucro) */}
                {lote.lucroObtido > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Distribuição do Lucro</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reinvestimento ({lote.divisaoLucro.reinvestimento}%):</span>
                        <span className="font-medium">{formatarMoeda(distribuicao.reinvestimento)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reserva ({lote.divisaoLucro.reservaEmergencia}%):</span>
                        <span className="font-medium">{formatarMoeda(distribuicao.reservaEmergencia)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lucro Líquido ({lote.divisaoLucro.lucroLiquido}%):</span>
                        <span className="font-medium text-green-600">{formatarMoeda(distribuicao.lucroLiquido)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes */}
      {modalAberto === 'detalhes' && loteSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Detalhes do Lote - {loteSelecionado.fornecedor}
              </h3>
              <button
                onClick={() => setModalAberto(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Resumo Financeiro</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor Investido:</span>
                    <span className="font-medium">{formatarMoeda(loteSelecionado.valorInvestido)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor Vendido:</span>
                    <span className="font-medium text-green-600">{formatarMoeda(loteSelecionado.valorVendido)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lucro Obtido:</span>
                    <span className="font-semibold text-solarie-600">{formatarMoeda(loteSelecionado.lucroObtido)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ROI:</span>
                    <span className="font-medium">
                      {loteSelecionado.valorInvestido > 0 
                        ? ((loteSelecionado.lucroObtido / loteSelecionado.valorInvestido) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Progresso de Vendas</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total de Joias:</span>
                    <span className="font-medium">{loteSelecionado.joias.reduce((total, joia) => total + joia.quantidade, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Joias Vendidas:</span>
                    <span className="font-medium text-red-600">
                      {loteSelecionado.joias.filter(j => j.status === 'vendida').reduce((total, joia) => total + joia.quantidade, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Joias Disponíveis:</span>
                    <span className="font-medium text-green-600">
                      {loteSelecionado.joias.filter(j => j.status === 'disponivel').reduce((total, joia) => total + joia.quantidade, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Percentual Vendido:</span>
                    <span className="font-medium">{loteSelecionado.percentualVendido.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de joias do lote */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Joias do Lote</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qtd</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loteSelecionado.joias.map((joia) => (
                      <tr key={joia.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{joia.codigo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{joia.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{joia.categoria}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{joia.quantidade}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatarMoeda(joia.custoAquisicao)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatarMoeda(joia.precoVendaFinal)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            joia.status === 'disponivel' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {joia.status === 'disponivel' ? 'Disponível' : 'Vendida'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalAberto(null)}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Divisão de Lucro */}
      {modalAberto === 'edicao' && loteSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                Editar Divisão de Lucro
              </h3>
              <button
                onClick={() => setModalAberto(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reinvestimento (%)
                </label>
                <input
                  type="number"
                  value={divisaoLucro.reinvestimento}
                  onChange={(e) => ajustarPorcentagem('reinvestimento', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reserva de Emergência (%)
                </label>
                <input
                  type="number"
                  value={divisaoLucro.reservaEmergencia}
                  onChange={(e) => ajustarPorcentagem('reservaEmergencia', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lucro Líquido (%)
                </label>
                <input
                  type="number"
                  value={divisaoLucro.lucroLiquido}
                  onChange={(e) => ajustarPorcentagem('lucroLiquido', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  className="input-field"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <span className={`font-medium ${
                    (divisaoLucro.reinvestimento + divisaoLucro.reservaEmergencia + divisaoLucro.lucroLiquido) === 100
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {(divisaoLucro.reinvestimento + divisaoLucro.reservaEmergencia + divisaoLucro.lucroLiquido).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setModalAberto(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={salvarDivisaoLucro}
                className="btn-primary"
                disabled={(divisaoLucro.reinvestimento + divisaoLucro.reservaEmergencia + divisaoLucro.lucroLiquido) !== 100}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoInvestimentos;