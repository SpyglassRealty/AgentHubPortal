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
    staleTime: 0, // Always refetch on mount to ensure fresh data after page refresh
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
    <div className="h-full w-full flex flex-col bg-white" data-testid="spyglass-resources-widget">
      <div className="flex-1 flex items-center justify-center p-8">
        {isLoading ? (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 text-sm mt-4">Loading resources...</p>
          </div>
        ) : isError ? (
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Resources Unavailable
            </h3>
            <p className="text-gray-600 text-sm">
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
                      className="group cursor-pointer transition-all duration-200 bg-white hover:shadow-md border border-gray-200 hover:border-gray-300 rounded-lg p-4"
                      onClick={(e) => handleResourceClick(resource, e)}
                      data-testid={`resource-item-${resource.id}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Resource Icon */}
                        <div className={`
                          flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
                          ${resource.type === 'link' 
                            ? 'bg-blue-100 text-blue-600' 
                            : resource.type === 'pdf'
                            ? 'bg-red-100 text-red-600'
                            : resource.type === 'doc'
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-green-100 text-green-600'
                          }
                        `}>
                          <ResourceIcon className="w-6 h-6" />
                        </div>
                        
                        {/* Resource Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-lg truncate">
                            {resource.title}
                          </h4>
                          <p className="text-gray-600 text-sm">
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
                            <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                          ) : (
                            <Download className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
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
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {cmaToken ? "No resources have been added yet" : "No resources added yet"}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              {cmaToken
                ? "This agent has not added any resources to share."
                : "Add documents and links in Settings to display them here"}
            </p>
            {!cmaToken && (
              <a 
                href="/settings" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Go to Settings
              </a>
            )}          </div>
        )}
      </div>
    </div>
  );
}
