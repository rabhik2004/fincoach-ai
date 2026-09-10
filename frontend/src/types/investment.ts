export interface Investment {
  _id: string;
  user: string;
  symbol?: string;
  name: string;
  type: string;
  sector: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  exchange?: string;
  currency: string;
  isSIP: boolean;
  sipAmount?: number;
  sipDate?: number;
  notes?: string;
  goal?: string | null;
  // Virtuals from backend
  investedAmount: number;
  currentValue: number;
  absoluteReturn: number;
  percentReturn: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  absoluteReturn: number;
  percentReturn: number;
  totalHoldings: number;
  gainers: number;
  losers: number;
  byType: TypeAllocation[];
  bySector: SectorAllocation[];
  byGoal: GoalAllocation[];
  topGainers: Investment[];
  topLosers: Investment[];
}

export interface TypeAllocation {
  type: string;
  invested: number;
  current: number;
  count: number;
  allocation: number;
  return: number;
}

export interface SectorAllocation {
  sector: string;
  invested: number;
  current: number;
  count: number;
  allocation: number;
}

export interface GoalAllocation {
  goal: string;
  invested: number;
  current: number;
  count: number;
}
