import { Joia, ItemVenda } from '../types';

export const calcularFretePorPeca = (freteTotal: number, totalPecas: number): number => {
  if (totalPecas === 0) return 0;
  return freteTotal / totalPecas;
};

export const calcularCustoAquisicao = (
  precoPorPeca: number,
  fretePorPeca: number,
  custoEmbalagem: number,
  outrosCustos: number
): number => {
  return precoPorPeca + fretePorPeca + custoEmbalagem + outrosCustos;
};

// Preço de venda final com gross-up da taxa do cartão
// Passos:
// 1) custoBaseJoia = precoCompra + fretePorPeca + outrosCustos
// 2) precoComMargemSobreBase = custoBaseJoia * (1 + margem/100)
// 3) precoAntesTaxa = precoComMargemSobreBase + embalagemCusto
// 4) precoVendaFinal = precoAntesTaxa / (1 - (taxaCartaoEstimada/100))
export const calcularPrecoVendaFinal = (
  precoCompra: number,
  fretePorPeca: number,
  outrosCustos: number,
  margem: number,
  embalagemCusto: number,
  taxaCartaoEstimada: number
): number => {
  const custoBaseJoia = precoCompra + fretePorPeca + outrosCustos;
  const precoComMargemSobreBase = custoBaseJoia * (1 + margem / 100);
  const precoAntesTaxa = precoComMargemSobreBase + embalagemCusto;
  const taxaClamped = Math.max(0, Math.min(100, taxaCartaoEstimada));
  const divisor = 1 - (taxaClamped / 100);
  return divisor > 0 ? (precoAntesTaxa / divisor) : precoAntesTaxa;
};

export const calcularLucroEsperado = (
  precoVendaFinal: number,
  custoAquisicao: number
): number => {
  return precoVendaFinal - custoAquisicao;
};

export const calcularTotaisVenda = (itens: ItemVenda[]) => {
  const valorTotal = itens.reduce((total, item) => total + item.subtotal, 0);
  const lucroReal = itens.reduce((total, item) => {
    const lucroItem = (item.precoUnitario - item.joia.custoAquisicao) * item.quantidade;
    return total + lucroItem;
  }, 0);
  
  return { valorTotal, lucroReal };
};

export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const formatarData = (data: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(data);
};

export const formatarDataHora = (data: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(data);
};

export const calcularEstatisticasEstoque = (joias: Joia[]) => {
  const totalJoias = joias.length;
  const joiasDisponiveis = joias.filter(j => j.status === 'disponivel').length;
  const joiasVendidas = joias.filter(j => j.status === 'vendida').length;
  const valorInvestido = joias.reduce((total, joia) => total + (joia.custoAquisicao * joia.quantidade), 0);
  const valorEstoque = joias
    .filter(j => j.status === 'disponivel')
    .reduce((total, joia) => total + (joia.precoVendaFinal * joia.quantidade), 0);
  const lucroTotal = valorEstoque - valorInvestido;

  return {
    totalJoias,
    joiasDisponiveis,
    joiasVendidas,
    valorInvestido,
    valorEstoque,
    lucroTotal
  };
};

