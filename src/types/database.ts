// ============================================================
// Hub Soler — Database TypeScript types
// Mirror of the Supabase SQL schema
// ============================================================

export type UserRole = "admin" | "finance" | "operations" | "marketing";
export type TripStatus = "planning" | "in_transit" | "consolidada";
export type TripOrigin = "EUA" | "PY";
export type ExpenseType =
  | "mercadoria"
  | "passagem_aerea"
  | "hotel"
  | "suborno_taxa_extra"
  | "frete"
  | "outros";
export type BatchStatus = "pending" | "approved" | "synced_bling";

// ---- Row types ----

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  origin: TripOrigin;
  start_date: string;
  end_date: string | null;
  estimated_exchange_rate: number;
  final_exchange_rate: number | null;
  status: TripStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TripExpense {
  id: string;
  trip_id: string;
  expense_type: ExpenseType;
  description: string | null;
  amount_usd: number | null;
  amount_brl: number;
  receipt_url: string | null;
  created_at: string;
}

export interface Product {
  sku: string;
  name: string;
  brand: string | null;
  category_id: string;
  model: string;
  variant: string | null;
  base_markup: number;
  weight_kg: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryBatch {
  id: string;
  product_sku: string;
  trip_id: string;
  qty_purchased: number;
  qty_lost_seized: number;
  qty_valid: number; // generated column
  purchase_price_usd: number;
  real_unit_cost_brl: number | null;
  suggested_price_brl: number | null;
  final_price_brl: number | null;
  status: BatchStatus;
  margin_deviation_pct: number | null;
  approved_by: string | null;
  approved_at: string | null;
  synced_to_bling_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlingSyncLog {
  id: string;
  batch_id: string;
  action: string;
  payload: Record<string, unknown>;
  response_code: number | null;
  response_body: Record<string, unknown> | null;
  success: boolean;
  created_at: string;
}

export interface ExpressSale {
  id: string;
  batch_id: string;
  qty_sold: number;
  sale_price_brl: number;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface BlingToken {
  id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  updated_at: string;
  created_at: string;
}

// ---- Insert types (fields required on INSERT, omitting DB-generated ones) ----

export type TripInsert = Omit<Trip, "id" | "created_at" | "updated_at">;
export type TripUpdate = Partial<Omit<Trip, "id" | "created_at" | "updated_at">>;

export type TripExpenseInsert = Omit<TripExpense, "id" | "created_at">;

export type ProductInsert = Omit<Product, "sku" | "created_at" | "updated_at"> & {
  sku?: string; // optional — DB trigger generates it if omitted
};
export type ProductUpdate = Partial<Omit<Product, "sku" | "created_at" | "updated_at">>;

export type InventoryBatchInsert = Omit<
  InventoryBatch,
  "id" | "qty_valid" | "real_unit_cost_brl" | "suggested_price_brl" |
  "margin_deviation_pct" | "approved_by" | "approved_at" |
  "synced_to_bling_at" | "created_at" | "updated_at"
>;
export type InventoryBatchUpdate = Partial<
  Pick<InventoryBatch, "qty_purchased" | "qty_lost_seized" | "final_price_brl" | "status">
>;

export type ExpressSaleInsert = Omit<ExpressSale, "id" | "created_at">;

// ---- Join / DTO types ----

export type BatchWithProduct = InventoryBatch & {
  products: Pick<Product, "name" | "brand" | "base_markup">;
};

export type ProductWithCategory = Product & {
  categories: Category;
};

export type InventoryStockRow = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category_id: string;
  category_name: string;
  category_code: string;
  trip_name: string | null;
  trip_status: Trip["status"] | null;
  qty_purchased: number;
  qty_lost_seized: number;
  qty_valid: number;
  batch_status: InventoryBatch["status"];
};

// ---- Dashboard RPC return type ----

export type TripSummary = {
  id: string;
  name: string;
  origin: TripOrigin;
  status: TripStatus;
  start_date: string;
  end_date: string | null;
  estimated_exchange_rate: number;
  final_exchange_rate: number | null;
  total_items: number;
  total_invested_brl: number;
  avg_margin_pct: number | null;
};

export type DashboardAlert = {
  batch_id: string;
  product_name: string;
  trip_name: string;
  margin_deviation_pct: number;
  base_markup: number;
};

// ---- Supabase-compatible Database map (supabase-js v2 shape) ----

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Pick<Profile, "full_name" | "role" | "avatar_url">>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at">;
        Update: Partial<Pick<Category, "name" | "code" | "description">>;
        Relationships: [];
      };
      trips: {
        Row: Trip;
        Insert: TripInsert;
        Update: TripUpdate;
        Relationships: [];
      };
      trip_expenses: {
        Row: TripExpense;
        Insert: TripExpenseInsert;
        Update: Partial<TripExpenseInsert>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      inventory_batches: {
        Row: InventoryBatch;
        Insert: InventoryBatchInsert;
        Update: InventoryBatchUpdate;
        Relationships: [];
      };
      bling_sync_log: {
        Row: BlingSyncLog;
        Insert: Omit<BlingSyncLog, "id" | "created_at">;
        Update: Partial<Omit<BlingSyncLog, "id" | "created_at">>;
        Relationships: [];
      };
      express_sales: {
        Row: ExpressSale;
        Insert: ExpressSaleInsert;
        Update: Partial<ExpressSaleInsert>;
        Relationships: [];
      };
      bling_tokens: {
        Row: BlingToken;
        Insert: Omit<BlingToken, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BlingToken, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      get_trip_summaries: {
        Args: Record<string, never>;
        Returns: TripSummary[];
      };
      get_dashboard_alerts: {
        Args: Record<string, never>;
        Returns: DashboardAlert[];
      };
      get_dashboard_kpis: {
        Args: Record<string, never>;
        Returns: {
          total_invested_brl: number;
          total_revenue_brl: number;
          net_profit_brl: number;
          roi_pct: number;
        }[];
      };
      recalculate_trip_costs: {
        Args: { p_trip_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      trip_status: TripStatus;
      trip_origin: TripOrigin;
      expense_type: ExpenseType;
      batch_status: BatchStatus;
    };
    CompositeTypes: {};
  };
}
