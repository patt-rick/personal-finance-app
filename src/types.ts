export interface Business {
  id: string;
  name: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  businessId: string;
}
