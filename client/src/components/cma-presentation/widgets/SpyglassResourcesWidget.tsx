import { useQuery } from '@tanstack/react-query';
import { FileText, Link2, ExternalLink, Download, File, FileImage } from 'lucide-react';
import type { AgentResource } from '@shared/schema';
import type { AgentProfile } from '../types';

interface SpyglassResourcesWidgetProps {
  agent: AgentProfile;
  cmaToken?: string;
}

function getResourceIcon(resource: AgentResource) {
  if (resource.type === 'link') {
    return Link2;
  }
  if (resource.type === 'pdf') {
    return FileText;
  }
  if (resource.type === 'doc') {
    return File;
  }
  if (resource.type === 'image') {
    return FileImage;
  }
  return File;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function SpyglassResourcesWidget({ agent, cmaToken }: SpyglassResourcesWidgetProps) {

  const queryKey = cmaToken
    ? [`/api/shared/cma/${cmaToken}/resources`]
    : ["/api/settings/resources"];

  const { data: resourcesData, isLoading, isError } = useQuery<{ resources: AgentResource[] }>({
    queryKey,
    queryFn: async () => {
      const endpoint = cmaToken
        ? `/api/shared/cma/${cmaToken}/resources`
        : `/api/settings/resources`;
      
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
    staleTime: 60000,
    retry: false,
  });

  const resources = resourcesData?.resources || [];

  const handleResourceClick = (resource: AgentResource, e: React.MouseEvent) => {
    if (resource.type === 'link') {
      window.open(resource.redirectUrl || '#', '_blank');
      return;
    }

    // For files, open the download endpoint in a new tab
    const downloadUrl = `/api/resources/${resource.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-900 to-black" data-testid="spyglass-resources-widget">
      <div className="flex-1 flex items-center justify-center p-8">
        {isLoading ? (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 text-sm mt-4">Loading resources...</p>
          </div>
        ) : isError ? (
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Resources Unavailable
            </h3>
            <p className="text-gray-400 text-sm">
              Resources could not be loaded at this time.
            </p>
          </div>
        ) : resources.length > 0 ? (
          <div className="w-full max-w-3xl">
            <div className="space-y-4">
              {resources
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((resource) => {
                  const ResourceIcon = getResourceIcon(resource);
                  const isFile = resource.type !== 'link';
                  
                  return (
                    <div
                      key={resource.id}
                      className="group cursor-pointer transition-all duration-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-4"
                      onClick={(e) => handleResourceClick(resource, e)}
                      data-testid={`resource-item-${resource.id}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Resource Icon */}
                        <div className={`
                          flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
                          ${resource.type === 'link' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : resource.type === 'pdf'
                            ? 'bg-red-500/20 text-red-400'
                            : resource.type === 'doc'
                            ? 'bg-blue-600/20 text-blue-400' 
                            : 'bg-green-500/20 text-green-400'
                          }
                        `}>
                          <ResourceIcon className="w-6 h-6" />
                        </div>
                        
                        {/* Resource Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white text-lg truncate">
                            {resource.title}
                          </h4>
                          <p className="text-gray-400 text-sm">
                            {resource.type === 'link' 
                              ? 'Link' 
                              : resource.fileSize 
                                ? formatFileSize(resource.fileSize)
                                : 'File'
                            }
                          </p>
                        </div>

                        {/* Action Icon */}
                        <div className="flex-shrink-0">
                          {resource.type === 'link' ? (
                            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                          ) : (
                            <Download className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            }
            </div>
          </div>
        ) : (
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              No Resources Available
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {cmaToken
                ? "This agent has not added any resources to share."
                : "Add helpful documents and links for your clients in Settings."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
