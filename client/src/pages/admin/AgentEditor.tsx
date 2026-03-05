import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Edit, Save, X, Image, Link, Youtube, Facebook, Instagram, Twitter, Linkedin, Plus, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";

interface Agent {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fubEmail?: string;
  bio: string;
  headshotUrl: string;
  professionalTitle: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  languages?: string[];
  specialties?: string[];
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  isVisible: boolean;
  sortOrder: number;
  metaDescription: string;
  subdomain: string;
  officeLocation: string;
  videoUrl?: string;
}

export default function AgentEditor() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const availableOffices = ["Austin", "Houston", "Corpus Christi"];

  const { data: agents = [], refetch } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/agents?limit=500");
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data = await res.json();
      return data.agents;
    },
  });

  const filteredAgents = agents.filter(
    (agent) =>
      agent.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNew = () => {
    const newAgent: Agent = {
      id: 'new',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      fubEmail: '',
      bio: '',
      headshotUrl: '',
      professionalTitle: '',
      licenseNumber: '',
      yearsOfExperience: undefined,
      languages: [],
      specialties: [],
      socialLinks: {},
      isVisible: true,
      sortOrder: 0,
      metaDescription: '',
      subdomain: '',
      officeLocation: '',
      videoUrl: ''
    };
    setEditingAgent(newAgent);
    setIsCreatingNew(true);
  };

  const handleSave = async () => {
    if (!editingAgent) return;
    
    setIsSaving(true);
    try {
      const isNew = editingAgent.id === 'new';
      const url = isNew ? '/api/admin/agents' : `/api/admin/agents/${editingAgent.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      // Don't send the 'new' id for creation
      const agentData = isNew 
        ? { ...editingAgent, id: undefined }
        : editingAgent;
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentData),
      });

      if (!res.ok) throw new Error(isNew ? "Failed to create agent" : "Failed to save agent");
      
      toast({ 
        title: "Success", 
        description: isNew ? "Agent created successfully!" : "Agent updated successfully!" 
      });
      setEditingAgent(null);
      setIsCreatingNew(false);
      refetch();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: isCreatingNew ? "Failed to create agent" : "Failed to save agent", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to parse office locations
  const getSelectedOffices = (officeLocation: string) => {
    return officeLocation ? officeLocation.split(',').map(o => o.trim()) : [];
  };

  // Helper function to update office locations
  const toggleOfficeLocation = (office: string) => {
    if (!editingAgent) return;
    
    const currentOffices = getSelectedOffices(editingAgent.officeLocation);
    const newOffices = currentOffices.includes(office)
      ? currentOffices.filter(o => o !== office)
      : [...currentOffices, office];
    
    setEditingAgent({ 
      ...editingAgent, 
      officeLocation: newOffices.join(', ') 
    });
  };

  // Validate video URL
  const isValidVideoUrl = (url: string) => {
    if (!url) return true;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\/.+$/;
    return youtubeRegex.test(url) || vimeoRegex.test(url);
  };

  const handleUploadPhoto = async (file: File) => {
    if (!editingAgent) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("agentId", editingAgent.id.toString());

    try {
      const res = await fetch("/api/admin/agents/upload-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload photo");
      }
      
      const { url } = await res.json();
      setEditingAgent({ ...editingAgent, headshotUrl: url });
      
      if (editingAgent.id === 'new') {
        toast({ 
          title: "Photo Ready", 
          description: "Photo uploaded. It will be saved when you create the agent." 
        });
      } else {
        toast({ title: "Success", description: "Photo uploaded!" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to upload photo", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agent Directory Editor</h1>
        <Button onClick={handleCreateNew} className="bg-[#EF4923] hover:bg-[#D43F1F]">
          <Plus className="mr-2" size={16} />
          Add New Agent
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input
          type="text"
          placeholder="Search agents by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent List */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold mb-3">Agent Directory ({filteredAgents.length})</h2>
          <div className="max-h-[800px] overflow-y-auto space-y-2">
            {filteredAgents.map((agent) => (
              <Card
                key={agent.id}
                className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  editingAgent?.id === agent.id ? "ring-2 ring-[#EF4923]" : ""
                }`}
                onClick={() => {
                  setEditingAgent(agent);
                  setIsCreatingNew(false);
                }}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={agent.headshotUrl || "/api/placeholder/60/60"}
                    alt={`${agent.firstName} ${agent.lastName}`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {agent.firstName} {agent.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{agent.professionalTitle}</p>
                    <p className="text-xs text-gray-500">{agent.email}</p>
                  </div>
                  <Edit className="text-gray-400" size={20} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Editor Panel */}
        {editingAgent && (
          <Card className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-semibold">Edit Agent Profile</h2>
              <button onClick={() => setEditingAgent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Photo Upload */}
              <div className="flex items-center gap-4">
                <img
                  src={editingAgent.headshotUrl || "/api/placeholder/100/100"}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUploadPhoto(e.target.files[0])}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <Input
                    value={editingAgent.firstName}
                    onChange={(e) => setEditingAgent({ ...editingAgent, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <Input
                    value={editingAgent.lastName}
                    onChange={(e) => setEditingAgent({ ...editingAgent, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Professional Title</label>
                <Input
                  value={editingAgent.professionalTitle}
                  onChange={(e) => setEditingAgent({ ...editingAgent, professionalTitle: e.target.value })}
                  placeholder="e.g., REALTOR®, Broker Associate"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={editingAgent.email}
                    onChange={(e) => setEditingAgent({ ...editingAgent, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input
                    value={editingAgent.phone}
                    onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Follow Up Boss Email</label>
                <Input
                  type="email"
                  value={editingAgent.fubEmail || ''}
                  onChange={(e) => setEditingAgent({ ...editingAgent, fubEmail: e.target.value })}
                  placeholder="agent@yourteam.followupboss.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: FUB email for routing leads. If empty, leads will go to agent's main email.
                </p>
              </div>

              {/* Office Locations */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <MapPin className="inline mr-1" size={16} />
                  Office Locations
                </label>
                <div className="space-y-2 p-3 bg-gray-50 rounded">
                  {availableOffices.map((office) => {
                    const isSelected = getSelectedOffices(editingAgent.officeLocation).includes(office);
                    return (
                      <div key={office} className="flex items-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOfficeLocation(office)}
                          className="mr-2"
                        />
                        <label className="text-sm cursor-pointer" onClick={() => toggleOfficeLocation(office)}>
                          {office}
                        </label>
                      </div>
                    );
                  })}
                </div>
                {!editingAgent.officeLocation && (
                  <p className="text-xs text-red-500 mt-1">Please select at least one office location</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <RichTextEditor
                  value={editingAgent.bio}
                  onChange={(value) => setEditingAgent({ ...editingAgent, bio: value })}
                  placeholder="Agent biography..."
                />
              </div>

              {/* Professional Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">License Number</label>
                  <Input
                    value={editingAgent.licenseNumber || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, licenseNumber: e.target.value })}
                    placeholder="e.g., 123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Years of Experience</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingAgent.yearsOfExperience || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, yearsOfExperience: parseInt(e.target.value) || undefined })}
                    placeholder="e.g., 15"
                  />
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium mb-1">Languages Spoken</label>
                <Input
                  value={(editingAgent.languages || []).join(', ')}
                  onChange={(e) => {
                    const languages = e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang);
                    setEditingAgent({ ...editingAgent, languages });
                  }}
                  placeholder="e.g., English, Spanish, Mandarin (comma-separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple languages with commas</p>
              </div>

              {/* Specialties */}
              <div>
                <label className="block text-sm font-medium mb-1">Areas of Expertise</label>
                <Textarea
                  value={(editingAgent.specialties || []).join('\n')}
                  onChange={(e) => {
                    const specialties = e.target.value.split('\n').map(s => s.trim()).filter(s => s);
                    setEditingAgent({ ...editingAgent, specialties });
                  }}
                  rows={4}
                  placeholder="Enter specialties (one per line):&#10;Luxury Homes&#10;First-Time Buyers&#10;Investment Properties&#10;Downtown Austin Condos"
                />
                <p className="text-xs text-gray-500 mt-1">Enter each specialty on a new line</p>
              </div>

              {/* Social Links */}
              <div>
                <label className="block text-sm font-medium mb-2">Social Media Links</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Facebook className="text-gray-400" size={20} />
                    <Input
                      value={editingAgent.socialLinks?.facebook || ""}
                      onChange={(e) =>
                        setEditingAgent({
                          ...editingAgent,
                          socialLinks: { ...editingAgent.socialLinks, facebook: e.target.value },
                        })
                      }
                      placeholder="Facebook URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="text-gray-400" size={20} />
                    <Input
                      value={editingAgent.socialLinks?.instagram || ""}
                      onChange={(e) =>
                        setEditingAgent({
                          ...editingAgent,
                          socialLinks: { ...editingAgent.socialLinks, instagram: e.target.value },
                        })
                      }
                      placeholder="Instagram URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="text-gray-400" size={20} />
                    <Input
                      value={editingAgent.socialLinks?.linkedin || ""}
                      onChange={(e) =>
                        setEditingAgent({
                          ...editingAgent,
                          socialLinks: { ...editingAgent.socialLinks, linkedin: e.target.value },
                        })
                      }
                      placeholder="LinkedIn URL"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube className="text-gray-400" size={20} />
                    <Input
                      value={editingAgent.socialLinks?.youtube || ""}
                      onChange={(e) =>
                        setEditingAgent({
                          ...editingAgent,
                          socialLinks: { ...editingAgent.socialLinks, youtube: e.target.value },
                        })
                      }
                      placeholder="YouTube URL"
                    />
                  </div>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Youtube className="inline mr-1" size={16} />
                  Agent Video URL
                </label>
                <Input
                  value={editingAgent.videoUrl || ""}
                  onChange={(e) => setEditingAgent({ ...editingAgent, videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add a YouTube or Vimeo video link for your agent profile
                </p>
                {editingAgent.videoUrl && !isValidVideoUrl(editingAgent.videoUrl) && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid YouTube or Vimeo URL</p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !editingAgent.officeLocation || (editingAgent.videoUrl && !isValidVideoUrl(editingAgent.videoUrl))} 
                  className="flex-1"
                >
                  <Save className="mr-2" size={16} />
                  {isSaving ? "Saving..." : isCreatingNew ? "Create Agent" : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingAgent(null);
                    setIsCreatingNew(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}