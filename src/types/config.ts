export interface Entitlement {
  id: string;
  user_id: string;
  plan: "free" | "paid";
  free_generations_used: number;
  daily_generations_used: number;
  last_generation_date: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  stripe_payment_id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
}
