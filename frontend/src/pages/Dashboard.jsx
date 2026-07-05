import { useEffect, useState } from "react";
import axios from "axios";
import { SegmentPie, RevenueBar, TrendLine, BehaviorBar, LifecycleBar, RFMScatter } from "../components/Charts";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const demoData = {
  kpis: {
    total_revenue: 3200000,
    total_customers: 24800,
    avg_order_value: 124.5,
    growth_rate: 12,
  },
  alerts: {
    high_value_retention: { description: "Champions responding to VIP drops; keep cadence weekly.", percentage: 18 },
    churn_risk: { description: "At-risk cohort is delaying repeat purchase beyond 45 days.", percentage: 9 },
    cross_sell: { description: "Bundles with accessories lift AOV by $18.3.", percentage: 22 },
    reengagement: { description: "Hibernating buyers are price-sensitive; test incentive.", percentage: 14 },
  },
  recommendations: [
    {
      title: "Activate Champion VIP tier",
      priority: "High",
      description: "Early access drops + concierge chat for top 5% CLV.",
      revenue: "$185K",
      confidence: 92,
    },
    {
      title: "Win-back at-risk consumers",
      priority: "High",
      description: "Deploy limited-time bundle offer at day 42 after last order.",
      revenue: "$96K",
      confidence: 81,
    },
    {
      title: "Cross-sell starter to pro",
      priority: "Medium",
      description: "Pair entry product with premium add-ons in cart/CRM flows.",
      revenue: "$63K",
      confidence: 77,
    },
    {
      title: "Lifecycle nurture series",
      priority: "Medium",
      description: "Personalized education for new buyers; drive week-2 repeat.",
      revenue: "$41K",
      confidence: 70,
    },
  ],
  rfmSegments: {
    Champions: { recency: "1-14 days", frequency: "5+", value: "$250+" },
    Loyal: { recency: "15-30 days", frequency: "3-4", value: "$150-250" },
    "At Risk": { recency: "45-90 days", frequency: "2-3", value: "$120" },
    Hibernating: { recency: "90+ days", frequency: "1-2", value: "$80" },
    Potential: { recency: "30-60 days", frequency: "2-3", value: "$110" },
  },
  productRules: [
    { from: "Coffee beans", to: "Pour over kit", description: "Beans buyer graduates to brew kit", confidence: 72, lift: 1.9 },
    { from: "Headphones", to: "Amp + DAC", description: "Audiophiles bundle electronics", confidence: 65, lift: 2.1 },
    { from: "Planner", to: "Gel pens", description: "Stationery bundle improves repeat", confidence: 58, lift: 1.6 },
  ],
  crossSell: [
    {
      name: "Champions",
      products: ["VIP drop", "Limited bundle", "Concierge"],
      revenue_potential: "$185K",
      conversion_rate: 22,
    },
    {
      name: "Loyal",
      products: ["Subscribe", "Bundles", "Refill"],
      revenue_potential: "$92K",
      conversion_rate: 15,
    },
    {
      name: "At Risk",
      products: ["Win-back", "Coupon", "Free ship"],
      revenue_potential: "$63K",
      conversion_rate: 11,
    },
  ],
  analytics: {
    segment_counts: { Champions: 28, Loyal: 35, "At Risk": 18, Hibernating: 12, Potential: 7 },
    revenue_by_segment: { Champions: 43, Loyal: 27, "At Risk": 14, Hibernating: 6, Potential: 10 },
    trend_labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    revenue_trend: [220, 245, 260, 275, 300, 318, 335, 355, 371],
    customer_trend: [160, 170, 180, 188, 205, 214, 223, 230, 244],
    behavior_labels: ["Weekday", "Weekend"],
    behavior_values: [68, 32],
    lifecycle_labels: ["New", "Active", "At Risk", "Churn", "Reactivated"],
    lifecycle_values: [22, 41, 16, 9, 12],
    rfm_customers: [
      { CustomerID: "C001", Frequency: 8, Monetary: 450 },
      { CustomerID: "C002", Frequency: 15, Monetary: 820 },
      { CustomerID: "C003", Frequency: 3, Monetary: 180 },
      { CustomerID: "C004", Frequency: 12, Monetary: 650 },
      { CustomerID: "C005", Frequency: 6, Monetary: 320 },
      { CustomerID: "C006", Frequency: 20, Monetary: 1200 },
      { CustomerID: "C007", Frequency: 4, Monetary: 220 },
      { CustomerID: "C008", Frequency: 10, Monetary: 580 },
      { CustomerID: "C009", Frequency: 2, Monetary: 120 },
      { CustomerID: "C010", Frequency: 18, Monetary: 950 },
      { CustomerID: "C011", Frequency: 7, Monetary: 410 },
      { CustomerID: "C012", Frequency: 14, Monetary: 780 },
      { CustomerID: "C013", Frequency: 5, Monetary: 290 },
      { CustomerID: "C014", Frequency: 11, Monetary: 620 },
      { CustomerID: "C015", Frequency: 9, Monetary: 490 },
    ],
  },
};

// Helper function to generate alerts based on segment data
const generateAlerts = (segmentCounts, revenueBySeg) => {
  const alerts = {};
  const total = Object.values(segmentCounts || {}).reduce((sum, v) => sum + (v || 0), 0) || 1;
  
  // Champions retention alert
  const championsCount = segmentCounts?.Champions || 0;
  const championsPercent = Math.round((championsCount / total) * 100);
  alerts.high_value_retention = {
    description: `${championsCount} Champions in portfolio; maintain VIP engagement quarterly.`,
    percentage: championsPercent,
  };
  
  // At Risk churn alert
  const atRiskCount = segmentCounts?.["At Risk"] || 0;
  const atRiskPercent = Math.round((atRiskCount / total) * 100);
  alerts.churn_risk = {
    description: `${atRiskCount} at-risk customers need intervention beyond 45 days.`,
    percentage: atRiskPercent,
  };
  
  // Cross-sell opportunity
  const loyalCount = segmentCounts?.Loyal || 0;
  const loyalPercent = Math.round((loyalCount / total) * 100);
  alerts.cross_sell = {
    description: `${loyalCount} loyal customers ready for bundle upsells.`,
    percentage: loyalPercent,
  };
  
  // Re-engagement for hibernating
  const hibernatingCount = segmentCounts?.Hibernating || 0;
  const hibernatingPercent = Math.round((hibernatingCount / total) * 100);
  alerts.reengagement = {
    description: `${hibernatingCount} hibernating buyers need reactivation campaign.`,
    percentage: hibernatingPercent,
  };
  
  return alerts;
};

// Helper function to generate product suggestions based on segment
const generateProductSuggestions = (segmentName) => {
  const segmentLower = segmentName.toLowerCase();
  
  if (segmentLower.includes("champion") || segmentLower.includes("premium")) {
    return ["VIP drop", "Limited bundle", "Concierge"];
  }
  if (segmentLower.includes("loyal")) {
    return ["Subscribe", "Bundles", "Refill"];
  }
  if (segmentLower.includes("risk") || segmentLower.includes("churn")) {
    return ["Win-back", "Coupon", "Free ship"];
  }
  if (segmentLower.includes("potential")) {
    return ["Starter pack", "Bundle deal", "Tutorial"];
  }
  if (segmentLower.includes("hibernat")) {
    return ["Re-engagement", "Special offer", "Loyalty reward"];
  }
  return ["Featured item", "Bundle", "Exclusive deal"];
};

const buildFeatureInsightCards = (featureImportance) => {
  if (!featureImportance || Object.keys(featureImportance).length === 0) return [];

  const featureEntries = Object.entries(featureImportance);

  const getImpact = (importance) => {
    if (importance >= 20) return "high impact";
    if (importance >= 10) return "medium impact";
    return "low impact";
  };

  const getIcon = (featureName) => {
    const name = featureName.toLowerCase();
    if (name.includes("order") || name.includes("aov") || name.includes("value")) return "🛒";
    if (name.includes("transaction") || name.includes("frequency")) return "🔁";
    if (name.includes("recency") || name.includes("days")) return "⏱️";
    if (name.includes("diversity") || name.includes("category") || name.includes("product")) return "🧩";
    if (name.includes("discount") || name.includes("coupon")) return "🏷️";
    return "📊";
  };

  const getAction = (featureName) => {
    const name = featureName.toLowerCase();
    if (name.includes("order value") || name.includes("avg order") || name.includes("aov")) {
      return "Raise AOV with bundles, upsells, and free-shipping thresholds.";
    }
    if (name.includes("transaction") || name.includes("frequency")) {
      return "Encourage repeat orders with loyalty points and subscription offers.";
    }
    if (name.includes("recency") || name.includes("days")) {
      return "Trigger win-back flows when customers go inactive.";
    }
    if (name.includes("diversity") || name.includes("category") || name.includes("product")) {
      return "Promote cross-sell bundles to expand product adoption.";
    }
    if (name.includes("discount") || name.includes("coupon")) {
      return "Optimize discount timing to protect margin while lifting conversion.";
    }
    return "Monitor this driver and tune campaigns to improve performance.";
  };

  return featureEntries.slice(0, 4).map(([feature, data]) => {
    const importance = Number(data?.importance || 0);
    return {
      title: feature,
      contribution: `${importance}% contribution`,
      impact: getImpact(importance),
      description: `${feature} significantly influences customer value (${importance}% contribution).`,
      action: getAction(feature),
      icon: getIcon(feature),
    };
  });
};

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [rfmSegments, setRfmSegments] = useState({});
  const [productRules, setProductRules] = useState([]);
  const [crossSell, setCrossSell] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [xaiGlobal, setXaiGlobal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bundledRules, setBundledRules] = useState([]);
  const [launchedSegments, setLaunchedSegments] = useState([]);
  const [notification, setNotification] = useState(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [xaiLocal, setXaiLocal] = useState(null);
  const [plotUrl, setPlotUrl] = useState(null);
  const [plotType, setPlotType] = useState("waterfall");
  const [plotLoading, setPlotLoading] = useState(false);
  const [plotError, setPlotError] = useState(null);
  const [datasetType, setDatasetType] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [aiInsights, setAiInsights] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const featureInsightCards = aiInsights?.feature_insights?.length
    ? aiInsights.feature_insights
    : buildFeatureInsightCards(aiInsights?.feature_importance);

  const strategicRecommendations = aiInsights?.strategic_recommendations?.length
    ? aiInsights.strategic_recommendations
    : [];

  const growthSignals = aiInsights?.growth_signals?.length
    ? aiInsights.growth_signals
    : [];

  const growthRateValue = Number(kpis?.growth_rate);
  const growthRateIsValid = Number.isFinite(growthRateValue);
  const growthRateDisplay = growthRateIsValid
    ? `${Math.round(growthRateValue * 100) / 100}%`
    : "N/A";

  const segmentCounts = analytics?.segment_counts || {};
  const segmentTotal = Object.values(segmentCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const segmentPercentages = Object.fromEntries(
    Object.entries(segmentCounts).map(([name, value]) => {
      const percent = segmentTotal ? (Number(value) || 0) / segmentTotal * 100 : 0;
      return [name, percent];
    })
  );
  const segmentRevenue = analytics?.revenue_by_segment || {};
  const segmentRevenueTotal = Object.values(segmentRevenue).reduce((sum, value) => sum + (Number(value) || 0), 0);

  // Auto-refresh data when returning to dashboard
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [location.pathname]);

  const handleManualRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Call endpoints with individual timeouts and cache-busting
        const timeout = 10000; // 10 second timeout per request
        const cacheBust = `t=${Date.now()}`; // Add timestamp to bypass cache
        
        const [kpiRes, rfmRes, churnRes, recRes, analyticsRes, xaiRes, datasetTypeRes] = await Promise.all([
          axios.get(`${API_URL}/kpis?${cacheBust}`, { timeout }).catch(err => { console.error('KPIs failed:', err.message); return null; }),
          axios.get(`${API_URL}/rfm-segments?${cacheBust}`, { timeout }).catch(err => { console.error('RFM failed:', err.message); return null; }),
          axios.get(`${API_URL}/churn-prediction?${cacheBust}`, { timeout }).catch(err => { console.error('Churn failed:', err.message); return null; }),
          axios.get(`${API_URL}/product-recommendations?${cacheBust}`, { timeout }).catch(err => { console.error('Recommendations failed:', err.message); return null; }),
          axios.get(`${API_URL}/analyze?${cacheBust}`, { timeout }).catch(err => { console.error('Analyze failed:', err.message); return null; }),
          axios.get(`${API_URL}/explain/global?${cacheBust}`, { timeout }).catch(err => { console.error('XAI failed:', err.message); return null; }),
          axios.get(`${API_URL}/dataset-type?${cacheBust}`, { timeout }).catch(err => { console.error('Dataset type failed:', err.message); return null; }),
        ]);
        
        // Fetch AI insights separately (non-blocking, with better error handling)
        axios.get(`${API_URL}/ai-insights?${cacheBust}`, { timeout })
          .then(res => {
            if (res?.data && !res.data.error) {
              // Validate that key properties exist before setting
              if (res.data.summary_kpis && res.data.segment_metrics !== undefined) {
                setAiInsights(res.data);
                console.log('✓ AI Insights loaded:', {
                  kpis: res.data.summary_kpis,
                  segments: res.data.segment_metrics?.length || 0,
                  insights: res.data.business_insights?.length || 0,
                  features: Object.keys(res.data.feature_importance || {}).length
                });
              } else {
                console.warn('AI Insights missing required properties:', res.data);
                setAiInsights(null);
              }
            } else {
              console.warn('AI Insights returned error:', res?.data?.error);
              setAiInsights(null);
            }
          })
          .catch(err => {
            console.error('AI Insights request failed:', err.message);
            // Fallback to old endpoint if new one fails
            console.log('Attempting fallback endpoint...');
            axios.get(`${API_URL}/explain/insights?${cacheBust}`, { timeout })
              .then(res => {
                if (res?.data && !res.data.error) {
                  setAiInsights(res.data);
                  console.log('✓ AI Insights loaded from fallback endpoint');
                } else {
                  setAiInsights(null);
                }
              })
              .catch((fallbackErr) => {
                console.error('Fallback endpoint also failed:', fallbackErr.message);
                setAiInsights(null);
              });
          });

        // Set dataset type
        setDatasetType(datasetTypeRes?.data || null);

        // Set KPIs
        setKpis(kpiRes?.data || demoData.kpis);

        // Set RFM Segments
        setRfmSegments(rfmRes?.data?.segments || rfmRes?.data || demoData.rfmSegments);

        // Generate dynamic alerts from segment data
        const segmentPayload = rfmRes?.data?.segments || rfmRes?.data;
        const alertSegmentCounts = analyticsRes?.data?.segment_counts
          || segmentPayload?.segment_counts
          || demoData.analytics.segment_counts;
        const alertRevenueBySegment = analyticsRes?.data?.revenue_by_segment
          || segmentPayload?.revenue_by_segment
          || demoData.analytics.revenue_by_segment;
        const dynamicAlerts = generateAlerts(alertSegmentCounts, alertRevenueBySegment);
        setAlerts(dynamicAlerts);

        // Transform and set Recommendations
        const apiRecommendations = (recRes?.data?.recommendations || []).map((r, idx) => {
          let conf = Number(r.confidence || 0);
          
          // Normalize confidence to 0-100 range
          if (conf > 1 && conf <= 100) {
            // Already a percentage, good
          } else if (conf > 100) {
            // Likely a decimal represented as percentage already, divide by 100
            conf = conf / 100;
          }
          // Now conf should be 0-1, convert to percentage
          const confPercentage = Math.round(conf <= 1 ? conf * 100 : conf);
          
          // Create meaningful recommendation title - take first 2-3 words only
          const cleanProductName = (name) => {
            if (!name) return 'Product';
            // Split by common delimiters and take first few words
            const words = name.split(/[\s—\-]/);
            return words.slice(0, 3).join(' ').trim();
          };
          
          const fromProduct = cleanProductName(r.from_product);
          const toProduct = cleanProductName(r.to_product);
          const title = `Bundle ${fromProduct} with ${toProduct}`;
          
          // Priority based on ranking position and confidence combined
          // Top 2 items or confidence > 50% = High
          const priority = (idx < 2 || confPercentage > 50) ? "High" : "Medium";
          
          return {
            title: title,
            priority: priority,
            description: `Frequently purchased together. Confidence: ${confPercentage}%`,
            revenue: `$${Math.round(confPercentage * 30)}K`,
            confidence: confPercentage,
          };
        });
        setRecommendations(apiRecommendations.length ? apiRecommendations : demoData.recommendations);

        // Build analytics from API with graceful fallbacks
        if (analyticsRes?.data || rfmRes?.data) {
          const segmentPayload = rfmRes?.data?.segments || rfmRes?.data;
          
          // Generate synthetic trend data if not available (for RFM-only datasets)
          let trendLabels = analyticsRes?.data?.trends?.labels || [];
          let revenueTrend = analyticsRes?.data?.trends?.revenue_trend || [];
          let customerTrend = analyticsRes?.data?.trends?.customer_trend || [];
          
          if (trendLabels.length === 0 && segmentPayload?.revenue_by_segment) {
            // Generate last 9 months of trends from segment data
            trendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
            const totalRevenue = Object.values(segmentPayload.revenue_by_segment || {})
              .reduce((sum, val) => sum + (Number(val) || 0), 0);
            const totalCustomers = Object.values(segmentPayload.segment_counts || {})
              .reduce((sum, val) => sum + (Number(val) || 0), 0);
            
            // Create realistic trend with growth
            revenueTrend = Array.from({ length: 9 }, (_, i) => 
              Math.round(totalRevenue * (0.7 + (i / 9) * 0.3))
            );
            customerTrend = Array.from({ length: 9 }, (_, i) => 
              Math.round(totalCustomers * (0.6 + (i / 9) * 0.4))
            );
          }
          
          const transformedAnalytics = {
            ...(analyticsRes?.data || {}),
            trend_labels: trendLabels.length > 0 ? trendLabels : demoData.analytics.trend_labels,
            revenue_trend: revenueTrend.length > 0 ? revenueTrend : demoData.analytics.revenue_trend,
            customer_trend: customerTrend.length > 0 ? customerTrend : demoData.analytics.customer_trend,
            segment_counts: segmentPayload?.segment_counts || analyticsRes?.data?.segment_counts || demoData.analytics.segment_counts,
            revenue_by_segment: segmentPayload?.revenue_by_segment || analyticsRes?.data?.revenue_by_segment || demoData.analytics.revenue_by_segment,
            behavior_labels: analyticsRes?.data?.behavior_labels || demoData.analytics.behavior_labels,
            behavior_values: analyticsRes?.data?.behavior_values || demoData.analytics.behavior_values,
            lifecycle_labels: analyticsRes?.data?.lifecycle_labels || demoData.analytics.lifecycle_labels,
            lifecycle_values: analyticsRes?.data?.lifecycle_values || demoData.analytics.lifecycle_values,
            rfm_customers: segmentPayload?.customers || analyticsRes?.data?.rfm_customers || demoData.analytics.rfm_customers,
          };
          setAnalytics(transformedAnalytics);
        } else {
          setAnalytics(demoData.analytics);
        }

        const apiProductRules = (recRes?.data?.recommendations || []).map((r) => {
          const conf = Number(r.confidence || 0);
          return {
            from: r.from_product || r.from || 'Product A',
            to: r.to_product || r.to || 'Product B',
            description: r.description || 'Frequently purchased together',
            confidence: Math.round(conf <= 1 ? conf * 100 : conf),
            lift: Number(r.lift || 1).toFixed ? Number(r.lift || 1).toFixed(1) : r.lift,
          };
        });
        setProductRules(apiProductRules.length ? apiProductRules : demoData.productRules);
        
        // Transform RFM segments into cross-sell opportunities
        const apiCrossSell = [];
        const crossSellCounts = segmentPayload?.segment_counts
          || analyticsRes?.data?.segment_counts
          || demoData.analytics.segment_counts;
        const crossSellRevenue = segmentPayload?.revenue_by_segment
          || analyticsRes?.data?.revenue_by_segment
          || demoData.analytics.revenue_by_segment;
        const crossSellTotal = Object.values(crossSellCounts || {}).reduce((sum, value) => sum + (Number(value) || 0), 0) || 1;

        if (crossSellCounts && typeof crossSellCounts === 'object') {
          Object.entries(crossSellCounts).forEach(([segmentName, count]) => {
            const revenueValue = Number(crossSellRevenue?.[segmentName] || 0);
            const share = (Number(count) || 0) / crossSellTotal;
            const conversionRate = Math.round(Math.min(28, Math.max(6, share * 100 * 0.6 + 6)));
            const revenueK = Math.max(1, Math.round(revenueValue / 1000));

            apiCrossSell.push({
              name: segmentName,
              products: generateProductSuggestions(segmentName),
              revenue_potential: `$${revenueK}K`,
              conversion_rate: conversionRate,
            });
          });
        }
        setCrossSell(apiCrossSell.length ? apiCrossSell : demoData.crossSell);
        
        const xaiTopFeatures = xaiRes?.data?.summary?.top_features;
        let normalizedImportances = null;
        if (Array.isArray(xaiTopFeatures) && xaiTopFeatures.length > 0) {
          normalizedImportances = Object.fromEntries(
            xaiTopFeatures.map((item) => [item.feature, Math.round((Number(item.weight) || 0) * 1000) / 10])
          );
        } else if (xaiRes?.data?.importances) {
          const rawValues = Object.values(xaiRes.data.importances).map((v) => Number(v) || 0);
          const rawTotal = rawValues.reduce((sum, v) => sum + v, 0) || 1;
          normalizedImportances = Object.fromEntries(
            Object.entries(xaiRes.data.importances).map(([feature, value]) => [
              feature,
              Math.round(((Number(value) || 0) / rawTotal) * 1000) / 10,
            ])
          );
        }
        setXaiGlobal(normalizedImportances || { Recency: 42.0, Frequency: 33.0, AOV: 16.0, Total_Transactions: 9.0 });

        // Check if we have any real data
        if (kpiRes?.data || rfmRes?.data || analyticsRes?.data) {
          setError(null);
        } else {
          setError("Showing demo data. Upload a CSV to see your live insights.");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        // Fall back to demo data
        setKpis(demoData.kpis);
        setAlerts(demoData.alerts);
        setRecommendations(demoData.recommendations);
        setRfmSegments(demoData.rfmSegments);
        setProductRules(demoData.productRules);
        setCrossSell(demoData.crossSell);
        setAnalytics(demoData.analytics);
        setXaiGlobal({ Recency: 0.42, Frequency: 0.33, AOV: 0.16, Total_Transactions: 0.09 });
        setError("Showing demo data. Upload a CSV to see your live insights.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location, refreshTrigger]);

  useEffect(() => () => {
    if (plotUrl) URL.revokeObjectURL(plotUrl);
  }, [plotUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-pulse">📊</div>
          <p className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Loading analytics...</p>
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!kpis) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <p className="text-xl font-semibold text-slate-700">Unable to load data</p>
      </div>
    </div>
  );

  const chip = (label) => <span className="pill bg-slate-100 text-slate-700 mr-2 mb-2">{label}</span>;

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBundle = (rule, index) => {
    if (bundledRules.includes(index)) {
      setBundledRules(bundledRules.filter(i => i !== index));
      showNotification(`Removed ${rule.from} → ${rule.to} bundle`, "info");
    } else {
      setBundledRules([...bundledRules, index]);
      showNotification(`✓ Bundled ${rule.from} + ${rule.to} for campaign`, "success");
    }
  };

  const handleLaunch = (segment, index) => {
    if (launchedSegments.includes(index)) {
      setLaunchedSegments(launchedSegments.filter(i => i !== index));
      showNotification(`Paused ${segment.name} campaign`, "info");
    } else {
      setLaunchedSegments([...launchedSegments, index]);
      showNotification(`🚀 Launched ${segment.name} cross-sell campaign!`, "success");
    }
  };

  const fetchLocalExplanation = async () => {
    if (!customerQuery) return;
    try {
      const res = await axios.get(`${API_URL}/explain/customer`, { params: { customer_id: customerQuery } });
      if (res.data && res.data.top_contributions) {
        // Map to { feature: contribution }
        const mapped = {};
        res.data.top_contributions.forEach((c) => {
          mapped[c.feature] = c.contribution;
        });
        setXaiLocal({ meta: res.data, data: mapped });
      }
    } catch (e) {
      setXaiLocal({ error: "No explanation available for that customer." });
    }
  };

  const fetchLocalPlot = async (plot = "waterfall") => {
    if (!customerQuery) {
      setPlotError("Enter a customer ID first.");
      return;
    }
    try {
      setPlotLoading(true);
      setPlotError(null);
      const res = await axios.get(`${API_URL}/explain/customer/plot`, {
        params: { customer_id: customerQuery, plot, format: plot === "force" ? "svg" : "png" },
        responseType: "blob",
      });
      if (plotUrl) URL.revokeObjectURL(plotUrl);
      const url = URL.createObjectURL(res.data);
      setPlotUrl(url);
      setPlotType(plot);
    } catch (e) {
      setPlotUrl(null);
      setPlotError("Plot not available for this customer.");
    } finally {
      setPlotLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {notification && (
        <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border animate-rise backdrop-blur-sm ${
          notification.type === "success" ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200/50 text-emerald-800" :
          notification.type === "info" ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200/50 text-blue-800" :
          "bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200/50 text-slate-800"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{notification.type === "success" ? "✓" : "ℹ"}</span>
            <span className="font-semibold text-sm">{notification.message}</span>
          </div>
        </div>
      )}
      <div className="glass sticky top-0 z-20 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap gap-4 items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="pill bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50 font-semibold">📊 Live Customer Intelligence</div>
            {datasetType && (
              <div className="pill bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200/50 flex items-center gap-2">
                <span className="text-lg">{datasetType.icon}</span>
                <span className="font-semibold text-sm">{datasetType.name}</span>
              </div>
            )}
            {error ? (
              <div className="pill bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50">⚠ {error}</div>
            ) : (
              <div className="pill bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200/50 animate-pulse">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>Connected
              </div>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data from server"
            >
              {loading ? "⟳ Refreshing..." : "⟳ Refresh"}
            </button>
            <div className="relative group">
              <button
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 transition-all duration-300"
                title="Download business insights"
              >
                📥 Download
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200/50 invisible group-hover:visible z-50 py-2">
                <a
                  href={`${API_URL}/download/insights/excel`}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 first:rounded-t-lg"
                  download
                >
                  📊 Full Report (Excel)
                </a>
                <a
                  href={`${API_URL}/download/insights/csv`}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50"
                  download
                >
                  📄 Summary (CSV)
                </a>
                <a
                  href={`${API_URL}/download/data/segments`}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50"
                  download
                >
                  👥 Segments Data
                </a>
                <a
                  href={`${API_URL}/download/data/trends`}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50"
                  download
                >
                  📈 Trends Data
                </a>
                <a
                  href={`${API_URL}/download/data/customers`}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 last:rounded-b-lg"
                  download
                >
                  ⭐ Top Customers
                </a>
              </div>
            </div>
            <button
              onClick={() => navigate("/upload")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300"
            >
              Upload new data
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap hide-scroll pb-2">
          {["overview", "behavior-analysis", "predictive-insights", "product-affinity", "ai-insights"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-5 text-sm font-semibold rounded-t-xl border-b-3 transition-all duration-300 ${
                tab === t 
                  ? "border-blue-600 text-blue-700 bg-gradient-to-b from-blue-50/50 to-transparent" 
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
              }`}
            >
              {t === "ai-insights" ? "🧠 AI Insights" : t.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="glass rounded-2xl shadow-lg border border-emerald-200/30 p-6 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide">Total Revenue</p>
                  <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">💰</span>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mt-1">${(kpis.total_revenue / 1000).toFixed(0)}K</p>
                <p className="text-sm text-emerald-600 mt-3 font-semibold flex items-center gap-1">
                  <span className="text-lg">↗</span> +12.5% vs last period
                </p>
              </div>
              <div className="glass rounded-2xl shadow-lg border border-blue-200/30 p-6 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide">Total Customers</p>
                  <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">👥</span>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-1">{kpis.total_customers.toLocaleString()}</p>
                <p className="text-sm text-blue-600 mt-3 font-semibold flex items-center gap-1">
                  <span className="text-lg">↗</span> +8.2% new actives
                </p>
              </div>
              <div className="glass rounded-2xl shadow-lg border border-purple-200/30 p-6 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide">Avg Order Value</p>
                  <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">🛍️</span>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-1">${kpis.avg_order_value.toFixed(2)}</p>
                <p className="text-sm text-purple-600 mt-3 font-semibold flex items-center gap-1">
                  <span className="text-lg">↗</span> Mix shift toward bundles
                </p>
              </div>
              <div className="glass rounded-2xl shadow-lg border border-amber-200/30 p-6 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide">Growth Rate</p>
                  <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">📈</span>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mt-1">
                  {growthRateDisplay}
                </p>
                <p className="text-sm text-amber-600 mt-3 font-semibold flex items-center gap-1">
                  <span className="text-lg">↗</span> {growthRateIsValid ? (growthRateValue > 0 ? 'Momentum building' : growthRateValue < 0 ? 'Stabilizing' : 'Steady state') : 'No trend yet'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="glass rounded-3xl shadow-xl border border-slate-200/50 lg:col-span-2 p-7 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="pill bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200/50 text-purple-700 font-semibold">🎯 RFM Segmentation</div>
                    <p className="text-sm text-slate-600 mt-3">Auto-prioritized segments from your data</p>
                  </div>
                  <div className="text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">⏱ Updated hourly</div>
                </div>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="transform hover:scale-105 transition-transform duration-300">
                    <SegmentPie data={segmentCounts} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(segmentCounts).map(([name], idx) => (
                      <div key={name} className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-rise" style={{animationDelay: `${idx * 80}ms`}}>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{name}</div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">{segmentPercentages[name]?.toFixed(1)}%</div>
                        <div className="text-xs text-emerald-600 mt-2 font-semibold flex items-center gap-1">
                          <span>↗</span> priority actions ready
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="glass rounded-3xl shadow-xl border border-slate-200/50 p-7 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">Alerts</h3>
                  <span className="pill bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50">🚨 Auto-detected</span>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50/50 border border-emerald-200/50 hover:shadow-md transition-all duration-300">
                    <div className="font-bold text-emerald-700 mb-1.5 flex items-center gap-2">
                      <span>✓</span> High-value retention
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed">{alerts.high_value_retention?.description}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/50 hover:shadow-md transition-all duration-300">
                    <div className="font-bold text-amber-700 mb-1.5 flex items-center gap-2">
                      <span>⚠</span> Churn risk
                    </div>
                    <p className="text-slate-700">{alerts.churn_risk?.description}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="font-semibold text-blue-700">Cross-sell</div>
                    <p className="text-slate-700">{alerts.cross_sell?.description}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                    <div className="font-semibold text-orange-700">Re-engagement</div>
                    <p className="text-slate-700">{alerts.reengagement?.description}</p>
                  </div>
                </div>
                {xaiGlobal && (
                  <div className="glass rounded-3xl shadow-xl border border-slate-200/50 p-7 hover:shadow-2xl transition-all duration-300 lg:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold bg-gradient-to-r from-blue-900 to-indigo-900 bg-clip-text text-transparent">Top Drivers (SHAP)</h3>
                      <div className="pill bg-blue-50 text-blue-700 border border-blue-100">Explainable AI</div>
                    </div>
                    <RevenueBar data={xaiGlobal} label="Impact (%)" />
                    <p className="text-xs text-slate-500 mt-3">Explaining variation in customer monetary value using a tree model with SHAP attributions.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Revenue + Customers</h3>
                  <div className="pill">Last 9 months</div>
                </div>
                <TrendLine
                  labels={analytics.trend_labels}
                  series={[
                    { label: "Revenue", data: analytics.revenue_trend, color: "#1d4ed8" },
                    { label: "Customers", data: analytics.customer_trend, color: "#10b981" },
                  ]}
                />
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Revenue by Segment</h3>
                  <div className="pill">Share of total</div>
                </div>
                <RevenueBar data={analytics.revenue_by_segment} label="Revenue share" />
              </div>
            </div>
          </>
        )}

        {tab === "behavior-analysis" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Behavior analysis</h2>
                <p className="text-sm text-slate-500">Recency, frequency, value and session patterns</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {chip("RFM")}
                {chip("Seasonality")}
                {chip("Dayparting")}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(segmentCounts).map(([name, count]) => {
                const share = segmentPercentages[name] || 0;
                const revenue = Number(segmentRevenue?.[name] || 0);
                const revenueShare = segmentRevenueTotal ? (revenue / segmentRevenueTotal) * 100 : 0;
                return (
                  <div key={name} className="card border border-slate-100 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900">{name}</h3>
                      <span className="pill bg-slate-50 text-slate-700 border border-slate-200">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">Customer share</span>
                          <span className="text-slate-700">{count.toLocaleString()} customers</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full transition" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        <div>Revenue: <span className="font-semibold text-slate-900">${revenue.toFixed(0)}</span></div>
                        <div>Revenue share: <span className="font-semibold text-slate-900">{revenueShare.toFixed(1)}%</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">RFM Distribution</h3>
                  <div className="pill bg-white border border-slate-100 text-slate-700">Frequency vs Value</div>
                </div>
                <div className="h-64">
                  <RFMScatter customers={analytics.rfm_customers} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600">Champions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600">Loyal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                    <span className="text-slate-600">Potential</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600">At Risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-slate-600">Hibernating</span>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Purchase cadence</h3>
                  <div className="pill bg-white border border-slate-100 text-slate-700">Weekend vs weekday</div>
                </div>
                <BehaviorBar
                  labels={analytics.behavior_labels}
                  values={analytics.behavior_values}
                  color="#0ea5e9"
                />
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Lifecycle distribution</h3>
                  <div className="pill bg-white border border-slate-100 text-slate-700">Cohort mix</div>
                </div>
                <LifecycleBar labels={analytics.lifecycle_labels} values={analytics.lifecycle_values} />
              </div>
            </div>
          </>
        )}

        {tab === "predictive-insights" && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">🎯 Predictive insights</h2>
                <p className="text-sm text-slate-500">Ready-to-run plays ranked by impact • Optimized for Q1 execution</p>
              </div>
              <div className="flex gap-2 items-center">
                <div className="pill bg-violet-50 text-violet-700 border border-violet-100">✨ AI generated</div>
                <div className="pill bg-slate-50 text-slate-700 border border-slate-100">{recommendations?.length || 0} opportunities</div>
              </div>
            </div>

            {recommendations && recommendations.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.map((rec, i) => {
                if (!rec) return null;
                
                // Dynamic icon based on recommendation type/content
                const getIconForRecommendation = (title) => {
                  if (!title) return "💡";
                  const titleLower = title.toLowerCase();
                  if (titleLower.includes("vip") || titleLower.includes("champion")) return "👑";
                  if (titleLower.includes("win-back") || titleLower.includes("reactivat")) return "🔄";
                  if (titleLower.includes("cross") || titleLower.includes("bundle")) return "🔗";
                  if (titleLower.includes("lifecycle") || titleLower.includes("nurture")) return "📧";
                  if (titleLower.includes("retention")) return "🎯";
                  if (titleLower.includes("upsell") || titleLower.includes("premium")) return "⬆️";
                  return "💡";
                };

                // Dynamic gradient based on priority and confidence
                const getGradientForRecommendation = (priority, confidence) => {
                  if (!priority || !confidence) return "from-blue-50 to-slate-50";
                  if (priority === "High") {
                    return confidence > 80 ? "from-red-50 to-orange-50" : "from-orange-50 to-amber-50";
                  }
                  return confidence > 75 ? "from-blue-50 to-cyan-50" : "from-slate-50 to-blue-50";
                };

                // Dynamic bar color based on confidence
                const getConfidenceBarColor = (confidence) => {
                  if (!confidence) return "from-slate-500 to-slate-400";
                  if (confidence >= 90) return "from-emerald-500 to-green-500";
                  if (confidence >= 80) return "from-blue-500 to-cyan-500";
                  if (confidence >= 70) return "from-amber-500 to-yellow-500";
                  return "from-slate-500 to-slate-400";
                };

                const icon = getIconForRecommendation(rec.title);
                const gradient = getGradientForRecommendation(rec.priority, rec.confidence);
                const barColor = getConfidenceBarColor(rec.confidence);

                return (
                  <div
                    key={i}
                    className={`card glass hover:shadow-xl hover:-translate-y-1 transition border border-slate-100 bg-gradient-to-br ${gradient} animate-rise`}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{icon}</div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{rec.title}</h3>
                          <span
                            className={`pill mt-1 ${
                              rec.priority === "High"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {rec.priority} priority
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mb-4 leading-relaxed">{rec.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Confidence</span>
                        <span className="font-semibold text-slate-900">{rec.confidence}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${barColor} h-2 rounded-full transition`}
                          style={{ width: `${rec.confidence}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-emerald-600 font-bold text-lg">💰 {rec.revenue}</span>
                        <button className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition">
                          Activate →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <div className="card glass border border-slate-100 p-8 text-center">
                <p className="text-slate-600 mb-2">No recommendations available yet</p>
                <p className="text-sm text-slate-500">Upload a dataset to generate recommendations</p>
              </div>
            )}

            <div className="card glass mt-6 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Explain a customer</h3>
                  <p className="text-sm text-slate-500">SHAP-based local explanation of monetary value drivers</p>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    placeholder="Customer ID"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={fetchLocalExplanation} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition">
                    Explain →
                  </button>
                </div>
              </div>
              {xaiLocal?.data ? (
                <div>
                  <RevenueBar data={xaiLocal.data} label="Contribution" />
                  <p className="text-xs text-slate-500 mt-3">Prediction: ${'{'}xaiLocal.meta.prediction.toFixed ? xaiLocal.meta.prediction.toFixed(2) : xaiLocal.meta.prediction{'}'} • Target: Monetary</p>
                </div>
              ) : xaiLocal?.error ? (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">{xaiLocal.error}</div>
              ) : (
                <p className="text-xs text-slate-500">Enter a valid customer ID present in your uploaded data.</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => fetchLocalPlot("waterfall")}
                  disabled={plotLoading}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    plotLoading ? "bg-slate-200 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {plotLoading && plotType === "waterfall" ? "Loading…" : "Waterfall plot"}
                </button>
                <button
                  onClick={() => fetchLocalPlot("force")}
                  disabled={plotLoading}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    plotLoading ? "bg-slate-200 text-slate-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {plotLoading && plotType === "force" ? "Loading…" : "Force plot"}
                </button>
                {plotError && <span className="text-xs text-amber-700">{plotError}</span>}
              </div>

              {plotUrl && (
                <div className="mt-6 bg-white border border-slate-300 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Header Section */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                    <div className="flex items-center justify-between">
                      <div className="text-white">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          {plotType === "force" ? "⚡ Force Plot" : "📊 Waterfall Analysis"}
                        </h3>
                        <p className="text-sm text-blue-100 mt-1">
                          {plotType === "force" 
                            ? "Interactive force visualization of feature contributions to customer value" 
                            : "Feature-by-feature breakdown showing how each driver impacts predicted monetary value"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-4 py-2 bg-white text-blue-700 rounded-lg font-bold text-sm">
                          Customer: {customerQuery}
                        </span>
                        <span className="text-xs text-blue-100 font-semibold">SHAP Analysis</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Plot Container */}
                  <div className="bg-slate-50 p-8 overflow-x-auto">
                    <img 
                      src={plotUrl} 
                      alt={`${plotType} SHAP plot`} 
                      className="w-full h-auto rounded-lg border border-slate-200 bg-white shadow-md"
                      style={{ minWidth: '100%', maxHeight: '800px', objectFit: 'contain' }}
                    />
                  </div>
                  
                  {/* Legend Section */}
                  <div className="bg-white border-t border-slate-200 px-8 py-5">
                    <p className="text-xs font-semibold text-slate-700 mb-3">Color Legend:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block w-4 h-4 bg-red-500 rounded"></span>
                        <span className="text-xs text-slate-600">Red bars: Increases predicted value</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block w-4 h-4 bg-blue-500 rounded"></span>
                        <span className="text-xs text-slate-600">Blue bars: Decreases predicted value</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block w-4 h-4 bg-gray-400 rounded"></span>
                        <span className="text-xs text-slate-600">Base value: Average prediction</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block w-4 h-4 bg-gray-700 rounded"></span>
                        <span className="text-xs text-slate-600">Output: Final prediction</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "product-affinity" && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">🛍️ Product affinity</h2>
                <p className="text-sm text-slate-500">Market basket rules and segment-specific bundles • Auto-detected from orders</p>
              </div>
              <div className="flex gap-2 items-center">
                <div className="pill bg-emerald-50 text-emerald-700 border border-emerald-100">✓ Cross-sell ready</div>
                <div className="pill bg-slate-50 text-slate-700 border border-slate-100">{productRules?.length || 0} rules</div>
              </div>
            </div>

            {productRules && productRules.length > 0 ? (
            <div className="space-y-3">
              {productRules.map((rule, i) => {
                if (!rule) return null;
                
                // Dynamic icon based on product keywords
                const getIconForProduct = (productName) => {
                  if (!productName) return "📦";
                  const nameLower = productName.toLowerCase();
                  
                  // Common product categories
                  if (nameLower.includes("coffee") || nameLower.includes("bean") || nameLower.includes("drink")) return "☕";
                  if (nameLower.includes("head") || nameLower.includes("ear") || nameLower.includes("audio")) return "🎧";
                  if (nameLower.includes("pen") || nameLower.includes("planner") || nameLower.includes("stationery")) return "📓";
                  if (nameLower.includes("book") || nameLower.includes("read") || nameLower.includes("novel")) return "📚";
                  if (nameLower.includes("phone") || nameLower.includes("mobile") || nameLower.includes("device")) return "📱";
                  if (nameLower.includes("cloth") || nameLower.includes("shoe") || nameLower.includes("wear")) return "👕";
                  if (nameLower.includes("food") || nameLower.includes("snack") || nameLower.includes("eat")) return "🍔";
                  if (nameLower.includes("beauty") || nameLower.includes("cosmetic") || nameLower.includes("makeup")) return "💄";
                  if (nameLower.includes("sport") || nameLower.includes("fitness") || nameLower.includes("exercise")) return "⚽";
                  if (nameLower.includes("home") || nameLower.includes("furniture") || nameLower.includes("decor")) return "🏠";
                  if (nameLower.includes("toy") || nameLower.includes("game") || nameLower.includes("play")) return "🎮";
                  if (nameLower.includes("tech") || nameLower.includes("gadget") || nameLower.includes("electronic")) return "⚙️";
                  if (nameLower.includes("flower") || nameLower.includes("plant") || nameLower.includes("garden")) return "🌸";
                  if (nameLower.includes("watch") || nameLower.includes("clock") || nameLower.includes("time")) return "⏰";
                  return "📦";
                };

                // Dynamic gradient based on confidence and lift
                const getGradientForRule = (confidence, lift) => {
                  if (!confidence || !lift) return "from-slate-50 to-gray-50";
                  const liftNum = parseFloat(lift);
                  if (confidence > 70 && liftNum > 1.8) return "from-emerald-50 to-green-50";
                  if (confidence > 65 && liftNum > 1.5) return "from-blue-50 to-cyan-50";
                  return "from-slate-50 to-gray-50";
                };

                const icon = getIconForProduct(rule.from);
                const gradient = getGradientForRule(rule.confidence, rule.lift);

                return (
                  <div
                    key={i}
                    className={`card glass border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:shadow-lg hover:border-slate-200 transition animate-rise bg-gradient-to-r ${gradient}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-3xl">{icon}</div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                        <span className="pill bg-blue-50 text-blue-700 border border-blue-100 font-semibold">{rule.from}</span>
                        <span className="text-xl text-slate-400">→</span>
                        <span className="pill bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">{rule.to}</span>
                        <p className="text-sm text-slate-600 ml-0 sm:ml-3">{rule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Confidence</div>
                        <div className="font-bold text-blue-700">{rule.confidence}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Lift</div>
                        <div className="font-bold text-emerald-600">{rule.lift}x</div>
                      </div>
                      <button
                        onClick={() => handleBundle(rule, i)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow ${
                          bundledRules.includes(i)
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
                        }`}
                      >
                        {bundledRules.includes(i) ? "✓ Bundled" : "Bundle →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <div className="card glass border border-slate-100 p-8 text-center">
                <p className="text-slate-600 mb-2">No product rules available yet</p>
                <p className="text-sm text-slate-500">Upload transaction data to discover product affinities</p>
              </div>
            )}

            <div className="card glass mt-6 border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg">🎁 Cross-sell opportunities</h3>
                  <p className="text-sm text-slate-500">Segment-specific playbooks with conversion estimates</p>
                </div>
                <div className="pill bg-white border border-slate-200 text-slate-700">{crossSell?.length || 0} segments</div>
              </div>
              {crossSell && crossSell.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {crossSell.map((seg, i) => {
                  // Dynamic icon based on segment name
                  const getIconForSegment = (segmentName) => {
                    const nameLower = segmentName.toLowerCase();
                    if (nameLower.includes("champion") || nameLower.includes("vip") || nameLower.includes("premium")) return "👑";
                    if (nameLower.includes("loyal")) return "💙";
                    if (nameLower.includes("risk") || nameLower.includes("churn") || nameLower.includes("danger")) return "⚠️";
                    if (nameLower.includes("potential") || nameLower.includes("prospect")) return "🌱";
                    if (nameLower.includes("hibernat") || nameLower.includes("dormant")) return "😴";
                    return "👤";
                  };

                  // Dynamic colors based on segment name
                  const getColorsForSegment = (segmentName) => {
                    const nameLower = segmentName.toLowerCase();
                    if (nameLower.includes("champion") || nameLower.includes("premium")) {
                      return { bg: "bg-gradient-to-br from-amber-50 to-yellow-50", border: "border-amber-200", text: "text-amber-700" };
                    }
                    if (nameLower.includes("loyal")) {
                      return { bg: "bg-gradient-to-br from-blue-50 to-cyan-50", border: "border-blue-200", text: "text-blue-700" };
                    }
                    if (nameLower.includes("risk") || nameLower.includes("churn")) {
                      return { bg: "bg-gradient-to-br from-red-50 to-orange-50", border: "border-red-200", text: "text-red-700" };
                    }
                    if (nameLower.includes("potential")) {
                      return { bg: "bg-gradient-to-br from-emerald-50 to-green-50", border: "border-emerald-200", text: "text-emerald-700" };
                    }
                    if (nameLower.includes("hibernat")) {
                      return { bg: "bg-gradient-to-br from-slate-50 to-gray-50", border: "border-slate-200", text: "text-slate-700" };
                    }
                    return { bg: "bg-gradient-to-br from-slate-50 to-gray-50", border: "border-slate-200", text: "text-slate-700" };
                  };

                  const icon = getIconForSegment(seg.name);
                  const colors = getColorsForSegment(seg.name);

                  return (
                    <div
                      key={i}
                      className={`p-5 rounded-xl border ${colors.border} ${colors.bg} hover:shadow-md hover:-translate-y-0.5 transition animate-rise`}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{icon}</span>
                          <h4 className={`font-bold ${colors.text}`}>{seg.name}</h4>
                        </div>
                        <span className="pill bg-white border border-slate-200 text-slate-700 font-bold">{seg.conversion_rate}%</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {seg.products.map((p, j) => (
                          <span key={j} className="pill bg-white text-slate-700 border border-slate-200 font-medium text-xs">
                            {p}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <div>
                          <div className="text-xs text-slate-500">Revenue potential</div>
                          <div className="text-lg font-bold text-emerald-600">{seg.revenue_potential}</div>
                        </div>
                        <button
                          onClick={() => handleLaunch(seg, i)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                            launchedSegments.includes(i)
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          {launchedSegments.includes(i) ? "✓ Active" : "Launch →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card glass border border-slate-100 p-8 text-center">
                <p className="text-slate-600 mb-2">No cross-sell opportunities available yet</p>
                <p className="text-sm text-slate-500">Upload transaction data to generate cross-sell playbooks</p>
              </div>
            )}
            </div>
          </>
        )}

        {/* AI Insights Tab */}
        {tab === "ai-insights" && (
          <>
            <div className="space-y-8">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">🧠 AI Business Insights</h2>
                    <p className="text-slate-600">AI-powered customer intelligence and actionable recommendations</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-lg">
                    AI-Powered
                  </span>
                </div>
              </div>

              {aiInsights && aiInsights.summary_kpis ? (
                <>
                  {/* Summary KPIs */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Summary KPIs</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div className="glass rounded-2xl shadow-lg border border-teal-200/30 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide mb-2">Total Customers</p>
                        <p className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                          {typeof aiInsights.summary_kpis.total_customers === 'number' 
                            ? aiInsights.summary_kpis.total_customers.toLocaleString()
                            : aiInsights.summary_kpis.total_customers}
                        </p>
                      </div>
                      <div className="glass rounded-2xl shadow-lg border border-emerald-200/30 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide mb-2">Avg Lifetime Value</p>
                        <p className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                          ${aiInsights.summary_kpis.avg_lifetime_value || '0.00'}
                        </p>
                      </div>
                      <div className="glass rounded-2xl shadow-lg border border-orange-200/30 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide mb-2">Churn Rate</p>
                        <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                          {Number(aiInsights.summary_kpis.churn_rate || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="glass rounded-2xl shadow-lg border border-amber-200/30 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <p className="text-sm text-slate-600 font-semibold uppercase tracking-wide mb-2">Top Segment</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                          {aiInsights.summary_kpis.top_segment || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Growth Signals */}
                  {growthSignals && growthSignals.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4">Risk & Opportunity Signals</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {growthSignals.map((signal, idx) => (
                          <div key={`signal-${idx}`} className="glass rounded-2xl shadow-lg border border-slate-200/50 p-5">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{signal.title || 'Signal'}</h4>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                signal.severity === "high" ? "bg-red-100 text-red-800" :
                                signal.severity === "medium" ? "bg-amber-100 text-amber-800" :
                                "bg-emerald-100 text-emerald-800"
                              }`}>
                                {signal.severity || 'info'}
                              </span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">{signal.value || 'N/A'}</div>
                            <div className="text-sm text-slate-600">{signal.detail || ''}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer Segments with Risk Levels */}
                  {aiInsights.segment_metrics && Array.isArray(aiInsights.segment_metrics) && aiInsights.segment_metrics.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4">Customer Segments</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {aiInsights.segment_metrics.map((segment, idx) => (
                          <div key={idx} className="glass rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-bold text-slate-900">{segment.name || `Segment ${idx}`}</h4>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                segment.risk_level === 'low risk' ? 'bg-emerald-100 text-emerald-800' :
                                segment.risk_level === 'medium risk' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {(segment.risk_level || 'unknown').toUpperCase()}
                              </span>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Customers</span>
                                <span className="text-lg font-bold text-slate-900">{segment.count || 0}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Percentage</span>
                                <span className="text-lg font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                                  {Number(segment.percentage || 0).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feature Importance */}
                  {aiInsights.feature_importance && Object.keys(aiInsights.feature_importance).length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4">Feature Importance</h3>
                      <div className="glass rounded-3xl shadow-xl border border-slate-200/50 p-7">
                        <div className="space-y-4">
                          {Object.entries(aiInsights.feature_importance).map(([feature, data], idx) => {
                            const importance = typeof data === 'object' ? (data.importance || 0) : (data || 0);
                            const description = typeof data === 'object' ? (data.description || '') : '';
                            return (
                              <div key={idx} className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-semibold text-slate-900">{feature}</span>
                                  <span className="text-sm font-bold text-teal-600">{Number(importance).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-teal-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                                    style={{width: `${Math.min(Number(importance) || 0, 100)}%`}}
                                  ></div>
                                </div>
                                {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature Insight Cards */}
                  {featureInsightCards && Array.isArray(featureInsightCards) && featureInsightCards.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4">Feature Insights</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {featureInsightCards.map((card, idx) => (
                          <div key={`feature-${idx}`} className="glass rounded-3xl shadow-xl border border-slate-200/50 p-7 hover:shadow-2xl transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-lg">
                                  {card.icon || "📊"}
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-slate-900 mb-1">{card.title || 'Feature'}</h4>
                                  <p className="text-sm text-slate-600">{card.description || ''}</p>
                                </div>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                card.impact === "high impact" ? "bg-emerald-100 text-emerald-800" :
                                card.impact === "medium impact" ? "bg-amber-100 text-amber-800" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {card.impact || 'medium impact'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Recommended Action</div>
                            <p className="text-sm text-slate-700 leading-relaxed mb-4">{card.recommended_action || card.action || ''}</p>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">{card.contribution || ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Business Insights & Recommendations */}
                  {aiInsights.business_insights && Array.isArray(aiInsights.business_insights) && aiInsights.business_insights.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4">Business Insights & Recommendations</h3>
                      <div className="space-y-6">
                        {aiInsights.business_insights.map((insight, idx) => (
                          <div key={idx} className="glass rounded-3xl shadow-xl border border-slate-200/50 p-7 hover:shadow-2xl transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="text-xl font-bold text-slate-900 mb-1">{insight.title || 'Insight'}</h4>
                                <p className="text-slate-600">{insight.description || ''}</p>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-4 ${
                                insight.impact === 'high impact' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {insight.impact || 'medium impact'}
                              </span>
                            </div>

                            {/* Metrics */}
                            {insight.metrics && typeof insight.metrics === 'object' && (
                              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-slate-50 to-teal-50/30 rounded-2xl">
                                {Object.entries(insight.metrics).map(([metricName, metricData], mIdx) => (
                                  <div key={mIdx} className="text-center">
                                    <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-1">{metricName}</p>
                                    <p className="text-xl font-bold text-slate-900">{metricData?.value || 'N/A'}</p>
                                    <p className={`text-xs font-semibold mt-1 ${
                                      metricData?.change?.toString().startsWith('+') ? 'text-emerald-600' :
                                      metricData?.change?.toString().startsWith('-') ? 'text-red-600' :
                                      'text-slate-600'
                                    }`}>
                                      {metricData?.change || 'N/A'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Recommendation */}
                            <div className="pt-4 border-t border-slate-200">
                              <p className="text-sm font-semibold text-slate-900 mb-2">💡 Recommendation:</p>
                              <p className="text-sm text-slate-700">{insight.recommendation || ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategic Recommendations */}
                  {strategicRecommendations && Array.isArray(strategicRecommendations) && strategicRecommendations.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4">Strategic Recommendations</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {strategicRecommendations.map((insight, idx) => (
                          <div key={`rec-${idx}`} className="glass rounded-3xl shadow-xl border border-slate-200/50 p-7 hover:shadow-2xl transition-all duration-300">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div>
                                <h4 className="text-lg font-bold text-slate-900 mb-1">{insight.title || 'Recommendation'}</h4>
                                <p className="text-sm text-slate-600">{insight.summary || insight.description || ''}</p>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                insight.priority === 'High' || insight.impact === 'high impact' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {(insight.priority || insight.impact || 'Medium').toString()}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recommended Action</div>
                            <p className="text-sm text-slate-700 leading-relaxed">{insight.recommendation || insight.summary || ''}</p>
                            {insight.action_plan && Array.isArray(insight.action_plan) && (
                              <div className="mt-4 space-y-2">
                                {insight.action_plan.map((item, actionIdx) => (
                                  <div key={actionIdx} className="text-sm text-slate-700 flex items-start gap-2">
                                    <span className="text-slate-400">•</span>
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {insight.success_metric && (
                              <div className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Success metric: <span className="text-slate-700 font-semibold normal-case">{insight.success_metric}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model Transparency */}
                  {aiInsights.model_info && (
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4">How the AI Made These Classifications</h3>
                      <div className="glass rounded-3xl shadow-xl border border-slate-200/50 p-7">
                        <p className="text-slate-700 mb-6">
                          Our classification model uses a <span className="font-semibold text-slate-900">{aiInsights.model_info.algorithm}</span> <span className="text-slate-600">{aiInsights.model_info.shap_info}</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50">
                            <div className="text-sm text-slate-600 font-semibold uppercase tracking-wide mb-2">Model Accuracy</div>
                            <div className="text-4xl font-bold text-blue-600 mb-1">{aiInsights.model_info.accuracy}%</div>
                            <div className="text-xs text-slate-600">{aiInsights.model_info.accuracy_description}</div>
                          </div>
                          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/50">
                            <div className="text-sm text-slate-600 font-semibold uppercase tracking-wide mb-2">Features Used</div>
                            <div className="text-4xl font-bold text-emerald-600 mb-1">{aiInsights.model_info.features_used}</div>
                            <div className="text-xs text-slate-600">{aiInsights.model_info.features_description}</div>
                          </div>
                          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/50">
                            <div className="text-sm text-slate-600 font-semibold uppercase tracking-wide mb-2">Confidence Score</div>
                            <div className="text-4xl font-bold text-purple-600 mb-1">{aiInsights.model_info.confidence}%</div>
                            <div className="text-xs text-slate-600">{aiInsights.model_info.confidence_description}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-600 mb-4">Upload data to see AI-powered insights</p>
                  <button
                    onClick={() => navigate("/upload")}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                  >
                    Upload Dataset
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
