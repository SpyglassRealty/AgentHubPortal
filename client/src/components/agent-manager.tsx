import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Plus, 
  UserCheck, 
  Star,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  DollarSign,
  Award,
  Shield,
  Edit,
  MessageSquare,
  Settings,
  Search,
  Filter
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseState: string;
  role: 'listing' | 'buying' | 'dual' | 'referral';
  brokerage: string;
  specialties: string[];
  yearsExperience: number;
  totalTransactions: number;
  averagePrice: number;
  rating: number;
  profileImage?: string;
  bio?: string;
  languages: string[];
  areas: string[];
  certifications: string[];
  isActive: boolean;
  lastActive: string;
  preferredContact: 'phone' | 'email' | 'text';
  commission: {
    rate: number;
    type: 'percentage' | 'flat';
    splits?: {
      agent: number;
      brokerage: number;
    };
  };
}

interface TransactionAgent {
  agentId: string;
  role: 'listing_agent' | 'buyer_agent' | 'dual_agent' | 'cooperating_agent' | 'referral_agent';
  primary: boolean;
  commissionRate?: number;
  addedAt: string;
  addedBy: string;
  status: 'active' | 'inactive' | 'pending';
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'Ryan Rodenbeck',
    email: 'ryan@spyglassrealty.com',
    phone: '+1 (512) 965-1480',
    licenseNumber: 'TX-12345678',
    licenseState: 'Texas',
    role: 'dual',
    brokerage: 'Spyglass Realty',
    specialties: ['Luxury Homes', 'Investment Properties', 'New Construction'],
    yearsExperience: 8,
    totalTransactions: 247,
    averagePrice: 650000,
    rating: 4.9,
    profileImage: '/avatars/ryan.jpg',
    bio: 'Founder of Spyglass Realty with expertise in luxury and investment properties in Austin.',
    languages: ['English', 'Spanish'],
    areas: ['Central Austin', 'South Austin', 'West Lake Hills'],
    certifications: ['GRI', 'CRS', 'ABR'],
    isActive: true,
    lastActive: '2026-03-08T06:00:00Z',
    preferredContact: 'phone',
    commission: {
      rate: 3.0,
      type: 'percentage',
      splits: { agent: 85, brokerage: 15 }
    }
  },
  {
    id: 'agent-2',
    name: 'Sunny Martinez',
    email: 'sunny@spyglassrealty.com',
    phone: '+1 (512) 555-0102',
    licenseNumber: 'TX-87654321',
    licenseState: 'Texas',
    role: 'buying',
    brokerage: 'Spyglass Realty',
    specialties: ['First-Time Buyers', 'Condos', 'Urban Living'],
    yearsExperience: 5,
    totalTransactions: 123,
    averagePrice: 425000,
    rating: 4.8,
    bio: 'Transaction Coordinator turned agent specializing in first-time homebuyers.',
    languages: ['English', 'Spanish'],
    areas: ['East Austin', 'Downtown', 'Mueller'],
    certifications: ['ABR', 'SFR'],
    isActive: true,
    lastActive: '2026-03-07T22:15:00Z',
    preferredContact: 'email',
    commission: {
      rate: 2.5,
      type: 'percentage',
      splits: { agent: 80, brokerage: 20 }
    }
  },
  {
    id: 'agent-3',
    name: 'Trish Martinez',
    email: 'trish@spyglassrealty.com',
    phone: '+1 (512) 555-0103',
    licenseNumber: 'TX-11223344',
    licenseState: 'Texas',
    role: 'listing',
    brokerage: 'Spyglass Realty',
    specialties: ['Marketing', 'Staging', 'Luxury Listings'],
    yearsExperience: 6,
    totalTransactions: 156,
    averagePrice: 750000,
    rating: 4.9,
    bio: 'Marketing Manager with expertise in luxury property marketing and staging.',
    languages: ['English'],
    areas: ['Westlake', 'Tarrytown', 'Rollingwood'],
    certifications: ['GRI', 'CLHMS'],
    isActive: true,
    lastActive: '2026-03-07T20:30:00Z',
    preferredContact: 'text',
    commission: {
      rate: 3.0,
      type: 'percentage',
      splits: { agent: 85, brokerage: 15 }
    }
  }
];

const EXTERNAL_AGENTS: Agent[] = [
  {
    id: 'ext-1',
    name: 'Michael Johnson',
    email: 'mjohnson@kw.com',
    phone: '+1 (512) 555-0201',
    licenseNumber: 'TX-55667788',
    licenseState: 'Texas',
    role: 'buying',
    brokerage: 'Keller Williams',
    specialties: ['Relocation', 'Corporate Clients'],
    yearsExperience: 12,
    totalTransactions: 312,
    averagePrice: 580000,
    rating: 4.7,
    languages: ['English'],
    areas: ['North Austin', 'Round Rock', 'Cedar Park'],
    certifications: ['CRS', 'RRC'],
    isActive: true,
    lastActive: '2026-03-07T18:45:00Z',
    preferredContact: 'phone',
    commission: {
      rate: 2.5,
      type: 'percentage'
    }
  }
];

interface AgentManagerProps {
  transactionId: string;
  transactionType: string;
}

export function AgentManager({ transactionId, transactionType }: AgentManagerProps) {
  const [transactionAgents, setTransactionAgents] = useState<TransactionAgent[]>([
    {
      agentId: 'agent-1',
      role: 'listing_agent',
      primary: true,
      commissionRate: 3.0,
      addedAt: '2026-03-07T10:00:00Z',
      addedBy: 'System',
      status: 'active'
    }
  ]);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const availableAgents = [...MOCK_AGENTS, ...EXTERNAL_AGENTS];
  const assignedAgentIds = transactionAgents.map(ta => ta.agentId);

  const filteredAgents = availableAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.brokerage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || agent.role === filterRole || agent.role === 'dual';
    const notAssigned = !assignedAgentIds.includes(agent.id);
    
    return matchesSearch && matchesRole && notAssigned;
  });

  const assignedAgents = transactionAgents.map(ta => {
    const agent = availableAgents.find(a => a.id === ta.agentId);
    return agent ? { ...agent, transactionRole: ta } : null;
  }).filter(Boolean) as (Agent & { transactionRole: TransactionAgent })[];

  const addAgentToTransaction = (agent: Agent, role: string, commissionRate?: number) => {
    const newTransactionAgent: TransactionAgent = {
      agentId: agent.id,
      role: role as any,
      primary: transactionAgents.length === 0,
      commissionRate: commissionRate || agent.commission.rate,
      addedAt: new Date().toISOString(),
      addedBy: 'Current User',
      status: 'active'
    };

    setTransactionAgents([...transactionAgents, newTransactionAgent]);
    setAddAgentOpen(false);
  };

  const removeAgentFromTransaction = (agentId: string) => {
    setTransactionAgents(transactionAgents.filter(ta => ta.agentId !== agentId));
  };

  const updateAgentRole = (agentId: string, newRole: string) => {
    setTransactionAgents(transactionAgents.map(ta => 
      ta.agentId === agentId ? { ...ta, role: newRole as any } : ta
    ));
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      'listing_agent': 'Listing Agent',
      'buyer_agent': 'Buyer Agent',
      'dual_agent': 'Dual Agent',
      'cooperating_agent': 'Cooperating Agent',
      'referral_agent': 'Referral Agent'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap = {
      'listing_agent': 'bg-green-100 text-green-800',
      'buyer_agent': 'bg-blue-100 text-blue-800',
      'dual_agent': 'bg-purple-100 text-purple-800',
      'cooperating_agent': 'bg-orange-100 text-orange-800',
      'referral_agent': 'bg-yellow-100 text-yellow-800'
    };
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-[#EF4923]" />
            Agent Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage agents and their roles in this transaction
          </p>
        </div>
        <Button onClick={() => setAddAgentOpen(true)} className="bg-[#EF4923] hover:bg-[#D4401F]">
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Transaction Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Assigned Agents ({assignedAgents.length})
          </CardTitle>
          <CardDescription>
            Agents currently assigned to this transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignedAgents.map((agent) => (
              <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={agent.profileImage} />
                      <AvatarFallback>
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{agent.name}</h3>
                        <Badge className={getRoleBadgeColor(agent.transactionRole.role)}>
                          {getRoleDisplayName(agent.transactionRole.role)}
                        </Badge>
                        {agent.transactionRole.primary && (
                          <Badge variant="outline">Primary</Badge>
                        )}
                        {agent.brokerage !== 'Spyglass Realty' && (
                          <Badge variant="secondary">External</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {agent.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {agent.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          {agent.licenseNumber}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{agent.brokerage}</span>
                        <span>{agent.yearsExperience} years exp</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current text-yellow-500" />
                          {agent.rating}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {agent.transactionRole.commissionRate}%
                        </div>
                      </div>

                      {agent.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select
                      value={agent.transactionRole.role}
                      onValueChange={(value) => updateAgentRole(agent.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="listing_agent">Listing Agent</SelectItem>
                        <SelectItem value="buyer_agent">Buyer Agent</SelectItem>
                        <SelectItem value="dual_agent">Dual Agent</SelectItem>
                        <SelectItem value="cooperating_agent">Cooperating Agent</SelectItem>
                        <SelectItem value="referral_agent">Referral Agent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAgentFromTransaction(agent.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {assignedAgents.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No agents assigned</h3>
                <p className="text-gray-600 mb-4">
                  Add agents to this transaction to manage roles and commissions
                </p>
                <Button onClick={() => setAddAgentOpen(true)} className="bg-[#EF4923] hover:bg-[#D4401F]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Agent
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commission Summary */}
      {assignedAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Commission Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800">Total Commission</h3>
                <p className="text-2xl font-bold text-green-600">
                  {assignedAgents.reduce((sum, agent) => sum + (agent.transactionRole.commissionRate || 0), 0).toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800">Listing Side</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {assignedAgents
                    .filter(agent => agent.transactionRole.role === 'listing_agent')
                    .reduce((sum, agent) => sum + (agent.transactionRole.commissionRate || 0), 0)
                    .toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-800">Buying Side</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {assignedAgents
                    .filter(agent => agent.transactionRole.role === 'buyer_agent')
                    .reduce((sum, agent) => sum + (agent.transactionRole.commissionRate || 0), 0)
                    .toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Agent Dialog */}
      <Dialog open={addAgentOpen} onOpenChange={setAddAgentOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Agent to Transaction</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search agents by name, email, or brokerage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="listing">Listing Agents</SelectItem>
                  <SelectItem value="buying">Buying Agents</SelectItem>
                  <SelectItem value="dual">Dual Agents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agent Tabs */}
            <Tabs defaultValue="internal" className="w-full">
              <TabsList>
                <TabsTrigger value="internal">Spyglass Agents</TabsTrigger>
                <TabsTrigger value="external">External Agents</TabsTrigger>
                <TabsTrigger value="new">Add New Agent</TabsTrigger>
              </TabsList>

              <TabsContent value="internal" className="space-y-4">
                {filteredAgents.filter(agent => agent.brokerage === 'Spyglass Realty').map((agent) => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    onAdd={(role, commission) => addAgentToTransaction(agent, role, commission)} 
                  />
                ))}
              </TabsContent>

              <TabsContent value="external" className="space-y-4">
                {filteredAgents.filter(agent => agent.brokerage !== 'Spyglass Realty').map((agent) => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    onAdd={(role, commission) => addAgentToTransaction(agent, role, commission)} 
                  />
                ))}
              </TabsContent>

              <TabsContent value="new">
                <NewAgentForm />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentCard({ agent, onAdd }: { agent: Agent; onAdd: (role: string, commission?: number) => void }) {
  const [selectedRole, setSelectedRole] = useState('buyer_agent');
  const [commission, setCommission] = useState(agent.commission.rate);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage src={agent.profileImage} />
            <AvatarFallback>
              {agent.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{agent.name}</h3>
              <Badge variant={agent.brokerage === 'Spyglass Realty' ? 'default' : 'secondary'}>
                {agent.brokerage}
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                {agent.rating}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
              <div>{agent.email}</div>
              <div>{agent.phone}</div>
              <div>{agent.licenseNumber}</div>
              <div>{agent.yearsExperience} years, {agent.totalTransactions} transactions</div>
            </div>

            {agent.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {agent.specialties.slice(0, 3).map((specialty) => (
                  <Badge key={specialty} variant="outline" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <Label className="text-xs">Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listing_agent">Listing</SelectItem>
                <SelectItem value="buyer_agent">Buyer</SelectItem>
                <SelectItem value="dual_agent">Dual</SelectItem>
                <SelectItem value="cooperating_agent">Cooperating</SelectItem>
                <SelectItem value="referral_agent">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-right">
            <Label className="text-xs">Commission %</Label>
            <Input
              type="number"
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
              className="w-20"
              step="0.1"
              min="0"
              max="10"
            />
          </div>
          
          <Button 
            onClick={() => onAdd(selectedRole, commission)}
            className="bg-[#EF4923] hover:bg-[#D4401F]"
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewAgentForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    brokerage: '',
    commission: 2.5
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Full Name</Label>
          <Input 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Agent's full name"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input 
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="agent@brokerage.com"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <Label>License Number</Label>
          <Input 
            value={formData.licenseNumber}
            onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
            placeholder="TX-12345678"
          />
        </div>
        <div>
          <Label>Brokerage</Label>
          <Input 
            value={formData.brokerage}
            onChange={(e) => setFormData({...formData, brokerage: e.target.value})}
            placeholder="Brokerage Name"
          />
        </div>
        <div>
          <Label>Commission Rate (%)</Label>
          <Input 
            type="number"
            value={formData.commission}
            onChange={(e) => setFormData({...formData, commission: Number(e.target.value)})}
            step="0.1"
            min="0"
            max="10"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-[#EF4923] hover:bg-[#D4401F]">
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>
    </div>
  );
}