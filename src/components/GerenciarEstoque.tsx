import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye,
  AlertCircle,
  TrendingUp,
  DollarSign,
  X
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Joia, FiltroEstoque } from '../types';
import { formatarMoeda, formatarData, calcularEstatisticasEstoque } from '../utils/calculations';

type EstoqueProps = { onEditarJoia?: (joia: Joia) => void };

const GerenciarEstoque: React.FC<EstoqueProps> = ({ onEditarJoia }) => {
  const { data: joias, loading, remove } = useFirestore<Joia>('joias');
  const [filtros, setFiltros] = useState<FiltroEstoque>({
    codigo: '',
    nome: '',
    categoria: '',
    status: 'todos',
    material: '',
    fornecedor: ''
  });
  const [joiaSelecionada, setJoiaSelecionada] = useState<Joia | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [joiaParaExcluir, setJoiaParaExcluir] = useState<Joia | null>(null);
  // Edição acontece na tela de cadastro. Este componente apenas aciona o fluxo.

  // Filtrar joias
  const joiasFiltradas = useMemo(() => {
    const filtradas = joias.filter(joia => {
      return (
        (filtros.codigo === '' || joia.codigo.toLowerCase().includes(filtros.codigo.toLowerCase())) &&
        (filtros.nome === '' || joia.nome.toLowerCase().includes(filtros.nome.toLowerCase())) &&
        (filtros.categoria === '' || joia.categoria === filtros.categoria) &&
        (filtros.status === 'todos' || joia.status === filtros.status) &&
        (filtros.material === '' || joia.material.toLowerCase().includes(filtros.material.toLowerCase())) &&
        (filtros.fornecedor === '' || joia.fornecedor.toLowerCase().includes(filtros.fornecedor.toLowerCase()))
      );
    });
    return filtradas.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'disponivel' ? -1 : 1;
      const ac = a.codigo.toLowerCase();
      const bc = b.codigo.toLowerCase();
      if (ac !== bc) return ac.localeCompare(bc);
      return a.nome.toLowerCase().localeCompare(b.nome.toLowerCase());
    });
  }, [joias, filtros]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    return calcularEstatisticasEstoque(joias);
  }, [joias]);

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({
      codigo: '',
      nome: '',
      categoria: '',
      status: 'todos',
      material: '',
      fornecedor: ''
    });
  };

  const handleExcluir = async (joia: Joia) => {
    setJoiaParaExcluir(joia);
    setShowDeleteModal(true);
  };

  const confirmarExclusao = async () => {
    if (joiaParaExcluir) {
      try {
        await remove(joiaParaExcluir.id);
        setShowDeleteModal(false);
        setJoiaParaExcluir(null);
      } catch (error) {
        console.error('Erro ao excluir joia:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponivel':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Disponível
          </span>
        );
      case 'vendida':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Vendida
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solarie-600"></div>
        <span className="ml-2 text-gray-600">Carregando estoque...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Package className="h-6 w-6 mr-2 text-solarie-600" />
          Gerenciar Estoque
        </h2>
        <p className="text-gray-600 mt-2">
          Visualize e gerencie todas as joias do seu estoque
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total de Joias</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalJoias}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Disponíveis</p>
              <p className="text-2xl font-bold text-green-600">{estatisticas.joiasDisponiveis}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-solarie-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Valor do Estoque</p>
              <p className="text-2xl font-bold text-solarie-700">{formatarMoeda(estatisticas.valorEstoque)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Lucro Esperado</p>
              <p className="text-2xl font-bold text-purple-600">{formatarMoeda(estatisticas.lucroTotal)}</p>
            </div>
          </div>
        </div>
      </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                name="codigo"
                value={filtros.codigo}
                onChange={handleFiltroChange}
                className="input-field pl-9"
                placeholder="Buscar por código..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                name="nome"
                value={filtros.nome}
                onChange={handleFiltroChange}
                className="input-field pl-9"
                placeholder="Buscar por nome..."
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
              Status
            </label>
            <select
              name="status"
              value={filtros.status}
              onChange={handleFiltroChange}
              className="input-field"
            >
              <option value="todos">Todos os status</option>
              <option value="disponivel">Disponível</option>
              <option value="vendida">Vendida</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Material
            </label>
            <input
              type="text"
              name="material"
              value={filtros.material}
              onChange={handleFiltroChange}
              className="input-field"
              placeholder="Buscar por material..."
            />
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
              placeholder="Buscar por fornecedor..."
            />
          </div>
        </div>
      </div>

      {/* Tabela de Joias */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Joias ({joiasFiltradas.length})
          </h3>
        </div>

        {joiasFiltradas.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma joia encontrada com os filtros aplicados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código / Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria / Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lucro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {joiasFiltradas.map((joia) => (
                  <tr key={joia.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{joia.codigo}</div>
                        <div className="text-sm text-gray-500">{joia.nome}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{joia.categoria}</div>
                        <div className="text-sm text-gray-500">{joia.material}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{joia.quantidade}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-solarie-600">{formatarMoeda(joia.precoVendaFinal)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {formatarMoeda(joia.lucroEsperado)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(joia.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setJoiaSelecionada(joia)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditarJoia && onEditarJoia(joia)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Editar"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleExcluir(joia)}
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

      {/* Modal de Detalhes */}
      {joiaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Detalhes da Joia</h3>
              <button
                onClick={() => setJoiaSelecionada(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Informações Básicas</h4>
                <div className="space-y-2">
                  <div><span className="text-gray-600">Código:</span> <span className="font-medium">{joiaSelecionada.codigo}</span></div>
                  <div><span className="text-gray-600">Nome:</span> <span className="font-medium">{joiaSelecionada.nome}</span></div>
                  <div><span className="text-gray-600">Categoria:</span> <span className="font-medium">{joiaSelecionada.categoria}</span></div>
                  <div><span className="text-gray-600">Material:</span> <span className="font-medium">{joiaSelecionada.material}</span></div>
                  <div><span className="text-gray-600">Fornecedor:</span> <span className="font-medium">{joiaSelecionada.fornecedor}</span></div>
                  <div><span className="text-gray-600">Quantidade:</span> <span className="font-medium">{joiaSelecionada.quantidade}</span></div>
                  <div><span className="text-gray-600">Data da Compra:</span> <span className="font-medium">{formatarData(joiaSelecionada.dataCompra)}</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Valores e Custos</h4>
                <div className="space-y-2">
                  <div><span className="text-gray-600">Preço por Peça:</span> <span className="font-medium">{formatarMoeda(joiaSelecionada.precoPorPeca)}</span></div>
                  <div><span className="text-gray-600">Frete por Peça:</span> <span className="font-medium">{formatarMoeda(joiaSelecionada.fretePorPeca)}</span></div>
                  <div><span className="text-gray-600">Custo Embalagem:</span> <span className="font-medium">{formatarMoeda(joiaSelecionada.custoEmbalagem)}</span></div>
                  <div><span className="text-gray-600">Outros Custos:</span> <span className="font-medium">{formatarMoeda(joiaSelecionada.outrosCustos)}</span></div>
                  <div><span className="text-gray-600">Custo de Aquisição:</span> <span className="font-medium text-red-600">{formatarMoeda(joiaSelecionada.custoAquisicao)}</span></div>
                  <div><span className="text-gray-600">Preço de Venda:</span> <span className="font-medium text-solarie-600">{formatarMoeda(joiaSelecionada.precoVendaFinal)}</span></div>
                  <div><span className="text-gray-600">Lucro Esperado:</span> <span className="font-medium text-green-600">{formatarMoeda(joiaSelecionada.lucroEsperado)}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setJoiaSelecionada(null)}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edição redirecionada para a tela de cadastro */}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && joiaParaExcluir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir a joia <strong>{joiaParaExcluir.nome}</strong> (Código: {joiaParaExcluir.codigo})? 
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="btn-danger"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarEstoque;
