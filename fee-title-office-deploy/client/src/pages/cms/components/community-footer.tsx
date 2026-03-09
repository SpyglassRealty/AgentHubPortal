import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Clock, Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";

interface FooterData {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  quickLinks: Array<{
    label: string;
    url: string;
  }>;
  description: string;
  logoUrl?: string;
}

const DEFAULT_FOOTER_DATA: FooterData = {
  companyName: "Your Real Estate Company",
  address: "123 Main Street, Austin, TX 78701",
  phone: "(512) 555-0123",
  email: "info@yourcompany.com",
  hours: "Monday - Friday: 9:00 AM - 6:00 PM",
  socialLinks: {},
  quickLinks: [
    { label: "Home", url: "/" },
    { label: "Communities", url: "/communities" },
    { label: "About", url: "/about" },
    { label: "Contact", url: "/contact" },
  ],
  description: "Your trusted partner in Austin real estate. We help you find the perfect home in the perfect community.",
};

interface CommunityFooterProps {
  data?: Partial<FooterData>;
  className?: string;
}

export function CommunityFooter({ data, className = "" }: CommunityFooterProps) {
  const [footerData, setFooterData] = useState<FooterData>(DEFAULT_FOOTER_DATA);

  useEffect(() => {
    // Merge provided data with defaults
    setFooterData({ ...DEFAULT_FOOTER_DATA, ...data });
  }, [data]);

  return (
    <footer className={`bg-slate-900 text-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="mb-4">
              {footerData.logoUrl ? (
                <img src={footerData.logoUrl} alt={footerData.companyName} className="h-10 mb-4" />
              ) : (
                <h3 className="text-xl font-bold">{footerData.companyName}</h3>
              )}
            </div>
            <p className="text-slate-300 mb-6 max-w-md">
              {footerData.description}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-3 text-slate-400" />
                <span>{footerData.address}</span>
              </div>
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-3 text-slate-400" />
                <a href={`tel:${footerData.phone}`} className="hover:text-blue-400 transition-colors">
                  {footerData.phone}
                </a>
              </div>
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 mr-3 text-slate-400" />
                <a href={`mailto:${footerData.email}`} className="hover:text-blue-400 transition-colors">
                  {footerData.email}
                </a>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-3 text-slate-400" />
                <span>{footerData.hours}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <nav className="space-y-2">
              {footerData.quickLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className="block text-sm text-slate-300 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              {footerData.socialLinks.facebook && (
                <a
                  href={footerData.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {footerData.socialLinks.twitter && (
                <a
                  href={footerData.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {footerData.socialLinks.instagram && (
                <a
                  href={footerData.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-pink-400 transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {footerData.socialLinks.linkedin && (
                <a
                  href={footerData.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {footerData.socialLinks.youtube && (
                <a
                  href={footerData.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              )}
            </div>

            {/* Newsletter Signup */}
            <div className="mt-6">
              <h5 className="text-sm font-medium mb-2">Stay Updated</h5>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter email"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-l-md text-sm focus:outline-none focus:border-blue-500"
                />
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-r-md text-sm font-medium transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} {footerData.companyName}. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="/sitemap" className="hover:text-white transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Hook for loading footer data from the server
export function useFooterData() {
  const [footerData, setFooterData] = useState<FooterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFooterData() {
      try {
        const response = await fetch('/api/cms/footer-settings');
        if (response.ok) {
          const data = await response.json();
          setFooterData(data);
        } else {
          setFooterData(DEFAULT_FOOTER_DATA);
        }
      } catch (error) {
        console.error('Failed to load footer data:', error);
        setFooterData(DEFAULT_FOOTER_DATA);
      } finally {
        setLoading(false);
      }
    }
    
    loadFooterData();
  }, []);

  return { footerData, loading };
}