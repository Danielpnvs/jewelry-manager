import React, { useState, useMemo, useEffect as ReactUseEffect } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User,
  Calendar,
  CreditCard,
  Save,
  AlertCircle
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Joia, Venda, ItemVenda } from '../types';
import { formatarMoeda, calcularTotaisVenda } from '../utils/calculations';

const RegistrarVendas: React.FC = () => {
  const { data: joias, update: updateJoia } = useFirestore<Joia>('joias');
  const { add: addVenda, loading } = useFirestore<Venda>('vendas');
  
  const [nomeCliente, setNomeCliente] = useState('');
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'credito' | 'debito'>('dinheiro');
  const [descontarTaxaCredito, setDescontarTaxaCredito] = useState<'sim' | 'nao'>('nao');
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [busca, setBusca] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Filtrar joias disponíveis para busca
  const joiasDisponiveis = useMemo(() => {
    return joias.filter(joia => 
      joia.status === 'disponivel' && 
      joia.quantidade > 0 &&
      (busca === '' || 
       joia.codigo.toLowerCase().includes(busca.toLowerCase()) ||
       joia.nome.toLowerCase().includes(busca.toLowerCase()))
    );
  }, [joias, busca]);

  // Calcular totais da venda
  const totais = useMemo(() => {
    return calcularTotaisVenda(itensVenda);
  }, [itensVenda]);

  const precoEfetivo = (joia: Joia) => {
    const base = joia.precoVendaFinal;
    if (formaPagamento === 'dinheiro' && descontarTaxaCredito === 'sim') {
      const taxa = joia.taxaCredito || 0;
      return base * (1 - (taxa / 100));
    }
    return base;
  };

  const adicionarItem = (joia: Joia) => {
    const itemExistente = itensVenda.find(item => item.joiaId === joia.id);
    
    if (itemExistente) {
      if (itemExistente.quantidade < joia.quantidade) {
        setItensVenda(prev => prev.map(item => 
          item.joiaId === joia.id 
            ? { 
                ...item, 
                quantidade: item.quantidade + 1,
                subtotal: (item.quantidade + 1) * item.precoUnitario 
              }
            : item
        ));
      }
    } else {
      const unit = precoEfetivo(joia);
      const novoItem: ItemVenda = {
        joiaId: joia.id,
        joia,
        quantidade: 1,
        precoUnitario: unit,
        subtotal: unit
      };
      setItensVenda(prev => [...prev, novoItem]);
    }
    setBusca('');
  };

  const removerItem = (joiaId: string) => {
    setItensVenda(prev => prev.filter(item => item.joiaId !== joiaId));
  };

  const alterarQuantidade = (joiaId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerItem(joiaId);
      return;
    }

    setItensVenda(prev => prev.map(item => {
      if (item.joiaId === joiaId) {
        const quantidadeMaxima = item.joia.quantidade;
        const quantidade = Math.min(novaQuantidade, quantidadeMaxima);
        return {
          ...item,
          quantidade,
          subtotal: quantidade * item.precoUnitario
        };
      }
      return item;
    }));
  };

  const alterarPreco = (joiaId: string, novoPreco: number) => {
    setItensVenda(prev => prev.map(item => 
      item.joiaId === joiaId 
        ? { 
            ...item, 
            precoUnitario: novoPreco,
            subtotal: item.quantidade * novoPreco 
          }
        : item
    ));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!nomeCliente.trim()) newErrors.nomeCliente = 'Nome da cliente é obrigatório';
    if (itensVenda.length === 0) newErrors.itens = 'Adicione pelo menos uma joia à venda';
    
    // Verificar se há quantidade suficiente
    for (const item of itensVenda) {
      if (item.quantidade > item.joia.quantidade) {
        newErrors.quantidade = `Quantidade insuficiente para ${item.joia.nome}`;
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reaplicar preço efetivo quando forma de pagamento / desconto mudarem
  ReactUseEffect(() => {
    setItensVenda(prev => prev.map(item => {
      const unit = precoEfetivo(item.joia);
      return { ...item, precoUnitario: unit, subtotal: unit * item.quantidade };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formaPagamento, descontarTaxaCredito]);

  const finalizarVenda = async () => {
    if (!validateForm()) return;

    try {
      // Criar a venda
      const toTitleCase = (s: string) => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      const novaVenda: Omit<Venda, 'id' | 'createdAt'> = {
        nomeCliente: toTitleCase(nomeCliente),
        dataVenda: new Date(`${dataVenda}T12:00:00`),
        formaPagamento,
        itens: itensVenda,
        valorTotal: totais.valorTotal,
        lucroReal: totais.lucroReal
      };

      await addVenda(novaVenda);

      // Atualizar estoque das joias vendidas
      for (const item of itensVenda) {
        const novaQuantidade = item.joia.quantidade - item.quantidade;
        const novoStatus = novaQuantidade === 0 ? 'vendida' : 'disponivel';
        
        await updateJoia(item.joiaId, {
          quantidade: novaQuantidade,
          status: novoStatus
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Resetar formulário
      setNomeCliente('');
      setDataVenda(new Date().toISOString().split('T')[0]);
      setFormaPagamento('dinheiro');
      setDescontarTaxaCredito('nao');
      setItensVenda([]);
      setBusca('');
      setErrors({});

    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-solarie-600" />
          Registrar Venda
        </h2>
        <p className="text-gray-600 mt-2">
          Registre uma nova venda e atualize automaticamente o estoque
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <div className="h-4 w-4 bg-green-500 rounded-full mr-3"></div>
          <span className="text-green-800 font-medium">Venda registrada com sucesso!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informações da Venda */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Informações da Venda
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Cliente *
                </label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))}
                  className={`input-field ${errors.nomeCliente ? 'border-red-500' : ''}`}
                  placeholder="Digite o nome da cliente..."
                />
                {errors.nomeCliente && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.nomeCliente}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Venda
                </label>
                <div className="relative">
                  <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="date"
                    value={dataVenda}
                    onChange={(e) => setDataVenda(e.target.value)}
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
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as any)}
                    className="input-field pl-9"
                  >
                    <option value="dinheiro">Dinheiro/PIX</option>
                    <option value="credito">Cartão de Crédito</option>
                    <option value="debito">Cartão de Débito</option>
                  </select>
                </div>
              </div>

              {formaPagamento === 'dinheiro' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto Taxa Crédito</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="descontoTaxa" checked={descontarTaxaCredito==='sim'} onChange={() => setDescontarTaxaCredito('sim')} />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="descontoTaxa" checked={descontarTaxaCredito==='nao'} onChange={() => setDescontarTaxaCredito('nao')} />
                      <span>Não</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Resumo da Venda */}
            {itensVenda.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Resumo da Venda</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor Total:</span>
                    <span className="font-semibold text-lg">{formatarMoeda(totais.valorTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lucro Real:</span>
                    <span className="font-semibold text-green-600">{formatarMoeda(totais.lucroReal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Itens:</span>
                    <span>{itensVenda.reduce((total, item) => total + item.quantidade, 0)} peças</span>
                  </div>
                </div>

                <button
                  onClick={finalizarVenda}
                  disabled={loading || itensVenda.length === 0}
                  className="w-full mt-4 btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Finalizando...' : 'Finalizar Venda'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Buscar e Adicionar Joias */}
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Buscar Joias
            </h3>

            <div className="relative mb-4">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="input-field pl-9"
                placeholder="Busque por código ou nome da joia..."
              />
            </div>

            {errors.itens && (
              <p className="text-red-500 text-sm mb-4 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.itens}
              </p>
            )}

            {errors.quantidade && (
              <p className="text-red-500 text-sm mb-4 flex items_center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.quantidade}
              </p>
            )}

            {busca && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {joiasDisponiveis.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nenhuma joia encontrada
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {joiasDisponiveis.map((joia) => (
                      <div
                        key={joia.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => adicionarItem(joia)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{joia.codigo} - {joia.nome}</div>
                            <div className="text-sm text-gray-500">
                              {joia.categoria} • {joia.material} • Qtd: {joia.quantidade}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-solarie-600">{formatarMoeda(joia.precoVendaFinal)}</div>
                            <div className="text-xs text-gray-500">por peça</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Itens da Venda */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Itens da Venda ({itensVenda.length})
            </h3>

            {itensVenda.length === 0 ? (
              <div className="text-center py-8 text_gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhuma joia adicionada à venda</p>
                <p className="text-sm">Use a busca acima para adicionar joias</p>
              </div>
            ) : (
              <div className="space-y-4">
                {itensVenda.map((item) => (
                  <div key={item.joiaId} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-900">{item.joia.codigo} - {item.joia.nome}</div>
                        <div className="text-sm text-gray-500">{item.joia.categoria} • {item.joia.material}</div>
                        <div className="text-xs text-gray-400">Disponível: {item.joia.quantidade} peças</div>
                      </div>
                      <button
                        onClick={() => removerItem(item.joiaId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Quantidade</label>
                        <div className="flex items_center">
                          <button
                            onClick={() => alterarQuantidade(item.joiaId, item.quantidade - 1)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => alterarQuantidade(item.joiaId, parseInt(e.target.value) || 0)}
                            min="1"
                            max={item.joia.quantidade}
                            className="w-16 text-center border border-gray-300 rounded px-2 py-1 mx-2"
                          />
                          <button
                            onClick={() => alterarQuantidade(item.joiaId, item.quantidade + 1)}
                            disabled={item.quantidade >= item.joia.quantidade}
                            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Preço Unitário</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-xs text-gray-500">R$</span>
                          <input
                            type="number"
                            value={item.precoUnitario}
                            onChange={(e) => alterarPreco(item.joiaId, parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Subtotal</label>
                        <div className="py-1 px-2 bg-white border border-gray-300 rounded text-sm font-semibold text-solarie-600">
                          {formatarMoeda(item.subtotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrarVendas;