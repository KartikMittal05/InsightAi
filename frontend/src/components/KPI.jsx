export default function KPI({ title, value }) {
  const getIcon = (title) => {
    if (title.toLowerCase().includes('revenue')) return '💰';
    if (title.toLowerCase().includes('customer')) return '👥';
    if (title.toLowerCase().includes('order') || title.toLowerCase().includes('avg')) return '🛍️';
    if (title.toLowerCase().includes('growth')) return '📈';
    return '📊';
  };

  return (
    <div className="glass rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-600 text-sm font-semibold uppercase tracking-wide">{title}</p>
        <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">{getIcon(title)}</span>
      </div>
      <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
        {value}
      </p>
      <div className="mt-3 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
    </div>
  )
}
