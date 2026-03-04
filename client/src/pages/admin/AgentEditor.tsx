import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Search, Edit, Save, X, Image, Link, Youtube, Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  headshotUrl: string;
  professionalTitle: string;
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
}

export default function AgentEditor() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (!editingAgent) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/agents/${editingAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAgent),
      });

      if (!res.ok) throw new Error("Failed to save agent");
      
      toast({ title: "Success", description: "Agent updated successfully!" });
      setEditingAgent(null);
      refetch();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save agent", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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

      if (!res.ok) throw new Error("Failed to upload photo");
      
      const { url } = await res.json();
      setEditingAgent({ ...editingAgent, headshotUrl: url });
      toast({ title: "Success", description: "Photo uploaded!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Agent Directory Editor</h1>

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
                onClick={() => setEditingAgent(agent)}
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
                <label className="block text-sm font-medium mb-1">Bio</label>
                <Textarea
                  value={editingAgent.bio}
                  onChange={(e) => setEditingAgent({ ...editingAgent, bio: e.target.value })}
                  rows={6}
                  placeholder="Agent biography..."
                />
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

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  <Save className="mr-2" size={16} />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditingAgent(null)}>
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