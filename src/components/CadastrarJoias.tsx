import React, { useState, useEffect } from 'react';
import { Plus, Calculator, Save, AlertCircle } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Joia } from '../types';
import {
  calcularFretePorPeca,
  calcularCustoAquisicao,
  calcularPrecoVendaFinal,
  calcularLucroEsperado,
  formatarMoeda
} from '../utils/calculations';

interface FormData {
  codigo: string;
  nome: string;
  categoria: string;
  quantidade: number;
  material: string;
  fornecedor: string;
  dataCompra: string;
  precoPorPeca: number;
  freteTotal: number;
  totalPecasCompra: number;
  custoEmbalagem: number;
  outrosCustos: number;
  margemLucro: number;
  taxaCredito: number;
}

type Props = { joiaEdicao?: Joia | null; onFinishEdicao?: () => void };

const CadastrarJoias: React.FC<Props> = ({ joiaEdicao, onFinishEdicao }) => {
  const { add, update, loading, data: joiasData } = useFirestore<Joia>('joias');
  const [formData, setFormData] = useState<FormData>({
    codigo: '',
    nome: '',
    categoria: '',
    quantidade: 1,
    material: '',
    fornecedor: '',
    dataCompra: new Date().toISOString().split('T')[0],
    precoPorPeca: 0,
    freteTotal: 0,
    totalPecasCompra: 1,
    custoEmbalagem: 0,
    outrosCustos: 0,
    margemLucro: 100,
    taxaCredito: 5
  });

  const [calculatedValues, setCalculatedValues] = useState({
    fretePorPeca: 0,
    custoAquisicao: 0,
    precoVendaFinal: 0,
    lucroEsperado: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Preencher formulário em modo edição
  useEffect(() => {
    if (!joiaEdicao) return;
    setFormData({
      codigo: joiaEdicao.codigo,
      nome: joiaEdicao.nome,
      categoria: joiaEdicao.categoria,
      quantidade: joiaEdicao.quantidade,
      material: joiaEdicao.material,
      fornecedor: joiaEdicao.fornecedor,
      dataCompra: new Date(joiaEdicao.dataCompra).toISOString().split('T')[0],
      precoPorPeca: joiaEdicao.precoPorPeca,
      freteTotal: joiaEdicao.freteTotal,
      totalPecasCompra: joiaEdicao.totalPecasCompra,
      custoEmbalagem: joiaEdicao.custoEmbalagem,
      outrosCustos: joiaEdicao.outrosCustos,
      margemLucro: joiaEdicao.margemLucro,
      taxaCredito: joiaEdicao.taxaCredito,
    });
  }, [joiaEdicao]);

  // Recalcular valores sempre que os campos relevantes mudarem
  useEffect(() => {
    const fretePorPeca = calcularFretePorPeca(formData.freteTotal, formData.totalPecasCompra);
    const custoAquisicao = calcularCustoAquisicao(
      formData.precoPorPeca,
      fretePorPeca,
      formData.custoEmbalagem,
      formData.outrosCustos
    );
    const precoVendaFinal = calcularPrecoVendaFinal(
      formData.precoPorPeca,
      fretePorPeca,
      formData.outrosCustos,
      formData.margemLucro,
      formData.custoEmbalagem,
      formData.taxaCredito
    );
    const lucroEsperado = calcularLucroEsperado(precoVendaFinal, custoAquisicao);

    setCalculatedValues({
      fretePorPeca,
      custoAquisicao,
      precoVendaFinal,
      lucroEsperado
    });
  }, [
    formData.precoPorPeca,
    formData.freteTotal,
    formData.totalPecasCompra,
    formData.custoEmbalagem,
    formData.outrosCustos,
    formData.margemLucro,
    formData.taxaCredito
  ]);

  const toTitleCase = (s: string) => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newVal: any = type === 'number' ? (parseFloat(value) || 0) : value;
    if (name === 'codigo') newVal = (value as string).toUpperCase();
    if (name === 'nome' || name === 'material' || name === 'fornecedor') newVal = toTitleCase(value);
    setFormData(prev => ({ ...prev, [name]: newVal }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.codigo.trim()) newErrors.codigo = 'Código é obrigatório';
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.categoria.trim()) newErrors.categoria = 'Categoria é obrigatória';
    if (!formData.material.trim()) newErrors.material = 'Material é obrigatório';
    if (!formData.fornecedor.trim()) newErrors.fornecedor = 'Fornecedor é obrigatório';
    if (formData.quantidade <= 0) newErrors.quantidade = 'Quantidade deve ser maior que zero';
    if (formData.precoPorPeca <= 0) newErrors.precoPorPeca = 'Preço por peça deve ser maior que zero';
    if (formData.totalPecasCompra <= 0) newErrors.totalPecasCompra = 'Total de peças da compra deve ser maior que zero';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (joiaEdicao) {
        await update(joiaEdicao.id, {
          ...formData,
          dataCompra: new Date(`${formData.dataCompra}T12:00:00`),
          fretePorPeca: calculatedValues.fretePorPeca,
          custoAquisicao: calculatedValues.custoAquisicao,
          precoVendaFinal: calculatedValues.precoVendaFinal,
          lucroEsperado: calculatedValues.lucroEsperado,
        });
      } else {
        const novaJoia: Omit<Joia, 'id' | 'createdAt' | 'updatedAt'> = {
          ...formData,
          dataCompra: new Date(`${formData.dataCompra}T12:00:00`),
          fretePorPeca: calculatedValues.fretePorPeca,
          custoAquisicao: calculatedValues.custoAquisicao,
          precoVendaFinal: calculatedValues.precoVendaFinal,
          lucroEsperado: calculatedValues.lucroEsperado,
          status: 'disponivel'
        };
  
        await add(novaJoia);
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Resetar formulário
      setFormData({
        codigo: '',
        nome: '',
        categoria: '',
        quantidade: 1,
        material: '',
        fornecedor: '',
        dataCompra: new Date().toISOString().split('T')[0],
        precoPorPeca: 0,
        freteTotal: 0,
        totalPecasCompra: 1,
        custoEmbalagem: 0,
        outrosCustos: 0,
        margemLucro: 100,
        taxaCredito: 5
      });

      if (onFinishEdicao) onFinishEdicao();
    } catch (error) {
      console.error('Erro ao cadastrar joia:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Plus className="h-6 w-6 mr-2 text-solarie-600" />
          Cadastrar Nova Joia
        </h2>
        <p className="text-gray-600 mt-2">
          Adicione uma nova joia ao seu estoque com cálculos automáticos de preços
        </p>
        {joiaEdicao && (
          <div className="mt-2 text-sm text-yellow-700">Editando joia já cadastrada: <strong>{joiaEdicao.codigo}</strong> - {joiaEdicao.nome}</div>
        )}
        {!joiaEdicao && joiasData && joiasData.length > 0 && (
          <div className="mt-2 text-sm text-gray-700">Última joia cadastrada: <strong>{joiasData[0].codigo}</strong> - {joiasData[0].nome}</div>
        )}
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <div className="h-4 w-4 bg-green-500 rounded-full mr-3"></div>
          <span className="text-green-800 font-medium">Joia cadastrada com sucesso!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleInputChange}
                className={`input-field ${errors.codigo ? 'border-red-500' : ''}`}
                placeholder="Ex: JOI001"
              />
              {errors.codigo && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.codigo}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className={`input-field ${errors.nome ? 'border-red-500' : ''}`}
                placeholder="Ex: Anel de Ouro"
              />
              {errors.nome && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.nome}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria *
              </label>
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleInputChange}
                className={`input-field ${errors.categoria ? 'border-red-500' : ''}`}
              >
                <option value="">Selecione...</option>
                <option value="Anéis">Anéis</option>
                <option value="Brincos">Brincos</option>
                <option value="Colares">Colares</option>
                <option value="Pulseiras">Pulseiras</option>
                <option value="Pingentes">Pingentes</option>
                <option value="Conjuntos">Conjuntos</option>
                <option value="Outros">Outros</option>
              </select>
              {errors.categoria && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.categoria}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                name="quantidade"
                value={formData.quantidade}
                onChange={handleInputChange}
                min="1"
                className={`input-field ${errors.quantidade ? 'border-red-500' : ''}`}
              />
              {errors.quantidade && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.quantidade}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material *
              </label>
              <input
                type="text"
                name="material"
                value={formData.material}
                onChange={handleInputChange}
                className={`input-field ${errors.material ? 'border-red-500' : ''}`}
                placeholder="Ex: Ouro 18k"
              />
              {errors.material && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.material}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fornecedor *
              </label>
              <input
                type="text"
                name="fornecedor"
                value={formData.fornecedor}
                onChange={handleInputChange}
                className={`input-field ${errors.fornecedor ? 'border-red-500' : ''}`}
                placeholder="Ex: Joias & Cia"
              />
              {errors.fornecedor && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.fornecedor}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data da Compra
              </label>
              <input
                type="date"
                name="dataCompra"
                value={formData.dataCompra}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Custos e Preços */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-solarie-600" />
            Custos e Cálculo de Preços
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço por Peça *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R$</span>
                <input
                  type="number"
                  name="precoPorPeca"
                  value={formData.precoPorPeca}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`input-field pl-10 ${errors.precoPorPeca ? 'border-red-500' : ''}`}
                  placeholder="0,00"
                />
              </div>
              {errors.precoPorPeca && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.precoPorPeca}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frete Total da Compra
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R$</span>
                <input
                  type="number"
                  name="freteTotal"
                  value={formData.freteTotal}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="input-field pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total de Peças na Compra *
              </label>
              <input
                type="number"
                name="totalPecasCompra"
                value={formData.totalPecasCompra}
                onChange={handleInputChange}
                min="1"
                className={`input-field ${errors.totalPecasCompra ? 'border-red-500' : ''}`}
              />
              {errors.totalPecasCompra && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.totalPecasCompra}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo de Embalagem
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R$</span>
                <input
                  type="number"
                  name="custoEmbalagem"
                  value={formData.custoEmbalagem}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="input-field pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outros Custos por Peça
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R$</span>
                <input
                  type="number"
                  name="outrosCustos"
                  value={formData.outrosCustos}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="input-field pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margem de Lucro (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="margemLucro"
                  value={formData.margemLucro}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="input-field pr-8"
                  placeholder="100"
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa Crédito Fixa (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="taxaCredito"
                  value={formData.taxaCredito}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="input-field pr-8"
                  placeholder="5"
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* Valores Calculados */}
          <div className="bg-solarie-50 p-4 rounded-lg border border-solarie-200">
            <h4 className="font-semibold text-gray-900 mb-3">Valores Calculados</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Frete por Peça</p>
                <p className="font-semibold text-gray-900">{formatarMoeda(calculatedValues.fretePorPeca)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Custo de Aquisição</p>
                <p className="font-semibold text-gray-900">{formatarMoeda(calculatedValues.custoAquisicao)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Preço de Venda Final</p>
                <p className="font-semibold text-solarie-700 text-lg">{formatarMoeda(calculatedValues.precoVendaFinal)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Lucro Esperado</p>
                <p className="font-semibold text-green-600">{formatarMoeda(calculatedValues.lucroEsperado)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end items-center space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : (joiaEdicao ? 'Salvar Edição' : 'Salvar Joia')}
          </button>
          {success && (
            <span className="text-green-700 text-sm">Salvo com sucesso!</span>
          )}
        </div>
      </form>
    </div>
  );
};

export default CadastrarJoias;