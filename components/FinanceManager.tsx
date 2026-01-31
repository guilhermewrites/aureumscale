import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Search,
  FileText
} from 'lucide-react';
import { FinanceItem, InvoiceStatus, ChartViewType, RevenueDataPoint } from '../types';
import AnalyticsChart from './AnalyticsChart';

interface FinanceManagerProps {
  items: FinanceItem[];
  onAdd: (item: FinanceItem) => void;
  onUpdate: (item: FinanceItem) => void;
  onDelete: (id: string) => void;
  revenueChartData: RevenueDataPoint[];
}

const FinanceManager: React.FC<FinanceManagerProps> = ({ 
  items, 
  onAdd, 
  onUpdate, 
  onDelete,
  revenueChartData
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Item State
  const [newItem, setNewItem] = useState<Partial<FinanceItem>>({
    amount: 0,
    clientName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    status: InvoiceStatus.SENT
  });

  // Calculate Metrics
  const totalRevenue = items
    .filter(i => i.status === InvoiceStatus.PAID)
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const pendingRevenue = items
    .filter(i => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.NOT_PAID)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const goal = 100000;
  const progress = Math.min((totalRevenue / goal) * 100, 100);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.clientName || !newItem.amount) return;

    onAdd({
      id: Date.now().toString(),
      amount: Number(newItem.amount),
      clientName: newItem.clientName,
      invoiceDate: newItem.invoiceDate || new Date().toISOString().split('T')[0],
      status: newItem.status as InvoiceStatus
    });

    setNewItem({
        amount: 0,
        clientName: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        status: InvoiceStatus.SENT
    });
    setIsAdding(false);
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch(status) {
        case InvoiceStatus.PAID: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        case InvoiceStatus.SENT: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        case InvoiceStatus.NOT_PAID: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        default: return 'text-gray-400';
    }
  };

  const filteredItems = items.filter(item => 
    item.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <p className="text-gray-500 text-sm font-medium mb-2 flex items-center gap-2">
                <DollarSign size={16} /> Total Revenue (Paid)
            </p>
            <h3 className="text-3xl font-bold text-white mb-2">${totalRevenue.toLocaleString()}</h3>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{progress.toFixed(1)}% of $100k Goal</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <p className="text-gray-500 text-sm font-medium mb-2 flex items-center gap-2">
                <Clock size={16} /> Outstanding Invoices
            </p>
            <h3 className="text-3xl font-bold text-white mb-2">${pendingRevenue.toLocaleString()}</h3>
            <p className="text-xs text-amber-500/80 mt-1">Pending payment</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group flex flex-col justify-center items-center text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <TrendingUp size={24} className="text-blue-400" />
            </div>
            <p className="text-white font-medium">Goal: $100,000 / mo</p>
            <p className="text-sm text-gray-500 mt-1">Keep pushing!</p>
        </div>
      </div>

      {/* Chart */}
      <AnalyticsChart 
        view={ChartViewType.REVENUE} 
        onChangeView={() => {}} 
        revenueData={revenueChartData} 
      />

      {/* Inputs / Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
         <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <h2 className="text-lg font-semibold text-white">Invoices & Payments</h2>
                <p className="text-sm text-gray-500">Manage your revenue streams.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-48 placeholder-gray-600"
                    />
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isAdding ? 'bg-gray-800 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                    }`}
                >
                    <Plus size={16} className={isAdding ? 'rotate-45 transition-transform' : 'transition-transform'} />
                    <span>{isAdding ? 'Cancel' : 'Add Invoice'}</span>
                </button>
            </div>
         </div>

         {/* Add Form */}
         {isAdding && (
            <div className="p-6 bg-gray-950/50 border-b border-gray-800 animate-in slide-in-from-top-2">
                <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                    <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs text-gray-500 font-medium ml-1">Client Name</label>
                        <input 
                            type="text" 
                            required
                            placeholder="e.g. Acme Corp"
                            value={newItem.clientName}
                            onChange={e => setNewItem({...newItem, clientName: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-gray-500 font-medium ml-1">Amount ($)</label>
                        <input 
                            type="number" 
                            required
                            placeholder="0.00"
                            value={newItem.amount || ''}
                            onChange={e => setNewItem({...newItem, amount: parseFloat(e.target.value)})}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-gray-500 font-medium ml-1">Status</label>
                        <select 
                            value={newItem.status}
                            onChange={e => setNewItem({...newItem, status: e.target.value as InvoiceStatus})}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                        >
                            {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <button 
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Add Entry
                    </button>
                </form>
            </div>
         )}

         {/* Table */}
         <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-950/30 text-xs uppercase tracking-wider text-gray-500 font-medium border-b border-gray-800">
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Date Sent</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <tr key={item.id} className="group hover:bg-gray-800/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500">
                                            <FileText size={14} />
                                        </div>
                                        {item.clientName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                                    {new Date(item.invoiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="relative group/status inline-block">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer ${getStatusColor(item.status)}`}>
                                            {item.status === InvoiceStatus.PAID && <CheckCircle2 size={12} />}
                                            {item.status === InvoiceStatus.NOT_PAID && <AlertCircle size={12} />}
                                            {item.status === InvoiceStatus.SENT && <Clock size={12} />}
                                            {item.status}
                                        </span>
                                        
                                        {/* Status Dropdown on Hover/Click could go here, for now just toggle cycle or simple display */}
                                        <select 
                                            value={item.status}
                                            onChange={(e) => onUpdate({...item, status: e.target.value as InvoiceStatus})}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        >
                                            {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-semibold text-white font-mono">
                                    ${item.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => {
                                            if(window.confirm('Delete this invoice?')) onDelete(item.id);
                                        }}
                                        className="text-gray-600 hover:text-rose-500 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                No invoices found. Add one to track your revenue.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default FinanceManager;