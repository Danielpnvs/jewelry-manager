import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Eye, 
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  User,
  X
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Venda, FiltroVendas, Joia, ItemVenda } from '../types';
import { formatarMoeda, formatarData } from '../utils/calculations';

const HistoricoVendas: React.FC = () => {
  const { data: vendas, loading, update: updateVenda, remove: removeVenda } = useFirestore<Venda>('vendas');
  const { data: joias, update: updateJoia } = useFirestore<Joia>('joias');
  const [filtros, setFiltros] = useState<FiltroVendas>({
    nomeCliente: '',
    dataInicio: '',
    dataFim: '',
    formaPagamento: ''
  });
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [editandoVenda, setEditandoVenda] = useState<Venda | null>(null);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<Venda | null>(null);
  const [editForm, setEditForm] = useState<{ nomeCliente: string; dataVenda: string; formaPagamento: Venda['formaPagamento'] }>({
    nomeCliente: '',
    dataVenda: new Date().toISOString().split('T')[0],
    formaPagamento: 'dinheiro'
  });
  const [sucesso, setSucesso] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [editItens, setEditItens] = useState<ItemVenda[]>([]);

  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(venda => {
      const dataVenda = new Date(venda.dataVenda);
      const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
      const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : null;

      return (
        (filtros.nomeCliente === '' || 
         venda.nomeCliente.toLowerCase().includes(filtros.nomeCliente.toLowerCase())) &&
        (filtros.formaPagamento === '' || venda.formaPagamento === filtros.formaPagamento) &&
        (!dataInicio || dataVenda >= dataInicio) &&
        (!dataFim || dataVenda <= dataFim)
      );
    });
  }, [vendas, filtros]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    const totalVendas = vendasFiltradas.reduce((total, venda) => total + venda.valorTotal, 0);
    const totalLucro = vendasFiltradas.reduce((total, venda) => total + venda.lucroReal, 0);
    const quantidadeVendas = vendasFiltradas.length;
    const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;

    // Estatísticas por forma de pagamento
    const estatisticasPagamento = vendasFiltradas.reduce((acc, venda) => {
      if (!acc[venda.formaPagamento]) {
        acc[venda.formaPagamento] = { quantidade: 0, valor: 0 };
      }
      acc[venda.formaPagamento].quantidade += 1;
      acc[venda.formaPagamento].valor += venda.valorTotal;
      return acc;
    }, {} as Record<string, { quantidade: number; valor: number }>);

    return {
      totalVendas,
      totalLucro,
      quantidadeVendas,
      ticketMedio,
      estatisticasPagamento
    };
  }, [vendasFiltradas]);

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({
      nomeCliente: '',
      dataInicio: '',
      dataFim: '',
      formaPagamento: ''
    });
  };

  // Labels e badges (agora declaradas no arquivo)
  const getFormaPagamentoLabel = (forma: string) => {
    const labels: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'credito': 'Cartão de Crédito',
      'debito': 'Cartão de Débito',
      'pix': 'PIX',
      'transferencia': 'Transferência'
    };
    return labels[forma] || forma;
  };

  const getFormaPagamentoBadge = (forma: string) => {
    const classes: Record<string, string> = {
      'dinheiro': 'bg-green-100 text-green-800',
      'credito': 'bg-blue-100 text-blue-800',
      'debito': 'bg-purple-100 text-purple-800',
      'pix': 'bg-orange-100 text-orange-800',
      'transferencia': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${classes[forma] || 'bg-gray-100 text-gray-800'}`}>
        {getFormaPagamentoLabel(forma)}
      </span>
    );
  };

  const toTitleCase = (s: string) => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  const abrirEdicao = (venda: Venda) => {
    setEditandoVenda(venda);
    setEditForm({
      nomeCliente: venda.nomeCliente,
      dataVenda: new Date(venda.dataVenda).toISOString().split('T')[0],
      formaPagamento: venda.formaPagamento,
    });
    const itensArray = Array.isArray(venda.itens) ? venda.itens : [];
    setEditItens(itensArray.map(i => ({ ...i, joia: { ...i.joia } })));
    setErro('');
    setSucesso('');
  };

  const salvarEdicao = async () => {
    if (!editandoVenda) return;
    try {
      setErro('');
      // Totais recalculados com itens editados
      const novoValorTotal = editItens.reduce((t, it) => t + it.subtotal, 0);
      const novoLucro = editItens.reduce((t, it) => t + ((it.precoUnitario - it.joia.custoAquisicao) * it.quantidade), 0);

      // Mapear deltas de quantidade por joia
      const original = new Map<string, number>();
      (Array.isArray(editandoVenda.itens) ? editandoVenda.itens : []).forEach(it => {
        original.set(it.joiaId, (original.get(it.joiaId) || 0) + it.quantidade);
      });
      const atuais = new Map<string, { quantidade: number; joia: Joia }>();
      editItens.forEach(it => {
        atuais.set(it.joiaId, { quantidade: (atuais.get(it.joiaId)?.quantidade || 0) + it.quantidade, joia: it.joia });
      });

      // Validar aumentos vs estoque
      for (const [joiaId, atual] of atuais.entries()) {
        const anterior = original.get(joiaId) || 0;
        const delta = atual.quantidade - anterior;
        if (delta > 0) {
          const joiaAtual = joias.find(j => j.id === joiaId) || atual.joia;
          if (joiaAtual.quantidade < delta) {
            setErro(`Estoque insuficiente para ${joiaAtual.codigo} - ${joiaAtual.nome}. Disponível: ${joiaAtual.quantidade}, solicitado: +${delta}`);
            return;
          }
        }
      }

      // Devolver excedente
      for (const [joiaId, qtdAnterior] of original.entries()) {
        const atual = atuais.get(joiaId)?.quantidade || 0;
        const delta = atual - qtdAnterior;
        const joiaAtual = joias.find(j => j.id === joiaId) || (Array.isArray(editandoVenda.itens) ? editandoVenda.itens.find(i => i.joiaId === joiaId)?.joia : undefined);
        if (!joiaAtual) continue;
        if (delta < 0) {
          const repor = -delta;
          await updateJoia(joiaId, { quantidade: joiaAtual.quantidade + repor, status: 'disponivel' } as Partial<Joia>);
        }
      }
      // Retirar aumentos
      for (const [joiaId, atual] of atuais.entries()) {
        const qtdAnterior = original.get(joiaId) || 0;
        const delta = atual.quantidade - qtdAnterior;
        const joiaAtual = joias.find(j => j.id === joiaId) || atual.joia;
        if (delta > 0) {
          const novaQtd = joiaAtual.quantidade - delta;
          await updateJoia(joiaId, { quantidade: novaQtd, status: novaQtd === 0 ? 'vendida' : 'disponivel' } as Partial<Joia>);
        }
      }

      await updateVenda(editandoVenda.id, {
        nomeCliente: toTitleCase(editForm.nomeCliente.trim()),
        dataVenda: new Date(`${editForm.dataVenda}T12:00:00`),
        formaPagamento: editForm.formaPagamento,
        itens: editItens,
        valorTotal: novoValorTotal,
        lucroReal: novoLucro,
      });
      setSucesso('Venda atualizada com sucesso!');
      setTimeout(() => setSucesso(''), 2500);
      setEditandoVenda(null);
    } catch (e) {
      console.error('Erro ao atualizar venda:', e);
      setErro('Erro ao atualizar venda. Tente novamente.');
    }
  };

  const abrirExclusao = (venda: Venda) => {
    setVendaParaExcluir(venda);
  };

  const confirmarExclusao = async () => {
    if (!vendaParaExcluir) return;
    try {
      const itens = Array.isArray(vendaParaExcluir.itens) ? vendaParaExcluir.itens : [];
      for (const item of itens) {
        const joiaExistente = joias.find(j => j.id === item.joiaId);
        if (!joiaExistente) {
          // Joia foi excluída do estoque; não há como repor. Pular e seguir.
          continue;
        }
        const novaQuantidade = joiaExistente.quantidade + item.quantidade;
        try {
          await updateJoia(item.joiaId, {
            quantidade: novaQuantidade,
            status: 'disponivel'
          } as Partial<Joia>);
        } catch (e) {
          // Falhou ao repor uma joia específica; continuar com as demais e prosseguir com exclusão da venda
          console.warn('Falha ao repor joia ao excluir venda', item.joiaId, e);
        }
      }
      await removeVenda(vendaParaExcluir.id);
      setSucesso('Venda excluída com sucesso!');
      setTimeout(() => setSucesso(''), 2500);
      setVendaParaExcluir(null);
    } catch (e) {
      console.error('Erro ao excluir venda:', e);
    }
  };
;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solarie-600"></div>
        <span className="ml-2 text-gray-600">Carregando histórico...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{erro}</div>
      )}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <History className="h-6 w-6 mr-2 text-solarie-600" />
          Histórico de Vendas
        </h2>
        <p className="text-gray-600 mt-2">
          Acompanhe todas as vendas realizadas e suas estatísticas
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total em Vendas</p>
              <p className="text-2xl font-bold text-green-600">{formatarMoeda(estatisticas.totalVendas)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Lucro Total</p>
              <p className="text-2xl font-bold text-blue-600">{formatarMoeda(estatisticas.totalLucro)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <History className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Quantidade de Vendas</p>
              <p className="text-2xl font-bold text-purple-600">{estatisticas.quantidadeVendas}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <User className="h-8 w-8 text-solarie-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-solarie-700">{formatarMoeda(estatisticas.ticketMedio)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas por Forma de Pagamento */}
      {Object.keys(estatisticas.estatisticasPagamento).length > 0 && (
        <div className="card mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Vendas por Forma de Pagamento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(estatisticas.estatisticasPagamento).map(([forma, dados]) => (
              <div key={forma} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{getFormaPagamentoLabel(forma)}</span>
                  {getFormaPagamentoBadge(forma)}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Quantidade: <span className="font-medium">{dados.quantidade} vendas</span></p>
                  <p>Valor: <span className="font-medium text-solarie-600">{formatarMoeda(dados.valor)}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </h3>
          <button
            onClick={limparFiltros}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Cliente
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                name="nomeCliente"
                value={filtros.nomeCliente}
                onChange={handleFiltroChange}
                className="input-field pl-9"
                placeholder="Buscar por nome..."
              />
            </div>
          </div>

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
              Forma de Pagamento
            </label>
            <div className="relative">
              <CreditCard className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <select
                name="formaPagamento"
                value={filtros.formaPagamento}
                onChange={handleFiltroChange}
                className="input-field pl-9"
              >
                <option value="">Todas as formas</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="credito">Cartão de Crédito</option>
                <option value="debito">Cartão de Débito</option>
                <option value="pix">PIX</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Vendas */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Vendas ({vendasFiltradas.length})
          </h3>
        </div>

        {vendasFiltradas.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma venda encontrada com os filtros aplicados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente / Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Forma de Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Itens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lucro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendasFiltradas.map((venda) => (
                  <tr key={venda.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{venda.nomeCliente}</div>
                        <div className="text-sm text-gray-500">{new Date(venda.dataVenda).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getFormaPagamentoBadge(venda.formaPagamento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(Array.isArray(venda.itens) ? venda.itens : []).reduce((total, item) => total + item.quantidade, 0)} peças
                      </div>
                      <div className="text-sm text-gray-500">
                        {(Array.isArray(venda.itens) ? venda.itens : []).length} item{(Array.isArray(venda.itens) ? venda.itens : []).length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatarMoeda(venda.valorTotal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {formatarMoeda(venda.lucroReal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setVendaSelecionada(venda)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => abrirEdicao(venda)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Editar"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => abrirExclusao(venda)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert de sucesso */}
      {sucesso && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          {sucesso}
        </div>
      )}

      {/* Modal de Detalhes da Venda */}
      {vendaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Detalhes da Venda</h3>
              <button
                onClick={() => setVendaSelecionada(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Informações da Venda</h4>
                <div className="space-y-2">
                  <div><span className="text-gray-600">Cliente:</span> <span className="font-medium">{vendaSelecionada.nomeCliente}</span></div>
                  <div><span className="text-gray-600">Data:</span> <span className="font-medium">{formatarData(vendaSelecionada.dataVenda)}</span></div>
                  <div><span className="text-gray-600">Forma de Pagamento:</span> <span className="font-medium">{getFormaPagamentoLabel(vendaSelecionada.formaPagamento)}</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Resumo Financeiro</h4>
                <div className="space-y-2">
                  <div><span className="text-gray-600">Valor Total:</span> <span className="font-medium text-lg">{formatarMoeda(vendaSelecionada.valorTotal)}</span></div>
                  <div><span className="text-gray-600">Lucro Real:</span> <span className="font-medium text-green-600">{formatarMoeda(vendaSelecionada.lucroReal)}</span></div>
                  <div><span className="text-gray-600">Total de Itens:</span> <span className="font-medium">{vendaSelecionada.itens.reduce((total, item) => total + item.quantidade, 0)} peças</span></div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Itens Vendidos</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qtd</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço Unit.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendaSelecionada.itens.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.joia.nome}</div>
                            <div className="text-sm text-gray-500">{item.joia.categoria} • {item.joia.material}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.joia.codigo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.quantidade}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{formatarMoeda(item.precoUnitario)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-solarie-600">{formatarMoeda(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setVendaSelecionada(null)}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editandoVenda && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Editar Venda</h3>
              <button onClick={() => setEditandoVenda(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Cliente</label>
                <input
                  type="text"
                  value={editForm.nomeCliente}
                  onChange={(e) => setEditForm(prev => ({ ...prev, nomeCliente: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda</label>
                <input
                  type="date"
                  value={editForm.dataVenda}
                  onChange={(e) => setEditForm(prev => ({ ...prev, dataVenda: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                <select
                  value={editForm.formaPagamento}
                  onChange={(e) => setEditForm(prev => ({ ...prev, formaPagamento: e.target.value as Venda['formaPagamento'] }))}
                  className="input-field"
                >
                  <option value="dinheiro">Dinheiro/PIX</option>
                  <option value="credito">Cartão de Crédito</option>
                  <option value="debito">Cartão de Débito</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setEditandoVenda(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarEdicao} className="btn-primary">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {vendaParaExcluir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <X className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Excluir Venda</h3>
            </div>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir esta venda? O estoque das joias será reposto.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setVendaParaExcluir(null)} className="btn-secondary">Cancelar</button>
              <button onClick={confirmarExclusao} className="btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoVendas;
