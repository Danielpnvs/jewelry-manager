export interface Joia {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  quantidade: number;
  material: string;
  fornecedor: string;
  dataCompra: Date;
  precoPorPeca: number;
  freteTotal: number;
  totalPecasCompra: number;
  fretePorPeca: number;
  custoEmbalagem: number;
  outrosCustos: number;
  margemLucro: number;
  taxaCredito: number;
  custoAquisicao: number;
  precoVendaFinal: number;
  lucroEsperado: number;
  status: 'disponivel' | 'vendida';
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemVenda {
  joiaId: string;
  joia: Joia;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Venda {
  id: string;
  nomeCliente: string;
  dataVenda: Date;
  formaPagamento: 'dinheiro' | 'credito' | 'debito' | 'pix' | 'transferencia';
  itens: ItemVenda[];
  valorTotal: number;
  lucroReal: number;
  createdAt: Date;
}

export interface RelatorioMensal {
  mes: string;
  ano: number;
  joiasVendidas: number;
  totalVendas: number;
  lucroTotal: number;
}

export interface EstatisticasEstoque {
  totalJoias: number;
  joiasDisponiveis: number;
  joiasVendidas: number;
  valorInvestido: number;
  valorEstoque: number;
  lucroTotal: number;
}

export interface LoteInvestimento {
  id: string;
  fornecedor: string;
  joias: Joia[];
  valorInvestido: number;
  valorVendido: number;
  lucroObtido: number;
  percentualVendido: number;
  divisaoLucro: {
    reinvestimento: number;
    reservaEmergencia: number;
    lucroLiquido: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FiltroRelatorio {
  dataInicio: string;
  dataFim: string;
  categoria: string;
  fornecedor: string;
}

export interface FiltroEstoque {
  codigo: string;
  nome: string;
  categoria: string;
  status: 'disponivel' | 'vendida' | 'todos';
  material: string;
  fornecedor: string;
}

export interface FiltroVendas {
  nomeCliente: string;
  dataInicio: string;
  dataFim: string;
  formaPagamento: string;
}