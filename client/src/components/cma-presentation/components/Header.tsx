import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Menu, Search, Phone, Mail, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { PdfDownloadButton } from './PdfDownloadButton';
import type { AgentProfile, CmaProperty } from '../types';

interface HeaderProps {
  propertyAddress: string;
  mlsNumber?: string;
  preparedFor?: string;
  agent: AgentProfile;
  onMenuClick: () => void;
  onClose: () => void;
  latitude?: number;
  longitude?: number;
  comparables?: CmaProperty[];
  subjectProperty?: CmaProperty;
  averageDaysOnMarket?: number;
  suggestedListPrice?: number | null;
  avgPricePerAcre?: number | null;
  onSlideSelect?: (index: number) => void;
  slides?: Array<{ id: string; number: number; title: string }>;
}

export function Header({
  propertyAddress,
  mlsNumber,
  preparedFor,
  agent,
  onMenuClick,
  onClose,
  comparables = [],
  subjectProperty,
  averageDaysOnMarket = 0,
  suggestedListPrice,
  avgPricePerAcre,
  onSlideSelect,
  slides = [],
}: HeaderProps) {
  const { theme } = useTheme();
  const [logoError, setLogoError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isNumberQuery = /^\d+$/.test(searchQuery.trim());
  const minChars = isNumberQuery ? 1 : 3;

  const filteredSlides = searchQuery.trim().length >= minChars
    ? slides.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.number).includes(searchQuery.trim())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  const selectSlide = (slide: { id: string; number: number; title: string }) => {
    const idx = slides.indexOf(slide);
    if (idx >= 0) onSlideSelect?.(idx);
    setSearchOpen(false);
    setSearchQuery('');
  };

  // Theme-aware logo: white logo on dark background (always dark header)
  const logoPath = '/logos/SpyglassRealty_Logo_White.png';

  return (
    <div className="relative h-40 md:h-48 flex-shrink-0" data-testid="presentation-header">
      {/* Spyglass black background */}
      <div 
        className="absolute inset-0 bg-[#222222]"
      />
      
      {/* Subtle pattern overlay for depth */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)`
        }}
      />
      
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="text-white hover:bg-white/20"
              data-testid="button-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            {logoError ? (
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-[#EF4923] tracking-wider">SPYGLASS</span>
                <span className="text-xs text-white/80">REALTY</span>
              </div>
            ) : (
              <img 
                src={logoPath} 
                alt="Spyglass Realty" 
                className="h-8 md:h-10 w-auto max-w-[160px] object-contain"
                data-testid="header-logo"
                onError={() => setLogoError(true)}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <div ref={searchContainerRef} className="relative flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                data-testid="button-search"
                onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); }}
              >
                <Search className="w-5 h-5" />
              </Button>
              {searchOpen && (
                <>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
                      else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, filteredSlides.length - 1)); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
                      else if (e.key === 'Enter' && filteredSlides[highlightedIndex]) { selectSlide(filteredSlides[highlightedIndex]); }
                    }}
                    placeholder="Jump to slide..."
                    className="w-[220px] bg-white text-gray-900 text-sm rounded-md px-3 py-1.5 outline-none placeholder:text-gray-400"
                  />
                  {filteredSlides.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-[260px] bg-white border border-gray-200 rounded-md shadow-lg z-[9999] overflow-hidden">
                      {filteredSlides.map((slide, i) => (
                        <button
                          key={slide.id}
                          className={`w-full text-left px-3 py-2 text-sm ${
                            i === highlightedIndex ? 'bg-[#EF4923] text-white' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          onMouseEnter={() => setHighlightedIndex(i)}
                          onClick={() => selectSlide(slide)}
                        >
                          {slide.number} — {slide.title}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <PdfDownloadButton
              propertyAddress={propertyAddress}
              agent={agent}
              comparables={comparables}
              subjectProperty={subjectProperty}
              averageDaysOnMarket={averageDaysOnMarket}
              suggestedListPrice={suggestedListPrice}
              avgPricePerAcre={avgPricePerAcre}
              preparedFor={preparedFor}
              className="text-white hover:bg-white/20"
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 text-white hover:bg-white/20 px-2"
                  data-testid="button-agent-profile"
                >
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-white/70">{agent.company || 'Spyglass Realty'}</p>
                  </div>
                  <Avatar className="w-10 h-10 border-2 border-white/30">
                    <AvatarImage src={agent.photo} alt={agent.name} className="object-contain" />
                    <AvatarFallback className="bg-[#EF4923] text-white text-sm">
                      {agent.name?.split(' ').map(n => n?.[0]).slice(0, 2).join('').toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end" data-testid="agent-popover">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={agent.photo} alt={agent.name} className="object-contain" />
                      <AvatarFallback className="bg-[#EF4923] text-white">
                        {agent.name?.split(' ').map(n => n?.[0]).slice(0, 2).join('').toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.company || 'Spyglass Realty'}</p>
                    </div>
                  </div>
                  {agent.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${agent.phone}`} className="hover:underline">
                        {agent.phone}
                      </a>
                    </div>
                  )}
                  {agent.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${agent.email}`} className="hover:underline truncate">
                        {agent.email}
                      </a>
                    </div>
                  )}
                  <Button variant="outline" className="w-full gap-2" size="sm">
                    <Mail className="w-4 h-4" />
                    Email Report
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 ml-2"
              data-testid="button-close-header"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 
            className="text-xl md:text-3xl font-bold tracking-wide text-white"
            data-testid="text-header-title"
          >
            COMPARATIVE MARKET ANALYSIS
          </h1>
          <p 
            className="text-sm md:text-base text-gray-200 mt-1"
            data-testid="text-property-address"
          >
            {propertyAddress}
          </p>
          {preparedFor && (
            <p className="text-xs text-gray-300 mt-1">
              Prepared for {preparedFor}
            </p>
          )}
          {mlsNumber && (
            <p 
              className="text-xs text-gray-400"
              data-testid="text-mls-number"
            >
              MLS# {mlsNumber.replace(/^ACT[-]?/i, '')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
