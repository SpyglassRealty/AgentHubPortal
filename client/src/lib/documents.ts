export const DOCUMENTS = {
  companyHandbook: {
    id: 'company-handbook',
    title: 'New Agent Handbook',
    docId: '13EJYTRJ9QAXOdJH1H6Vyvh6iBaUsVJcUORxw6PuDcVM',
    externalUrl: 'https://docs.google.com/document/d/13EJYTRJ9QAXOdJH1H6Vyvh6iBaUsVJcUORxw6PuDcVM/edit',
    description: 'Everything you need to know as a new agent at Spyglass Realty'
  },
  brandGuidelines: {
    id: 'brand-guidelines',
    title: 'Brand Guidelines',
    docId: '1LKeF3DPqWelqF-ESWzJe3FEVewVTNaDCt4yv3rMz740',
    externalUrl: 'https://docs.google.com/document/d/1LKeF3DPqWelqF-ESWzJe3FEVewVTNaDCt4yv3rMz740/edit',
    description: 'Spyglass Realty branding standards and guidelines'
  }
} as const;

export type DocumentKey = keyof typeof DOCUMENTS;
