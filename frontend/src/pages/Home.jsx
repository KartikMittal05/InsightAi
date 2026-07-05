import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Predictive AI on your CSV",
    copy: "Upload raw transactions and get RFM, CLV, and churn risk without any modeling work.",
  },
  {
    title: "Human-ready recommendations",
    copy: "Lifecycle playbooks, product affinities, and alerts you can drop into campaigns today.",
  },
  {
    title: "Built for modern teams",
    copy: "Opinionated defaults, clear visual hierarchy, and exportable insights for GTM and CX.",
  },
];

const steps = [
  "Upload your order CSV",
  "Auto-clean + segment",
  "Activate campaigns with AI guidance",
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-96 h-96 bg-gradient-to-br from-blue-400/30 to-indigo-500/20 rounded-full blur-3xl -top-20 -left-20 animate-pulse" style={{animationDuration: '4s'}} />
          <div className="absolute w-[32rem] h-[32rem] bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl bottom-0 right-0 animate-pulse" style={{animationDuration: '5s', animationDelay: '1s'}} />
          <div className="absolute w-80 h-80 bg-gradient-to-br from-cyan-300/25 to-blue-400/20 rounded-full blur-3xl top-1/3 -right-20 animate-pulse" style={{animationDuration: '6s', animationDelay: '2s'}} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12 relative">
          <div className="pill mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50 hover:shadow-lg hover:scale-105">🤖 AI Customer Intelligence</div>
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Turn every transaction into a playbook
                </span>
                <span className="block mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  your team can run.
                </span>
              </h1>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                InsightAI ingests your order history and surfaces segments, behaviors, alerts, and product rules so
                you can act with confidence today—not after a 6-week BI sprint.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                {steps.map((step, idx) => (
                  <span key={step} className="pill bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50 hover:shadow-md hover:scale-105" style={{animationDelay: `${idx * 100}ms`}}>
                    {step}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <Link
                  to="/upload"
                  className="px-7 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 font-semibold"
                >
                  Upload your data
                </Link>
                <Link
                  to="/dashboard"
                  className="px-7 py-4 glass text-slate-800 rounded-xl hover:shadow-lg transition-all duration-300 font-semibold border border-slate-200/50"
                >
                  See live dashboard
                </Link>
              </div>
              <div className="flex items-center text-sm text-slate-500 gap-2 mt-4">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                <span>Demo data preloaded</span>
              </div>
            </div>
            <div className="glass rounded-2xl p-8 border border-slate-200/50 shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="pill bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border border-purple-200/50">🎯 RFM segmentation</div>
                <span className="text-sm text-slate-500">Last 30 days</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {["Champions", "Loyal", "At Risk", "Hibernating"].map((seg, idx) => (
                  <div key={seg} className="card shadow-md border-slate-200/50 animate-rise hover:shadow-xl hover:-translate-y-1" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="text-sm text-slate-500 font-medium">{seg}</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">{Math.floor(Math.random() * 45) + 10}%</div>
                    <div className="text-xs text-emerald-600 mt-2 font-semibold flex items-center gap-1">
                      <span>↗</span> Auto-prioritized
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 rounded-xl text-sm text-slate-700 flex items-center gap-3">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                <span>Upload your CSV to replace demo data with live insights.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {highlights.map((item, idx) => (
            <div
              key={item.title}
              className="card glass border border-slate-200/50 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
              style={{ animation: "rise 520ms ease", animationDelay: `${idx * 60}ms` }}
            >
              <div className="text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">{item.title}</div>
              <p className="text-slate-600 text-sm leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 glass rounded-3xl p-8 lg:p-10 shadow-2xl border border-slate-200/50">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="pill bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200/50 hover:shadow-md hover:scale-105">✅ Marketing ready</div>
            <div className="pill bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50 hover:shadow-md hover:scale-105">💰 Sales ready</div>
            <div className="pill bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 border border-sky-200/50 hover:shadow-md hover:scale-105">🌟 CX ready</div>
          </div>
          <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-6 border border-slate-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="pill bg-white shadow-sm border-slate-200">🚨 Alerts</div>
                <span className="text-xs text-slate-500 font-medium">Auto-prioritized</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">•</span><span>2.4K at-risk customers need win-back within 7 days.</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">•</span><span>New loyal segment grew 18% WoW after last campaign.</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-600 font-bold">•</span><span>High-value churners prefer weekends; retarget Fri/Sat.</span></li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl p-6 border border-slate-200/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="pill bg-white shadow-sm border-slate-200">🚀 Lifecycle plays</div>
                <span className="text-xs text-slate-500 font-medium">Ready to activate</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-purple-600 font-bold">•</span><span>Champion VIP tier with new product drops + concierge.</span></li>
                <li className="flex items-start gap-2"><span className="text-purple-600 font-bold">•</span><span>Cross-sell bundles: coffee + mug + filters (+1.3 AOV).</span></li>
                <li className="flex items-start gap-2"><span className="text-purple-600 font-bold">•</span><span>Replenish reminders for consumables at 27-day cadence.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
