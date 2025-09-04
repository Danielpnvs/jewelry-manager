import React, { useMemo, useState } from 'react';
import { DollarSign, PlusCircle, MinusCircle, Calendar, Save, Edit3, Trash2, X } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Venda } from '../types';
import { formatarMoeda } from '../utils/calculations';

type Movimento = {
  id: string;
  data: Date;
  descricao: string;
  tipo: 'saida';
  origem: 'caixa' | 'embalagem';
  suborigem?: 'reinvestimento' | 'caixa_loja' | 'salario';
  valor: number;
};

const FluxoCaixa: React.FC = () => {
  const { data: vendas } = useFirestore<Venda>('vendas');
  const { data: movimentosReg, add: addMov, update: updateMov, remove: removeMov } = useFirestore<Movimento>('fluxo');

  const caixa = useMemo(() => {
    let totalVendas = 0;
    let valorEmbalagem = 0;
    vendas.forEach(v => {
      const itens = Array.isArray(v.itens) ? v.itens : [];
      totalVendas += v.valorTotal;
      valorEmbalagem += itens.reduce((t, it) => t + (it.joia.custoEmbalagem || 0) * it.quantidade, 0);
    });
    const lucroTotal = vendas.reduce((t, v) => t + v.lucroReal, 0);

    const saidasCaixa = movimentosReg
      .filter(m => m.origem === 'caixa')
      .reduce((t, m) => t + m.valor, 0);
    const saidasEmbalagem = movimentosReg
      .filter(m => m.origem === 'embalagem')
      .reduce((t, m) => t + m.valor, 0);

    return {
      totalVendas,
      lucroTotal,
      valorEmbalagem,
      saldoCaixa: Math.max(0, totalVendas - saidasCaixa),
      saldoEmbalagem: Math.max(0, valorEmbalagem - saidasEmbalagem),
      saidasCaixa,
      saidasEmbalagem,
    };
  }, [vendas, movimentosReg]);

  // Divisão do saldo do caixa em percentuais
  const [divisaoCaixa, setDivisaoCaixa] = useState<{ reinvestimento: number; caixaLoja: number; salario: number }>({
    reinvestimento: 50,
    caixaLoja: 30,
    salario: 20,
  });

  const ajustarDivisaoCaixa = (campo: keyof typeof divisaoCaixa, valor: number) => {
    const novo = { ...divisaoCaixa, [campo]: Math.max(0, Math.min(100, valor)) };
    const soma = novo.reinvestimento + novo.caixaLoja + novo.salario;
    if (soma > 100) {
      const outros: Array<keyof typeof divisaoCaixa> = ['reinvestimento','caixaLoja','salario'].filter(k => k !== campo) as any;
      const excesso = soma - 100;
      const totalOutros = novo[outros[0]] + novo[outros[1]];
      if (totalOutros > 0) {
        outros.forEach(k => {
          const proporcao = novo[k] / totalOutros;
          novo[k] = Math.max(0, novo[k] - excesso * proporcao);
        });
      }
    }
    setDivisaoCaixa(novo);
  };

  const [form, setForm] = useState<{ data: string; descricao: string; origem: Movimento['origem']; valor: number }>({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    origem: 'caixa',
    valor: 0,
  });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Movimento | null>(null);
  const [editForm, setEditForm] = useState<{ data: string; descricao: string; origem: Movimento['origem']; valor: number; suborigem?: 'reinvestimento' | 'caixa_loja' | 'salario' }>({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    origem: 'caixa',
    valor: 0,
  });

  const toTitleCase = (s: string) => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  const registrarSaida = async () => {
    if (!form.descricao.trim() || form.valor <= 0) return;
    try {
      setSaving(true);
      await addMov({
        data: new Date(`${form.data}T12:00:00`),
        descricao: toTitleCase(form.descricao.trim()),
        tipo: 'saida',
        origem: form.origem,
        suborigem: form.origem === 'caixa' ? ((form as any).suborigem || 'reinvestimento') : undefined,
        valor: form.valor,
      } as unknown as Movimento);
      setForm({ data: new Date().toISOString().split('T')[0], descricao: '', origem: 'caixa', valor: 0 });
    } finally {
      setSaving(false);
    }
  };

  const abrirEdicao = (m: Movimento) => {
    setEditing(m);
    setEditForm({
      data: new Date(m.data).toISOString().split('T')[0],
      descricao: m.descricao,
      origem: m.origem,
      valor: m.valor,
      suborigem: (m as any).suborigem,
    });
  };

  const salvarEdicao = async () => {
    if (!editing) return;
    if (!editForm.descricao.trim() || editForm.valor <= 0) return;
    await updateMov(editing.id, {
      data: new Date(`${editForm.data}T12:00:00`),
      descricao: toTitleCase(editForm.descricao.trim()),
      origem: editForm.origem,
      valor: editForm.valor,
      suborigem: editForm.origem === 'caixa' ? (editForm.suborigem || 'reinvestimento') : undefined,
    } as any);
    setEditing(null);
  };

  const excluirMov = async (m: Movimento) => {
    await removeMov(m.id);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <DollarSign className="h-6 w-6 mr-2 text-solarie-600" />
          Fluxo de Caixa
        </h2>
        <p className="text-gray-600 mt-2">Acompanhe entradas das vendas e registre saídas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Saldo Caixa</p>
              <p className="text-2xl font-bold text-green-600">{formatarMoeda(caixa.saldoCaixa)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Saldo Embalagem</p>
              <p className="text-2xl font-bold text-blue-600">{formatarMoeda(caixa.saldoEmbalagem)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <PlusCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <p className="text-2xl font-bold text-green-600">{formatarMoeda(caixa.totalVendas)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <MinusCircle className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Embalagem</p>
              <p className="text-2xl font-bold text-purple-600">{formatarMoeda(caixa.valorEmbalagem)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Lucro Total</p>
              <p className="text-2xl font-bold text-green-600">{formatarMoeda(caixa.lucroTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Saída</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <div className="relative">
                <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm(prev => ({ ...prev, data: e.target.value }))}
                  className="input-field pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
              <select
                value={form.origem}
                onChange={(e) => setForm(prev => ({ ...prev, origem: e.target.value as Movimento['origem'] }))}
                className="input-field"
              >
                <option value="caixa">Caixa</option>
                <option value="embalagem">Embalagem</option>
              </select>
            </div>
            {form.origem === 'caixa' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usar saldo de</label>
                <select
                  value={(form as any).suborigem || 'reinvestimento'}
                  onChange={(e) => setForm(prev => ({ ...(prev as any), suborigem: e.target.value as any }))}
                  className="input-field"
                >
                  <option value="reinvestimento">Reinvestimento</option>
                  <option value="caixa_loja">Caixa da Loja</option>
                  <option value="salario">Salário</option>
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm(prev => ({ ...prev, descricao: toTitleCase(e.target.value) }))}
                className="input-field"
                placeholder="Ex: Compra lote fornecedor X, Salário, Embalagens..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(e) => setForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                className="input-field"
              />
            </div>
          </div>
          <button
            onClick={registrarSaida}
            disabled={saving}
            className="mt-4 btn-primary flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Registrar Saída'}
          </button>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Movimentações</h3>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-200">
            {movimentosReg.length === 0 ? (
              <p className="text-sm text-gray-500">Sem movimentações registradas.</p>
            ) : (
              movimentosReg.map((m) => (
                <div key={m.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{m.descricao}</div>
                      <div className="text-xs text-gray-500">{new Date(m.data).toLocaleDateString('pt-BR')} • Origem: {m.origem}{m.origem==='caixa' && (m as any).suborigem ? ` (${(m as any).suborigem === 'caixa_loja' ? 'Caixa da Loja' : ((m as any).suborigem.charAt(0).toUpperCase() + (m as any).suborigem.slice(1))})` : ''}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-red-600">- {formatarMoeda(m.valor)}</span>
                      <button
                        onClick={() => abrirEdicao(m)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Editar"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => excluirMov(m)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Divisão do Saldo do Caixa */}
      <div className="card mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Divisão do Saldo do Caixa</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reinvestimento (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={divisaoCaixa.reinvestimento}
              onChange={(e) => ajustarDivisaoCaixa('reinvestimento', parseFloat(e.target.value) || 0)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caixa da Loja (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={divisaoCaixa.caixaLoja}
              onChange={(e) => ajustarDivisaoCaixa('caixaLoja', parseFloat(e.target.value) || 0)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salário (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={divisaoCaixa.salario}
              onChange={(e) => ajustarDivisaoCaixa('salario', parseFloat(e.target.value) || 0)}
              className="input-field"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <div className="text-gray-600">Reinvestimento</div>
            <div className="font-semibold text-green-700">{formatarMoeda(caixa.saldoCaixa * (divisaoCaixa.reinvestimento/100))}</div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-gray-600">Caixa da Loja</div>
            <div className="font-semibold text-blue-700">{formatarMoeda(caixa.saldoCaixa * (divisaoCaixa.caixaLoja/100))}</div>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded">
            <div className="text-gray-600">Salário</div>
            <div className="font-semibold text-purple-700">{formatarMoeda(caixa.saldoCaixa * (divisaoCaixa.salario/100))}</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">Total: {(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario).toFixed(0)}%</div>
      </div>

      {/* Modal editar movimentação */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Editar Movimentação</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <div className="relative">
                  <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="date"
                    value={editForm.data}
                    onChange={(e) => setEditForm(prev => ({ ...prev, data: e.target.value }))}
                    className="input-field pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                <select
                  value={editForm.origem}
                  onChange={(e) => setEditForm(prev => ({ ...prev, origem: e.target.value as Movimento['origem'] }))}
                  className="input-field"
                >
                  <option value="caixa">Caixa</option>
                  <option value="embalagem">Embalagem</option>
                </select>
              </div>
              {editForm.origem === 'caixa' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usar saldo de</label>
                  <select
                    value={editForm.suborigem || 'reinvestimento'}
                    onChange={(e) => setEditForm(prev => ({ ...prev, suborigem: e.target.value as any }))}
                    className="input-field"
                  >
                    <option value="reinvestimento">Reinvestimento</option>
                    <option value="caixa_loja">Caixa da Loja</option>
                    <option value="salario">Salário</option>
                  </select>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editForm.descricao}
                  onChange={(e) => setEditForm(prev => ({ ...prev, descricao: toTitleCase(e.target.value) }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.valor}
                  onChange={(e) => setEditForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                  className="input-field"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
              <button onClick={salvarEdicao} className="btn-primary">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FluxoCaixa;