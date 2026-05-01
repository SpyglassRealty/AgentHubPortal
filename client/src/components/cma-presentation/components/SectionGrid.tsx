import { useState } from 'react';
import { SectionCard } from './SectionCard';
import type { WidgetDefinition, AgentProfile } from '../types';

const CMA_WIDGET_IDS = new Set(['comps', 'time_to_sell', 'suggested_list_price', 'average_price_acre']);

interface SectionGridProps {
  widgets: WidgetDefinition[];
  onSelectWidget: (index: number) => void;
  compsCount?: number;
  daysOnMarket?: number;
  suggestedListPrice?: number | null;
  avgPricePerAcre?: number | null;
  agent?: AgentProfile;
}

// Format price compactly for badges
const formatCompactPrice = (price: number): string => {
  if (price >= 1000000) {
    const millions = price / 1000000;
    return `$${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (price >= 1000) {
    const thousands = price / 1000;
    return `$${Math.round(thousands)}K`;
  }
  return `$${price.toLocaleString()}`;
};

export function SectionGrid({
  widgets,
  onSelectWidget,
  compsCount = 0,
  daysOnMarket = 0,
  suggestedListPrice,
  avgPricePerAcre,
  agent,
}: SectionGridProps) {
  const [showListingPresentation, setShowListingPresentation] = useState(false);

  // Preserve original indices so onSelectWidget gets the correct currentSlide
  const indexedWidgets = widgets.map((widget, index) => ({ widget, index }));
  const visibleWidgets = showListingPresentation
    ? indexedWidgets
    : indexedWidgets.filter(({ widget }) => CMA_WIDGET_IDS.has(widget.id));

  const getWidgetBadge = (widget: WidgetDefinition): string | number | undefined => {
    if (widget.id === 'comps') {
      return compsCount > 0 ? compsCount : undefined;
    }
    if (widget.id === 'time_to_sell') {
      return daysOnMarket > 0 ? `${daysOnMarket} days` : undefined;
    }
    if (widget.id === 'suggested_list_price') {
      return suggestedListPrice && suggestedListPrice > 0
        ? formatCompactPrice(suggestedListPrice)
        : undefined;
    }
    if (widget.id === 'average_price_acre') {
      return avgPricePerAcre && avgPricePerAcre > 0 && avgPricePerAcre < 1000000000
        ? `${formatCompactPrice(avgPricePerAcre)}/acre`
        : undefined;
    }
    return widget.badge;
  };

  return (
    <div className="flex flex-col p-4">
      <div
        className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        data-testid="section-grid"
      >
        {visibleWidgets.map(({ widget, index }) => (
          <SectionCard
            key={widget.id}
            widget={widget}
            onClick={() => onSelectWidget(index)}
            badge={getWidgetBadge(widget)}
            agentPhoto={widget.id === 'agent_resume' ? agent?.photo : undefined}
            agentName={widget.id === 'agent_resume' ? agent?.name : undefined}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-200">
        <button
          onClick={() => setShowListingPresentation(v => !v)}
          className={`relative inline-flex w-10 h-5 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
            showListingPresentation ? 'bg-[#EF4923]' : 'bg-zinc-300'
          }`}
          role="switch"
          aria-checked={showListingPresentation}
        >
          <span
            className={`inline-block w-4 h-4 mt-0.5 rounded-full bg-white shadow transform transition-transform duration-200 ${
              showListingPresentation ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <label
          className="text-sm text-zinc-500 cursor-pointer select-none"
          onClick={() => setShowListingPresentation(v => !v)}
        >
          Include Listing Presentation
        </label>
      </div>
    </div>
  );
}
