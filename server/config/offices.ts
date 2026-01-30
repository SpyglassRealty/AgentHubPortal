export const SPYGLASS_OFFICES = {
  austin: {
    officeId: 'ACT1518371',
    boardOfficeId: 'ACT5220',
    displayCode: '5220',
    name: 'Spyglass Realty',
    city: 'Austin',
    address: '2130 Goodrich Ave, Austin, TX 78704',
    mlsSource: 'ACTRIS',
  },
};

export type OfficeKey = keyof typeof SPYGLASS_OFFICES;

export function getOfficeConfig(office: string) {
  return SPYGLASS_OFFICES[office as OfficeKey] || null;
}
