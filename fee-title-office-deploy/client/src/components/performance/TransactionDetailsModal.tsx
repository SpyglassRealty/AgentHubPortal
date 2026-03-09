import { useState, useEffect } from 'react';
import { X, Home, Calendar, User, FileText, Loader2, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  address: string;
  city: string;
  state: string;
  closeDate: string;
  listDate?: string;
  price: number;
  gci: number;
  side: 'Buyer' | 'Seller';
  status: 'Open' | 'Closed' | 'Pending' | 'Under Contract';
  transactionType: string;
  clientName?: string;
  daysToClose?: number;
  year?: number;
}

export type CardType = 'gci-ytd' | 'gci-l12m' | 'pending' | 'avg-deal' | 'buyer-ytd' | 'seller-ytd' | 'buyer-l12m' | 'seller-l12m' | 'avg-sale-price' | 'avg-days-close' | 'yoy-comparison';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cardType: CardType;
}

export function TransactionDetailsModal({ 
  isOpen, 
  onClose, 
  title, 
  cardType 
}: TransactionDetailsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, cardType]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '/api/rezen/transactions';
      let params = new URLSearchParams();
      
      switch (cardType) {
        case 'gci-ytd':
          params.set('period', 'ytd');
          break;
        case 'buyer-ytd':
          params.set('period', 'ytd');
          params.set('side', 'buyer');
          break;
        case 'seller-ytd':
          params.set('period', 'ytd');
          params.set('side', 'seller');
          break;
        case 'gci-l12m':
        case 'avg-deal':
          params.set('period', 'l12m');
          break;
        case 'buyer-l12m':
          params.set('period', 'l12m');
          params.set('side', 'buyer');
          break;
        case 'seller-l12m':
          params.set('period', 'l12m');
          params.set('side', 'seller');
          break;
        case 'pending':
          params.set('status', 'pending');
          break;
        case 'avg-sale-price':
          params.set('period', 'l12m');
          params.set('status', 'closed');
          break;
        case 'avg-days-close':
          params.set('period', 'l12m');
          params.set('status', 'closed');
          params.set('includeDaysToClose', 'true');
          break;
        case 'yoy-comparison':
          params.set('period', 'yoy');
          break;
      }
      
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'closed':
        return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'pending':
      case 'under contract':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'open':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  const totalGCI = transactions.reduce((sum, t) => sum + (t.gci || 0), 0);
  const totalVolume = transactions.reduce((sum, t) => sum + (t.price || 0), 0);
  const avgDealSize = transactions.length > 0 ? totalVolume / transactions.length : 0;
  
  // Calculate average days to close for avg-days-close card type
  const transactionsWithDays = transactions.filter(t => t.daysToClose !== undefined && t.daysToClose !== null);
  const avgDaysToClose = transactionsWithDays.length > 0 
    ? Math.round(transactionsWithDays.reduce((sum, t) => sum + (t.daysToClose || 0), 0) / transactionsWithDays.length)
    : 0;

  // YoY calculations
  const currentYear = new Date().getFullYear();
  const currentYearTransactions = transactions.filter(t => t.year === currentYear);
  const lastYearTransactions = transactions.filter(t => t.year === currentYear - 1);
  const currentYearGCI = currentYearTransactions.reduce((sum, t) => sum + (t.gci || 0), 0);
  const lastYearGCI = lastYearTransactions.reduce((sum, t) => sum + (t.gci || 0), 0);
  const yoyChangePercent = lastYearGCI > 0 ? ((currentYearGCI - lastYearGCI) / lastYearGCI) * 100 : 0;

  // Get summary text based on card type
  const getSummaryText = () => {
    switch (cardType) {
      case 'avg-sale-price':
        return `Average calculated from ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`;
      case 'avg-days-close':
        return `Average ${avgDaysToClose} days across ${transactionsWithDays.length} transaction${transactionsWithDays.length !== 1 ? 's' : ''}`;
      case 'yoy-comparison':
        return `Comparing ${currentYearTransactions.length} deals (${currentYear}) vs ${lastYearTransactions.length} deals (${currentYear - 1})`;
      default:
        return `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} found`;
    }
  };

  // Render different summary stats based on card type
  const renderSummaryStats = () => {
    if (cardType === 'yoy-comparison') {
      return (
        <div className="space-y-4 py-4 border-y flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">{currentYear} YTD</p>
              <p className="text-2xl font-bold">{formatCurrency(currentYearGCI)}</p>
              <p className="text-xs text-muted-foreground">{currentYearTransactions.length} deals</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">{currentYear - 1} YTD</p>
              <p className="text-2xl font-bold">{formatCurrency(lastYearGCI)}</p>
              <p className="text-xs text-muted-foreground">{lastYearTransactions.length} deals</p>
            </div>
          </div>
          <div className={`text-center p-3 rounded-lg ${yoyChangePercent >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className="flex items-center justify-center gap-2">
              {yoyChangePercent >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <p className={`text-lg font-semibold ${yoyChangePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {yoyChangePercent >= 0 ? '+' : ''}{yoyChangePercent.toFixed(0)}% compared to last year
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    if (cardType === 'avg-days-close') {
      return (
        <div className="grid grid-cols-3 gap-4 py-4 border-y flex-shrink-0">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Avg Days to Close</p>
            <p className="text-lg font-semibold text-[#EF4923]">{avgDaysToClose} days</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Transactions</p>
            <p className="text-lg font-semibold">{transactionsWithDays.length}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Volume</p>
            <p className="text-lg font-semibold">{formatCurrency(totalVolume)}</p>
          </div>
        </div>
      );
    }
    
    if (cardType === 'avg-sale-price') {
      return (
        <div className="grid grid-cols-3 gap-4 py-4 border-y flex-shrink-0">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Average Sale Price</p>
            <p className="text-lg font-semibold text-[#EF4923]">{formatCurrency(avgDealSize)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Volume</p>
            <p className="text-lg font-semibold">{formatCurrency(totalVolume)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total GCI</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(totalGCI)}</p>
          </div>
        </div>
      );
    }

    // Default summary stats
    return (
      <div className="grid grid-cols-3 gap-4 py-4 border-y flex-shrink-0">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total GCI</p>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(totalGCI)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Volume</p>
          <p className="text-lg font-semibold">{formatCurrency(totalVolume)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Avg Deal Size</p>
          <p className="text-lg font-semibold">{formatCurrency(avgDealSize)}</p>
        </div>
      </div>
    );
  };

  // Render transaction card with enhanced display based on card type
  const renderTransactionCard = (transaction: Transaction) => {
    const daysToClose = transaction.daysToClose ?? (
      transaction.listDate && transaction.closeDate
        ? Math.round((new Date(transaction.closeDate).getTime() - new Date(transaction.listDate).getTime()) / (1000 * 60 * 60 * 24))
        : null
    );

    return (
      <div
        key={transaction.id}
        className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors"
        data-testid={`transaction-${transaction.id}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Home className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-medium">
                {transaction.address}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                {transaction.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {transaction.city}, {transaction.state}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(transaction.closeDate)}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {transaction.side} Side
              </span>
              {/* Show Days to Close for avg-days-close card type */}
              {cardType === 'avg-days-close' && daysToClose !== null && (
                <span className="flex items-center gap-1 text-[#EF4923] font-medium">
                  <Clock className="w-3 h-3" />
                  {daysToClose} days
                </span>
              )}
              {transaction.clientName && (
                <span>{transaction.clientName}</span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            {/* Emphasize sale price for avg-sale-price card type */}
            <p className={`font-semibold ${cardType === 'avg-sale-price' ? 'text-lg text-[#EF4923]' : ''}`}>
              {formatCurrency(transaction.price)}
            </p>
            <p className="text-sm text-green-600">
              GCI: {formatCurrency(transaction.gci)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0" data-testid="modal-transaction-details">
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {getSummaryText()}
            </p>
          </DialogHeader>
        </div>

        {/* Summary Stats Bar - Fixed */}
        {!loading && transactions.length > 0 && (
          <div className="px-6">
            {renderSummaryStats()}
          </div>
        )}

        {/* Scrollable Transaction List */}
        <div 
          className="flex-1 overflow-y-auto px-6 min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40"
          style={{
            scrollBehavior: 'smooth'
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="mt-3 text-red-500">{error}</p>
              <Button
                onClick={fetchTransactions}
                className="mt-4 bg-[#EF4923] hover:bg-[#D4401F]"
              >
                Retry
              </Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Home className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="mt-3 text-muted-foreground">No transactions found for this period</p>
            </div>
          ) : cardType === 'yoy-comparison' ? (
            <div className="space-y-6 py-4">
              {/* Current Year Transactions */}
              {currentYearTransactions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                    {currentYear} Transactions ({currentYearTransactions.length})
                  </h4>
                  {currentYearTransactions.map((transaction) => renderTransactionCard(transaction))}
                </div>
              )}
              
              {/* Last Year Transactions */}
              {lastYearTransactions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                    {currentYear - 1} Transactions ({lastYearTransactions.length})
                  </h4>
                  {lastYearTransactions.map((transaction) => renderTransactionCard(transaction))}
                </div>
              )}
              
              {transactions.length > 5 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  — End of {transactions.length} transactions —
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {transactions.map((transaction) => renderTransactionCard(transaction))}
              
              {/* Scroll indicator when list is long */}
              {transactions.length > 5 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  — End of {transactions.length} transactions —
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
