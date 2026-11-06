import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Sliders,
  TrendingUp,
  Package,
  Truck,
  ShieldCheck,
  Snowflake,
  Clock,
  ArrowRight,
  Info,
  CheckCircle2,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import {
  recommendationEngine,
  CatalogItem,
  RecommendedItem,
  UserPreferences,
  BrowsingEvent,
} from '../../services/recommendationEngine.js';
import { Dispatch } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { useTranslation } from '../../context/LanguageContext.js';

interface RecommendationsViewProps {
  onCreateDispatchWithItem?: (item: CatalogItem) => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  onCreateDispatchWithItem,
}) => {
  const { t } = useTranslation();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'architecture'>('recommendations');
  const [addedItemSku, setAddedItemSku] = useState<string | null>(null);

  // Stated Preferences State (Requirement 10)
  const [preferences, setPreferences] = useState<UserPreferences>({
    preferredCategories: ['FOOD_BEVERAGE', 'COLD_CHAIN', 'SAFETY_SECURITY'],
    temperatureControl: 'ANY',
    priorityLevel: 'STANDARD',
    budgetTier: 'BALANCED',
  });

  // Simulated Browsing events (Requirement 10)
  const [browsingEvents, setBrowsingEvents] = useState<BrowsingEvent[]>([
    {
      sku: 'SKU-GLS-101',
      category: 'FOOD_BEVERAGE',
      action: 'VIEW_MANIFEST',
      timestamp: new Date().toISOString(),
    },
    {
      category: 'COLD_CHAIN',
      action: 'SEARCH_ITEM',
      timestamp: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    loadDispatches();
  }, []);

  const loadDispatches = async () => {
    setLoading(true);
    try {
      const data = await api.getDispatches();
      setDispatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run the Recommendation Engine whenever dispatches, preferences, or browsing events update
  const recommendations: RecommendedItem[] = useMemo(() => {
    return recommendationEngine.generateRecommendations(
      dispatches,
      preferences,
      browsingEvents
    );
  }, [dispatches, preferences, browsingEvents]);

  const roadmap = useMemo(
    () => recommendationEngine.getFutureImprovementsRoadmap(),
    []
  );

  const toggleCategory = (cat: string) => {
    setPreferences((prev) => {
      const exists = prev.preferredCategories.includes(cat);
      const next = exists
        ? prev.preferredCategories.filter((c) => c !== cat)
        : [...prev.preferredCategories, cat];
      return { ...prev, preferredCategories: next.length > 0 ? next : [cat] };
    });
  };

  const handleSelectItem = (item: CatalogItem) => {
    setAddedItemSku(item.sku);
    setTimeout(() => setAddedItemSku(null), 3000);
    if (onCreateDispatchWithItem) {
      onCreateDispatchWithItem(item);
    }
  };

  if (loading) return <LoadingSpinner label={t('msg.loading')} />;

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950 dark:border-indigo-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t('rec.engine_badge', 'Collaborative Filtering & Affinity Engine')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('rec.personalized_title', 'Personalized Products & Services')}</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {t('rec.personalized_desc', 'Analyzes your dispatch history, manifest browsing behavior, and stated handling preferences.')}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('rec.tab_recommended', 'Recommended for You')}</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'architecture'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t('rec.tab_roadmap', 'Future Roadmap')}</span>
          </button>
        </div>
      </div>

      {activeTab === 'recommendations' ? (
        <>
          {/* Stated Preferences & Engine Tuners */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-xs">{t('rec.preferences_title', 'Stated Preferences & Context Signals')}</h3>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  {t('rec.adjust_hint')}
                </span>
              </div>
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold cursor-pointer min-h-[36px] px-2"
              >
                <span>{showPreferences ? t('rec.hide_controls', 'Hide Controls') : t('rec.customize_signals', 'Customize Signals')}</span>
                {showPreferences ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showPreferences && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                {/* Category Toggles */}
                <div>
                  <label className="block text-slate-800 dark:text-slate-300 font-semibold mb-2">{t('rec.preferred_categories', 'Preferred Categories')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'FOOD_BEVERAGE', label: t('rec.cat_food_bev') },
                      { id: 'COLD_CHAIN', label: t('rec.cat_cold_chain') },
                      { id: 'PACKAGING', label: t('rec.cat_packaging') },
                      { id: 'SAFETY_SECURITY', label: t('rec.cat_safety') },
                      { id: 'LOGISTICS_SERVICE', label: t('rec.cat_logistics') },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                          preferences.preferredCategories.includes(cat.id)
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold dark:bg-indigo-600/30 dark:border-indigo-500 dark:text-indigo-200'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature Handling */}
                <div>
                  <label className="block text-slate-800 dark:text-slate-300 font-semibold mb-2">{t('rec.temp_handling', 'Temperature Handling')}</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'ANY', label: t('rec.temp_any') },
                      { id: 'AMBIENT', label: t('rec.temp_ambient') },
                      { id: 'REFRIGERATED', label: t('rec.temp_refrigerated') },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() =>
                          setPreferences((p) => ({ ...p, temperatureControl: mode.id as any }))
                        }
                        className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                          preferences.temperatureControl === mode.id
                            ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold dark:bg-sky-600/30 dark:border-sky-500 dark:text-sky-200'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed Priority */}
                <div>
                  <label className="block text-slate-800 dark:text-slate-300 font-semibold mb-2">{t('rec.speed_priority', 'Lead Time Priority')}</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'STANDARD', label: t('rec.pri_standard') },
                      { id: 'EXPEDITED', label: t('rec.pri_expedited') },
                      { id: 'SAME_DAY', label: t('rec.pri_sameday') },
                    ].map((pri) => (
                      <button
                        key={pri.id}
                        onClick={() =>
                          setPreferences((p) => ({ ...p, priorityLevel: pri.id as any }))
                        }
                        className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                          preferences.priorityLevel === pri.id
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold dark:bg-emerald-600/30 dark:border-emerald-500 dark:text-emerald-200'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                      >
                        {pri.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toast on Action */}
          {addedItemSku && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{t('rec.added_toast', { sku: addedItemSku })}</span>
            </div>
          )}

          {/* Recommendations Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 tablet-2col">
            {recommendations.map((rec) => {
              const { item, confidencePercent, primaryReason, collaborativeExplanation } = rec;
              const isService = item.type === 'SERVICE';
              const categoryLabel =
                item.category === 'FOOD_BEVERAGE'
                  ? t('rec.cat_food_bev')
                  : item.category === 'COLD_CHAIN'
                  ? t('rec.cat_cold_chain')
                  : item.category === 'PACKAGING'
                  ? t('rec.cat_packaging')
                  : item.category === 'SAFETY_SECURITY'
                  ? t('rec.cat_safety')
                  : item.category === 'LOGISTICS_SERVICE'
                  ? t('rec.cat_logistics')
                  : String(item.category).replace('_', ' ');

              const localizedTitle = t('rec.item_' + item.id + '_name', item.name);
              const localizedDesc = t('rec.item_' + item.id + '_desc', item.description);
              const tempLabel =
                preferences.temperatureControl === 'REFRIGERATED'
                  ? t('rec.temp_refrigerated')
                  : preferences.temperatureControl === 'AMBIENT'
                  ? t('rec.temp_ambient')
                  : t('rec.temp_any');

              const localizedReason =
                rec.coOccurringSkus.length > 0
                  ? t('rec.reason_co_occurrence', primaryReason, { skus: rec.coOccurringSkus.slice(0, 2).join(', ') })
                  : rec.browsingScore >= 0.35
                  ? t('rec.reason_browsing', primaryReason)
                  : t('rec.reason_default', primaryReason);

              const localizedExplanation =
                rec.coOccurringSkus.length > 0
                  ? t('rec.explain_co_occurrence', collaborativeExplanation, { skus: rec.coOccurringSkus.slice(0, 2).join(' & ') })
                  : rec.browsingScore >= 0.35
                  ? t('rec.explain_browsing', collaborativeExplanation, { category: categoryLabel })
                  : t('rec.explain_default', collaborativeExplanation, { category: categoryLabel, temp: tempLabel });

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Top Confidence Pill & Category */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        {categoryLabel}
                      </span>
                      <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 dark:bg-indigo-950/80 dark:border-indigo-800 dark:text-indigo-300 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums">
                        <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>{t('rec.confidence', { percent: confidencePercent })}</span>
                      </div>
                    </div>

                    {/* Title & SKU */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{localizedTitle}</h4>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                        {item.sku} • {t('unit.' + item.unit.toLowerCase(), item.unit)}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{localizedDesc}</p>

                    {/* Rationale Callout (Collaborative Filtering Explainability) */}
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
                      <div className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>{localizedReason}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {localizedExplanation}
                      </p>

                      {/* Score Breakdown Bars */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        <span>{t('rec.cf_affinity', { score: Math.round(rec.collaborativeScore * 100) })}</span>
                        <span>{t('rec.pref_match', { score: Math.round(rec.preferenceScore * 100) })}</span>
                        <span>{t('rec.browse_score', { score: Math.round(rec.browsingScore * 100) })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        ${item.unitPrice.toFixed(2)}
                        <span className="text-xs font-normal font-sans text-slate-600 dark:text-slate-400"> / {t('unit.' + item.unit.toLowerCase(), item.unit)}</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{t('rec.delivery_ready', { hours: item.leadTimeHours })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectItem(item)}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 min-h-[44px] rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{isService ? t('rec.request_service') : t('rec.add_to_dispatch')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Future Architecture Roadmap */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-2 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{t('rec.roadmap_arch_title')}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('rec.roadmap_arch_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 tablet-2col">
            {roadmap.map((plan, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                    {t(`rec.roadmap_${index + 1}_tier`, plan.tier)}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{t('rec.step_of', { step: index + 1, total: 4 })}</span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t(`rec.roadmap_${index + 1}_title`, plan.title)}</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{t(`rec.roadmap_${index + 1}_desc`, plan.description)}</p>

                <div className="space-y-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block mb-0.5">
                      {t('rec.why_it_matters', 'Why It Matters:')}
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{t(`rec.roadmap_${index + 1}_rationale`, plan.rationale)}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                    <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 block mb-0.5">
                      {t('rec.production_impl', 'Production Implementation:')}
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t(`rec.roadmap_${index + 1}_impl`, plan.implementationStrategy)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
