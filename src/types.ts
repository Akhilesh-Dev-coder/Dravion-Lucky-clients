export interface PriceSegment {
  id: number;
  price: number;
  name: string;
  description: string;
  color: string;
  features: string[];
}

export interface SpinRecord {
  spinIndex: number;
  segmentId: number;
  price: number;
  planName: string;
  timestamp: string;
}

export interface LeadSubmission {
  name: string;
  phone: string;
  email: string;
  plan: {
    id: number;
    price: number;
    name: string;
    description: string;
  };
}
