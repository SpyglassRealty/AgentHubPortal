import { Mail, Phone } from 'lucide-react';
import type { AgentProfile } from '../types';

interface AgentResumeWidgetProps {
  agent: AgentProfile;
}

export function AgentResumeWidget({ agent }: AgentResumeWidgetProps) {
  console.log('[CMA Debug] AgentResumeWidget received agent data:', agent);
  console.log('[CMA Debug] Agent fields check:', {
    hasName: !!agent?.name,
    hasPhoto: !!agent?.photo,
    hasEmail: !!agent?.email,
    hasTitle: !!agent?.title,
    hasBio: !!agent?.bio,
    hasPhone: !!agent?.phone,
    actualPhoto: agent?.photo ? `${agent.photo.substring(0, 50)}...` : 'none',
    actualName: agent?.name,
    actualEmail: agent?.email
  });
  
  return (
    <div className="flex flex-col h-full bg-background" data-testid="agent-resume-widget">
      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left column - Agent photo and contact */}
            <div className="flex flex-col items-center md:items-start gap-4 md:w-1/3">
              {agent.photo ? (
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden shadow-md bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  <img
                    src={agent.photo}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                    style={{ minWidth: '128px', minHeight: '128px' }}
                  />
                </div>
              ) : (
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-lg bg-gradient-to-br from-[#EF4923] to-[#EF4923]/80 flex items-center justify-center">
                  <span className="text-4xl font-semibold text-white">
                    {agent.name?.split(' ').map(n => n?.[0]).slice(0, 2).join('') || 
                     agent.email?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
              )}
              
              <div className="text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-semibold">{agent.name || 'Agent Name'}</h2>
                <p className="text-muted-foreground font-medium">{agent.title || 'Licensed Real Estate Agent'}</p>
                <p className="text-muted-foreground">{agent.company}</p>
              </div>

              {/* Contact info */}
              <div className="flex flex-col gap-2 text-sm">
                {agent.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{agent.phone}</span>
                  </div>
                )}
                {agent.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{agent.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Bio */}
            <div className="flex-1 md:w-2/3">
              {agent.bio ? (
                <div className="prose dark:prose-invert max-w-none">
                  {agent.bio.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-base leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-base leading-relaxed mb-4">
                      As a licensed real estate professional with Spyglass Realty, I am dedicated to 
                      providing exceptional service to buyers and sellers in the Austin area. My goal 
                      is to make your real estate transaction as smooth and successful as possible.
                    </p>
                    <p className="text-base leading-relaxed mb-4">
                      With extensive knowledge of the local market and a commitment to personalized service, 
                      I work closely with each client to understand their unique needs and goals. Whether 
                      you're buying your first home, selling a property, or investing in real estate, 
                      I'm here to guide you through every step of the process.
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-6 pt-4 border-t">
                    <strong>Complete your profile:</strong> Go to Settings → Bio & Default Cover Letter to add your personal bio and showcase your unique expertise.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
