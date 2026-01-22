import { useState, useEffect } from 'react';
import { X, Home, Calendar, User, FileText, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  address: string;
  city: string;
  state: string;
  closeDate: string;
  price: number;
  gci: number;
  side: 'Buyer' | 'Seller';
  status: 'Open' | 'Closed' | 'Pending' | 'Under Contract';
  transactionType: string;
  clientName?: string;
}

export type CardType = 'gci-ytd' | 'gci-l12m' | 'pending' | 'avg-deal' | 'buyer-ytd' | 'seller-ytd' | 'buyer-l12m' | 'seller-l12m';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col" data-testid="modal-transaction-details">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
          </p>
        </DialogHeader>

        {!loading && transactions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 py-4 border-y">
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
        )}

        <ScrollArea className="flex-1 -mx-6 px-6">
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
                className="mt-4 bg-[hsl(28,94%,54%)] hover:bg-[hsl(28,94%,44%)]"
              >
                Retry
              </Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Home className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="mt-3 text-muted-foreground">No transactions found for this period</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {transactions.map((transaction) => (
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
                        {transaction.clientName && (
                          <span>{transaction.clientName}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-semibold">
                        {formatCurrency(transaction.price)}
                      </p>
                      <p className="text-sm text-green-600">
                        GCI: {formatCurrency(transaction.gci)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
