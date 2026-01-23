import { Link2Off, Settings, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export function FubNotLinkedBanner() {
  return (
    <div className="rounded-xl p-6 text-center bg-[#FEF2F0] dark:bg-gray-800 border border-[#FBD4CC] dark:border-gray-700">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-[#FDDDD5] dark:bg-gray-700">
        <Link2Off className="w-8 h-8 text-[#EF4923] dark:text-[#F26B4A]" />
      </div>

      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
        Follow Up Boss Not Connected
      </h3>

      <p className="mb-6 max-w-md mx-auto text-gray-600 dark:text-gray-400">
        Connect your Follow Up Boss account to see your leads, anniversaries, birthdays, and tasks here.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/settings?section=profile">
          <Button className="inline-flex items-center gap-2 bg-[#EF4923] hover:bg-[#D4401F] text-white">
            <Settings className="w-4 h-4" />
            Go to Settings
          </Button>
        </Link>
        
        <a
          href="https://www.followupboss.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button 
            variant="outline"
            className="inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            What is Follow Up Boss?
          </Button>
        </a>
      </div>

      <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
        Need help? Contact your administrator to link your account.
      </p>
    </div>
  );
}
