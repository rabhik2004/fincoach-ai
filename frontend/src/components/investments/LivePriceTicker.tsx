'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface MarketItem {
  symbol: string;
  name: string;
  price: number | null;
  changePct: number | null;
  change: number | null;
  currency: string;
  marketState: string;
}

interface LivePriceTickerProps {
  refreshInterval?: number; // ms, default 5 min
}

export default function LivePriceTicker({ refreshInterval = 5 * 60 * 1000 }: LivePriceTickerProps) {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMarket = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const { data } = await api.get('/prices/summary');
      setItems(data.data.filter((i: MarketItem) => i.price !== null));
      setLastUpdated(new Date());
    } catch {
      // Silently fail — ticker is non-critical
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(() => fetchMarket(), refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMarket, refreshInterval]);

  if (loading) {
    return (
      <div className="h-10 bg-gray-50 rounded-xl border border-gray-100 animate-pulse mb-6" />
    );
  }

  if (!items.length) return null;

  const formatPrice = (item: MarketItem) => {
    if (item.price === null) return '—';
    const prefix = item.currency === 'INR' ? '₹' : item.currency === 'USD' ? '$' : '';
    if (item.price >= 10000) return `${prefix}${(item.price / 1000).toFixed(1)}K`;
    return `${prefix}${item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex items-center gap-0 bg-gray-50 border border-gray-100 rounded-xl mb-6 overflow-hidden">
      {/* Live badge */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border-r border-gray-200 flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-semibold text-gray-500">Live</span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-0 min-w-max">
          {items.map((item, i) => {
            const isUp = (item.changePct || 0) >= 0;
            return (
              <div
                key={item.symbol}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border-r border-gray-100 last:border-r-0',
                  i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/50'
                )}
              >
                <span className="text-xs font-semibold text-gray-700 flex-shrink-0">{item.name}</span>
                <span className="text-xs font-bold text-gray-900">{formatPrice(item)}</span>
                {item.changePct !== null && (
                  <span className={cn('flex items-center gap-0.5 text-xs font-medium flex-shrink-0',
                    isUp ? 'text-green-600' : 'text-red-500'
                  )}>
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {isUp ? '+' : ''}{item.changePct.toFixed(2)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Refresh + time */}
      <div className="flex items-center gap-2 px-3 py-2 border-l border-gray-100 flex-shrink-0">
        {lastUpdated && (
          <span className="text-[10px] text-gray-300 hidden sm:block">
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={() => fetchMarket(true)}
          disabled={refreshing}
          className="text-gray-400 hover:text-gray-600 transition"
          title="Refresh prices"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
