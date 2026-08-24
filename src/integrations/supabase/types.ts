export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_commissions: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          referral_id: string | null
          status: string
        }
        Insert: {
          agent_id: string
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          referral_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          referral_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "agent_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_referrals: {
        Row: {
          agent_id: string
          commission_earned: number
          converted_at: string | null
          created_at: string
          id: string
          referral_type: string
          referred_user_id: string
          status: string
        }
        Insert: {
          agent_id: string
          commission_earned?: number
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_type?: string
          referred_user_id: string
          status?: string
        }
        Update: {
          agent_id?: string
          commission_earned?: number
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_type?: string
          referred_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_referrals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          commission_rate: number
          commission_type: string
          created_at: string
          id: string
          profile_id: string
          referral_code: string
          status: string
          total_earned: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          commission_type?: string
          created_at?: string
          id?: string
          profile_id: string
          referral_code: string
          status?: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          commission_type?: string
          created_at?: string
          id?: string
          profile_id?: string
          referral_code?: string
          status?: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      broadcast_channels: {
        Row: {
          audience_role: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          audience_role?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          audience_role?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          body: string | null
          channel_id: string
          created_at: string
          id: string
          priority: string
          sent_by: string | null
          title: string
        }
        Insert: {
          body?: string | null
          channel_id: string
          created_at?: string
          id?: string
          priority?: string
          sent_by?: string | null
          title: string
        }
        Update: {
          body?: string | null
          channel_id?: string
          created_at?: string
          id?: string
          priority?: string
          sent_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "broadcast_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          cost_delta: number
          created_at: string
          description: string
          id: string
          job_id: string
          proposed_by: string
          signed_at: string | null
          signed_by_customer: boolean
          signed_by_trader: boolean
          status: string
        }
        Insert: {
          cost_delta?: number
          created_at?: string
          description: string
          id?: string
          job_id: string
          proposed_by: string
          signed_at?: string | null
          signed_by_customer?: boolean
          signed_by_trader?: boolean
          status?: string
        }
        Update: {
          cost_delta?: number
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          proposed_by?: string
          signed_at?: string | null
          signed_by_customer?: boolean
          signed_by_trader?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          category: string
          code: string
          id: string
          name: string
          normal_balance: string
          system_account: boolean
        }
        Insert: {
          category: string
          code: string
          id?: string
          name: string
          normal_balance: string
          system_account?: boolean
        }
        Update: {
          category?: string
          code?: string
          id?: string
          name?: string
          normal_balance?: string
          system_account?: boolean
        }
        Relationships: []
      }
      cis_returns: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["cis_status"]
          submitted_at: string | null
          tax_month: string
          totals: Json
          trade_company_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["cis_status"]
          submitted_at?: string | null
          tax_month: string
          totals?: Json
          trade_company_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["cis_status"]
          submitted_at?: string | null
          tax_month?: string
          totals?: Json
          trade_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cis_returns_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_certificates: {
        Row: {
          cert_number: string | null
          cert_type: string
          created_at: string
          data: Json
          expiry_date: string | null
          id: string
          issued_by: string | null
          issued_date: string | null
          job_id: string
          pdf_path: string | null
          status: string
          trade_company_id: string
          updated_at: string
        }
        Insert: {
          cert_number?: string | null
          cert_type: string
          created_at?: string
          data?: Json
          expiry_date?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          job_id: string
          pdf_path?: string | null
          status?: string
          trade_company_id: string
          updated_at?: string
        }
        Update: {
          cert_number?: string | null
          cert_type?: string
          created_at?: string
          data?: Json
          expiry_date?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          job_id?: string
          pdf_path?: string | null
          status?: string
          trade_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certificates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certificates_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoice_lines: {
        Row: {
          description: string
          id: string
          invoice_id: string
          quantity: number
          total_ex_vat: number | null
          unit_price: number
          vat_rate: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total_ex_vat?: number | null
          unit_price?: number
          vat_rate?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total_ex_vat?: number | null
          unit_price?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoices: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          job_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total_amount: number
          trade_company_id: string
          vat_amount: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          job_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total_amount?: number
          trade_company_id: string
          vat_amount?: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          job_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total_amount?: number
          trade_company_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          author_id: string
          created_at: string
          crew_count: number | null
          crew_names: string[] | null
          hours_on_site: number | null
          id: string
          job_id: string
          log_date: string
          notes: string | null
          photos: string[] | null
          safety_incidents: string | null
          temperature_c: number | null
          updated_at: string
          weather: string | null
          wind: string | null
          work_summary: string
        }
        Insert: {
          author_id: string
          created_at?: string
          crew_count?: number | null
          crew_names?: string[] | null
          hours_on_site?: number | null
          id?: string
          job_id: string
          log_date?: string
          notes?: string | null
          photos?: string[] | null
          safety_incidents?: string | null
          temperature_c?: number | null
          updated_at?: string
          weather?: string | null
          wind?: string | null
          work_summary?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          crew_count?: number | null
          crew_names?: string[] | null
          hours_on_site?: number | null
          id?: string
          job_id?: string
          log_date?: string
          notes?: string | null
          photos?: string[] | null
          safety_incidents?: string | null
          temperature_c?: number | null
          updated_at?: string
          weather?: string | null
          wind?: string | null
          work_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          actual_distance_miles: number | null
          assigned_at: string | null
          created_at: string
          delivered_at: string | null
          driver_payout: number
          driver_profile_id: string | null
          estimated_distance_miles: number | null
          id: string
          material_order_id: string
          platform_margin: number
          price_charged: number
          status: Database["public"]["Enums"]["delivery_status"]
        }
        Insert: {
          actual_distance_miles?: number | null
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          driver_payout?: number
          driver_profile_id?: string | null
          estimated_distance_miles?: number | null
          id?: string
          material_order_id: string
          platform_margin?: number
          price_charged?: number
          status?: Database["public"]["Enums"]["delivery_status"]
        }
        Update: {
          actual_distance_miles?: number | null
          assigned_at?: string | null
          created_at?: string
          delivered_at?: string | null
          driver_payout?: number
          driver_profile_id?: string | null
          estimated_distance_miles?: number | null
          id?: string
          material_order_id?: string
          platform_margin?: number
          price_charged?: number
          status?: Database["public"]["Enums"]["delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "deliveries_material_order_id_fkey"
            columns: ["material_order_id"]
            isOneToOne: true
            referencedRelation: "material_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_events: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_id: string
          event_type: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_id: string
          event_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_id?: string
          event_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_rate_card_rows: {
        Row: {
          base_fee: number
          created_at: string
          id: string
          manpower_fee: number
          max_miles: number | null
          min_miles: number
          per_mile_fee: number
          percentage_markup: number
          rate_card_id: string
          urgency: Database["public"]["Enums"]["urgency_level"]
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          base_fee: number
          created_at?: string
          id?: string
          manpower_fee?: number
          max_miles?: number | null
          min_miles?: number
          per_mile_fee: number
          percentage_markup?: number
          rate_card_id: string
          urgency: Database["public"]["Enums"]["urgency_level"]
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          base_fee?: number
          created_at?: string
          id?: string
          manpower_fee?: number
          max_miles?: number | null
          min_miles?: number
          per_mile_fee?: number
          percentage_markup?: number
          rate_card_id?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_rate_card_rows_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "delivery_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_rate_cards: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      dokuvera_case_links: {
        Row: {
          created_at: string
          dokuvera_case_id: string | null
          evidence_pack_url: string | null
          id: string
          job_id: string
          last_error: string | null
          last_synced_at: string | null
          metadata: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dokuvera_case_id?: string | null
          evidence_pack_url?: string | null
          id?: string
          job_id: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dokuvera_case_id?: string | null
          evidence_pack_url?: string | null
          id?: string
          job_id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dokuvera_case_links_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          available: boolean
          can_two_man_lift: boolean
          created_at: string
          max_payload_kg: number | null
          profile_id: string
          vehicle_reg: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          verified: boolean
        }
        Insert: {
          available?: boolean
          can_two_man_lift?: boolean
          created_at?: string
          max_payload_kg?: number | null
          profile_id: string
          vehicle_reg?: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          verified?: boolean
        }
        Update: {
          available?: boolean
          can_two_man_lift?: boolean
          created_at?: string
          max_payload_kg?: number | null
          profile_id?: string
          vehicle_reg?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          annual_salary: number | null
          created_at: string
          email: string | null
          employment_type: string
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          ni_number: string | null
          pay_frequency: string
          payroll_number: string | null
          pension_percent: number | null
          student_loan_plan: string | null
          tax_code: string | null
          trade_company_id: string
        }
        Insert: {
          annual_salary?: number | null
          created_at?: string
          email?: string | null
          employment_type?: string
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          ni_number?: string | null
          pay_frequency?: string
          payroll_number?: string | null
          pension_percent?: number | null
          student_loan_plan?: string | null
          tax_code?: string | null
          trade_company_id: string
        }
        Update: {
          annual_salary?: number | null
          created_at?: string
          email?: string | null
          employment_type?: string
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          ni_number?: string | null
          pay_frequency?: string
          payroll_number?: string | null
          pension_percent?: number | null
          student_loan_plan?: string | null
          tax_code?: string | null
          trade_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_entries: {
        Row: {
          created_at: string
          description: string
          entry_date: string
          entry_type: Database["public"]["Enums"]["accounting_entry_type"]
          id: string
          reference_id: string | null
          reference_table: string | null
          trade_company_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          entry_date?: string
          entry_type: Database["public"]["Enums"]["accounting_entry_type"]
          id?: string
          reference_id?: string | null
          reference_table?: string | null
          trade_company_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["accounting_entry_type"]
          id?: string
          reference_id?: string | null
          reference_table?: string | null
          trade_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_entries_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_lines: {
        Row: {
          account_id: string
          contact_name: string | null
          credit: number
          debit: number
          gl_entry_id: string
          id: string
          tax_code: string | null
        }
        Insert: {
          account_id: string
          contact_name?: string | null
          credit?: number
          debit?: number
          gl_entry_id: string
          id?: string
          tax_code?: string | null
        }
        Update: {
          account_id?: string
          contact_name?: string | null
          credit?: number
          debit?: number
          gl_entry_id?: string
          id?: string
          tax_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_lines_gl_entry_id_fkey"
            columns: ["gl_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          config: Json
          created_at: string
          credential_name: string
          id: string
          merchant_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          credential_name: string
          id?: string
          merchant_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          credential_name?: string
          id?: string
          merchant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_awards: {
        Row: {
          accepted_quote_id: string
          awarded_at: string
          id: string
          job_id: string
          trade_company_id: string
        }
        Insert: {
          accepted_quote_id: string
          awarded_at?: string
          id?: string
          job_id: string
          trade_company_id: string
        }
        Update: {
          accepted_quote_id?: string
          awarded_at?: string
          id?: string
          job_id?: string
          trade_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_awards_accepted_quote_id_fkey"
            columns: ["accepted_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_awards_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_awards_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_media: {
        Row: {
          captured_at: string | null
          created_at: string
          id: string
          job_id: string
          media_type: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          media_type: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          id?: string
          job_id?: string
          media_type?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      job_milestones: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          job_id: string
          proof_note: string | null
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          job_id: string
          proof_note?: string | null
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          job_id?: string
          proof_note?: string | null
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_milestones_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          job_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address_line1: string
          budget_max: number | null
          budget_min: number | null
          city: string
          created_at: string
          customer_profile_id: string
          description: string | null
          exact_address_released: boolean
          id: string
          job_kind: string
          postcode: string
          postcode_sector: string | null
          property_reference: string | null
          repair_priority: string | null
          requested_trade: Database["public"]["Enums"]["trade_type"]
          source_product: string
          source_reference: string | null
          status: Database["public"]["Enums"]["job_status"]
          target_start_date: string | null
          tenancy_reference: string | null
          title: string
          trade_company_id: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          budget_max?: number | null
          budget_min?: number | null
          city: string
          created_at?: string
          customer_profile_id: string
          description?: string | null
          exact_address_released?: boolean
          id?: string
          job_kind?: string
          postcode: string
          postcode_sector?: string | null
          property_reference?: string | null
          repair_priority?: string | null
          requested_trade: Database["public"]["Enums"]["trade_type"]
          source_product?: string
          source_reference?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          target_start_date?: string | null
          tenancy_reference?: string | null
          title: string
          trade_company_id?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          budget_max?: number | null
          budget_min?: number | null
          city?: string
          created_at?: string
          customer_profile_id?: string
          description?: string | null
          exact_address_released?: boolean
          id?: string
          job_kind?: string
          postcode?: string
          postcode_sector?: string | null
          property_reference?: string | null
          repair_priority?: string | null
          requested_trade?: Database["public"]["Enums"]["trade_type"]
          source_product?: string
          source_reference?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          target_start_date?: string | null
          tenancy_reference?: string | null
          title?: string
          trade_company_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_memberships: {
        Row: {
          ends_at: string | null
          id: string
          monthly_fee: number
          plan_code: string
          starts_at: string
          status: string
          trade_company_id: string
        }
        Insert: {
          ends_at?: string | null
          id?: string
          monthly_fee: number
          plan_code: string
          starts_at?: string
          status?: string
          trade_company_id: string
        }
        Update: {
          ends_at?: string | null
          id?: string
          monthly_fee?: number
          plan_code?: string
          starts_at?: string
          status?: string
          trade_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_memberships_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      material_orders: {
        Row: {
          created_at: string
          created_by: string
          delivery_address: string
          delivery_mode: Database["public"]["Enums"]["merchant_delivery_mode"]
          goods_total: number
          id: string
          job_id: string
          manpower_required: number
          merchant_branch_id: string | null
          merchant_delivery_fee: number
          merchant_id: string
          merchant_order_reference: string | null
          notes: string | null
          order_status: Database["public"]["Enums"]["order_status"]
          pickup_address: string | null
          platform_delivery_fee: number
          required_vehicle: Database["public"]["Enums"]["vehicle_type"] | null
          trade_account_id: string | null
          trade_company_id: string
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          created_at?: string
          created_by: string
          delivery_address: string
          delivery_mode: Database["public"]["Enums"]["merchant_delivery_mode"]
          goods_total?: number
          id?: string
          job_id: string
          manpower_required?: number
          merchant_branch_id?: string | null
          merchant_delivery_fee?: number
          merchant_id: string
          merchant_order_reference?: string | null
          notes?: string | null
          order_status?: Database["public"]["Enums"]["order_status"]
          pickup_address?: string | null
          platform_delivery_fee?: number
          required_vehicle?: Database["public"]["Enums"]["vehicle_type"] | null
          trade_account_id?: string | null
          trade_company_id: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          created_at?: string
          created_by?: string
          delivery_address?: string
          delivery_mode?: Database["public"]["Enums"]["merchant_delivery_mode"]
          goods_total?: number
          id?: string
          job_id?: string
          manpower_required?: number
          merchant_branch_id?: string | null
          merchant_delivery_fee?: number
          merchant_id?: string
          merchant_order_reference?: string | null
          notes?: string | null
          order_status?: Database["public"]["Enums"]["order_status"]
          pickup_address?: string | null
          platform_delivery_fee?: number
          required_vehicle?: Database["public"]["Enums"]["vehicle_type"] | null
          trade_account_id?: string | null
          trade_company_id?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "material_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_merchant_branch_id_fkey"
            columns: ["merchant_branch_id"]
            isOneToOne: false
            referencedRelation: "merchant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_trade_account_id_fkey"
            columns: ["trade_account_id"]
            isOneToOne: false
            referencedRelation: "trade_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_branches: {
        Row: {
          address_line1: string | null
          branch_metadata: Json
          branch_name: string | null
          city: string | null
          id: string
          merchant_id: string
          phone: string | null
          postcode: string | null
        }
        Insert: {
          address_line1?: string | null
          branch_metadata?: Json
          branch_name?: string | null
          city?: string | null
          id?: string
          merchant_id: string
          phone?: string | null
          postcode?: string | null
        }
        Update: {
          address_line1?: string | null
          branch_metadata?: Json
          branch_name?: string | null
          city?: string | null
          id?: string
          merchant_id?: string
          phone?: string | null
          postcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_branches_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_catalog_items: {
        Row: {
          category: string | null
          external_sku: string | null
          id: string
          item_name: string
          merchant_branch_id: string | null
          merchant_id: string
          price: number | null
          raw_payload: Json
          source_type: string
          stock_status: string | null
          synced_at: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          external_sku?: string | null
          id?: string
          item_name: string
          merchant_branch_id?: string | null
          merchant_id: string
          price?: number | null
          raw_payload?: Json
          source_type?: string
          stock_status?: string | null
          synced_at?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          external_sku?: string | null
          id?: string
          item_name?: string
          merchant_branch_id?: string | null
          merchant_id?: string
          price?: number | null
          raw_payload?: Json
          source_type?: string
          stock_status?: string | null
          synced_at?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_catalog_items_merchant_branch_id_fkey"
            columns: ["merchant_branch_id"]
            isOneToOne: false
            referencedRelation: "merchant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_catalog_items_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          average_price_band: string
          category: string
          created_at: string
          id: string
          integration_mode: string
          lat: number | null
          lng: number | null
          name: string
          postcode: string | null
          slug: string
          supports_click_collect: boolean
          supports_delivery: boolean
          supports_trade_account: boolean
          type: string
          website_url: string | null
        }
        Insert: {
          average_price_band?: string
          category?: string
          created_at?: string
          id?: string
          integration_mode?: string
          lat?: number | null
          lng?: number | null
          name: string
          postcode?: string | null
          slug: string
          supports_click_collect?: boolean
          supports_delivery?: boolean
          supports_trade_account?: boolean
          type?: string
          website_url?: string | null
        }
        Update: {
          average_price_band?: string
          category?: string
          created_at?: string
          id?: string
          integration_mode?: string
          lat?: number | null
          lng?: number | null
          name?: string
          postcode?: string | null
          slug?: string
          supports_click_collect?: boolean
          supports_delivery?: boolean
          supports_trade_account?: boolean
          type?: string
          website_url?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          job_id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          job_id: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          job_id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          recipient_id: string
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          category: string | null
          id: string
          item_metadata: Json
          item_name: string
          line_total: number | null
          material_order_id: string
          quantity: number
          sku: string | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          category?: string | null
          id?: string
          item_metadata?: Json
          item_name: string
          line_total?: number | null
          material_order_id: string
          quantity?: number
          sku?: string | null
          unit?: string | null
          unit_price?: number
        }
        Update: {
          category?: string | null
          id?: string
          item_metadata?: Json
          item_name?: string
          line_total?: number | null
          material_order_id?: string
          quantity?: number
          sku?: string | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_material_order_id_fkey"
            columns: ["material_order_id"]
            isOneToOne: false
            referencedRelation: "material_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          employee_id: string
          employee_ni: number
          employer_ni: number
          gross_pay: number
          hours_worked: number
          id: string
          net_pay: number
          payroll_run_id: string
          pension: number
          tax: number
        }
        Insert: {
          employee_id: string
          employee_ni?: number
          employer_ni?: number
          gross_pay?: number
          hours_worked?: number
          id?: string
          net_pay?: number
          payroll_run_id: string
          pension?: number
          tax?: number
        }
        Update: {
          employee_id?: string
          employee_ni?: number
          employer_ni?: number
          gross_pay?: number
          hours_worked?: number
          id?: string
          net_pay?: number
          payroll_run_id?: string
          pension?: number
          tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          employer_cost: number
          gross_pay: number
          id: string
          net_pay: number
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payroll_status"]
          trade_company_id: string
        }
        Insert: {
          created_at?: string
          employer_cost?: number
          gross_pay?: number
          id?: string
          net_pay?: number
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payroll_status"]
          trade_company_id: string
        }
        Update: {
          created_at?: string
          employer_cost?: number
          gross_pay?: number
          id?: string
          net_pay?: number
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payroll_status"]
          trade_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      price_quote_items: {
        Row: {
          alternatives: Json
          best_merchant_id: string | null
          best_merchant_name: string | null
          best_price: number
          delivery_cost: number
          delivery_method: string
          has_trade_account: boolean
          id: string
          item_name: string
          line_total: number
          price_quote_id: string
          quantity: number
          retail_price: number | null
          trade_account_price: number | null
          unit: string
        }
        Insert: {
          alternatives?: Json
          best_merchant_id?: string | null
          best_merchant_name?: string | null
          best_price?: number
          delivery_cost?: number
          delivery_method?: string
          has_trade_account?: boolean
          id?: string
          item_name: string
          line_total?: number
          price_quote_id: string
          quantity?: number
          retail_price?: number | null
          trade_account_price?: number | null
          unit?: string
        }
        Update: {
          alternatives?: Json
          best_merchant_id?: string | null
          best_merchant_name?: string | null
          best_price?: number
          delivery_cost?: number
          delivery_method?: string
          has_trade_account?: boolean
          id?: string
          item_name?: string
          line_total?: number
          price_quote_id?: string
          quantity?: number
          retail_price?: number | null
          trade_account_price?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_quote_items_best_merchant_id_fkey"
            columns: ["best_merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_quote_items_price_quote_id_fkey"
            columns: ["price_quote_id"]
            isOneToOne: false
            referencedRelation: "price_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      price_quotes: {
        Row: {
          comparison_data: Json
          created_at: string
          delivery_address: string
          delivery_postcode: string
          id: string
          job_id: string | null
          requested_by: string
          status: string
          total_cost: number
          total_delivery_cost: number
          trade_company_id: string
          updated_at: string
        }
        Insert: {
          comparison_data?: Json
          created_at?: string
          delivery_address?: string
          delivery_postcode: string
          id?: string
          job_id?: string | null
          requested_by: string
          status?: string
          total_cost?: number
          total_delivery_cost?: number
          trade_company_id: string
          updated_at?: string
        }
        Update: {
          comparison_data?: Json
          created_at?: string
          delivery_address?: string
          delivery_postcode?: string
          id?: string
          job_id?: string | null
          requested_by?: string
          status?: string
          total_cost?: number
          total_delivery_cost?: number
          trade_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_quotes_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          cover_image_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          kyc_documents: Json | null
          kyc_status: string
          phone: string | null
          phone_verified: boolean
          rating: number | null
          service_radius_miles: number | null
          services_description: string | null
          trade_bodies: string[] | null
          trade_specialism: Database["public"]["Enums"]["trade_type"] | null
          updated_at: string
          verified: boolean | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          kyc_documents?: Json | null
          kyc_status?: string
          phone?: string | null
          phone_verified?: boolean
          rating?: number | null
          service_radius_miles?: number | null
          services_description?: string | null
          trade_bodies?: string[] | null
          trade_specialism?: Database["public"]["Enums"]["trade_type"] | null
          updated_at?: string
          verified?: boolean | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          kyc_documents?: Json | null
          kyc_status?: string
          phone?: string | null
          phone_verified?: boolean
          rating?: number | null
          service_radius_miles?: number | null
          services_description?: string | null
          trade_bodies?: string[] | null
          trade_specialism?: Database["public"]["Enums"]["trade_type"] | null
          updated_at?: string
          verified?: boolean | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_lines: {
        Row: {
          description: string
          id: string
          line_type: string
          quantity: number
          quote_id: string
          total: number | null
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          line_type: string
          quantity?: number
          quote_id: string
          total?: number | null
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          line_type?: string
          quantity?: number
          quote_id?: string
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          assumptions: Json
          created_at: string
          delivery_estimate: number
          duration_minutes: number | null
          eta_minutes: number | null
          exclusions: Json
          id: string
          job_id: string
          labour_amount: number
          materials_estimate: number
          notes: string | null
          offer_type: string
          status: Database["public"]["Enums"]["quote_status"]
          total_amount: number | null
          trade_company_id: string
          updated_at: string
          warranty_days: number | null
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          delivery_estimate?: number
          duration_minutes?: number | null
          eta_minutes?: number | null
          exclusions?: Json
          id?: string
          job_id: string
          labour_amount?: number
          materials_estimate?: number
          notes?: string | null
          offer_type?: string
          status?: Database["public"]["Enums"]["quote_status"]
          total_amount?: number | null
          trade_company_id: string
          updated_at?: string
          warranty_days?: number | null
        }
        Update: {
          assumptions?: Json
          created_at?: string
          delivery_estimate?: number
          duration_minutes?: number | null
          eta_minutes?: number | null
          exclusions?: Json
          id?: string
          job_id?: string
          labour_amount?: number
          materials_estimate?: number
          notes?: string | null
          offer_type?: string
          status?: Database["public"]["Enums"]["quote_status"]
          total_amount?: number | null
          trade_company_id?: string
          updated_at?: string
          warranty_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_diagnoses: {
        Row: {
          confidence: number
          created_at: string
          emergency_contacts: Json
          emergency_stop: boolean
          estimated_cost: Json
          follow_up_questions: Json
          hazards: Json
          id: string
          job_id: string
          likely_remedies: Json
          model_metadata: Json
          probable_causes: Json
          prohibited_actions: Json
          risk_level: string
          safety_actions: Json
          status: string
          suggested_trade: Database["public"]["Enums"]["trade_type"]
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          emergency_contacts?: Json
          emergency_stop?: boolean
          estimated_cost?: Json
          follow_up_questions?: Json
          hazards?: Json
          id?: string
          job_id: string
          likely_remedies?: Json
          model_metadata?: Json
          probable_causes?: Json
          prohibited_actions?: Json
          risk_level?: string
          safety_actions?: Json
          status?: string
          suggested_trade: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          emergency_contacts?: Json
          emergency_stop?: boolean
          estimated_cost?: Json
          follow_up_questions?: Json
          hazards?: Json
          id?: string
          job_id?: string
          likely_remedies?: Json
          model_metadata?: Json
          probable_causes?: Json
          prohibited_actions?: Json
          risk_level?: string
          safety_actions?: Json
          status?: string
          suggested_trade?: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_diagnoses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_dispatch_invites: {
        Row: {
          created_at: string
          dispatch_round_id: string
          id: string
          job_id: string
          ranking_score: number
          responded_at: string | null
          scoped_payload: Json
          status: string
          trade_company_id: string
        }
        Insert: {
          created_at?: string
          dispatch_round_id: string
          id?: string
          job_id: string
          ranking_score?: number
          responded_at?: string | null
          scoped_payload?: Json
          status?: string
          trade_company_id: string
        }
        Update: {
          created_at?: string
          dispatch_round_id?: string
          id?: string
          job_id?: string
          ranking_score?: number
          responded_at?: string | null
          scoped_payload?: Json
          status?: string
          trade_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_dispatch_invites_dispatch_round_id_fkey"
            columns: ["dispatch_round_id"]
            isOneToOne: false
            referencedRelation: "repair_dispatch_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_dispatch_invites_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_dispatch_invites_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_dispatch_rounds: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          job_id: string
          max_providers: number
          mode: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          job_id: string
          max_providers?: number
          mode?: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          job_id?: string
          max_providers?: number
          mode?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_dispatch_rounds_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_intake_media: {
        Row: {
          captured_at: string | null
          checksum: string | null
          created_at: string
          dokuvera_evidence_id: string | null
          id: string
          job_id: string
          media_type: string
          redacted_storage_path: string | null
          redaction_status: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          captured_at?: string | null
          checksum?: string | null
          created_at?: string
          dokuvera_evidence_id?: string | null
          id?: string
          job_id: string
          media_type: string
          redacted_storage_path?: string | null
          redaction_status?: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          captured_at?: string | null
          checksum?: string | null
          created_at?: string
          dokuvera_evidence_id?: string | null
          id?: string
          job_id?: string
          media_type?: string
          redacted_storage_path?: string | null
          redaction_status?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_intake_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_intake_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_intake_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_integration_outbox: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempts: number
          created_at: string
          delivered_at: string | null
          destination: string
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          payload: Json
          status: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          destination: string
          event_type: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          payload?: Json
          status?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          destination?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          payload?: Json
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          job_id: string
          rating: number
          reviewer_id: string
          trader_profile_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id: string
          rating: number
          reviewer_id: string
          trader_profile_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string
          rating?: number
          reviewer_id?: string
          trader_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      snag_items: {
        Row: {
          created_at: string
          description: string
          id: string
          job_id: string
          photo_path: string | null
          reported_by: string | null
          resolved_at: string | null
          severity: string
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          job_id: string
          photo_path?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          photo_path?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "snag_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snag_items_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snag_items_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_assignments: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          is_active: boolean
          permissions: Json
          trade_company_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          is_active?: boolean
          permissions?: Json
          trade_company_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          is_active?: boolean
          permissions?: Json
          trade_company_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_assignments_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_invoices: {
        Row: {
          cis_deduction_amount: number
          cis_labour_basis: number
          created_at: string
          gross_amount: number | null
          id: string
          invoice_date: string
          invoice_reference: string
          job_id: string | null
          labour_amount: number
          materials_amount: number
          net_payable: number
          status: Database["public"]["Enums"]["invoice_status"]
          subcontractor_id: string
          vat_amount: number
        }
        Insert: {
          cis_deduction_amount?: number
          cis_labour_basis?: number
          created_at?: string
          gross_amount?: number | null
          id?: string
          invoice_date: string
          invoice_reference: string
          job_id?: string | null
          labour_amount?: number
          materials_amount?: number
          net_payable?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subcontractor_id: string
          vat_amount?: number
        }
        Update: {
          cis_deduction_amount?: number
          cis_labour_basis?: number
          created_at?: string
          gross_amount?: number | null
          id?: string
          invoice_date?: string
          invoice_reference?: string
          job_id?: string | null
          labour_amount?: number
          materials_amount?: number
          net_payable?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subcontractor_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invoices_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          cis_rate: number | null
          company_name: string | null
          created_at: string
          full_name: string
          id: string
          ni_number: string | null
          status: Database["public"]["Enums"]["cis_status"]
          trade_company_id: string
          utr: string | null
          verification_number: string | null
        }
        Insert: {
          cis_rate?: number | null
          company_name?: string | null
          created_at?: string
          full_name: string
          id?: string
          ni_number?: string | null
          status?: Database["public"]["Enums"]["cis_status"]
          trade_company_id: string
          utr?: string | null
          verification_number?: string | null
        }
        Update: {
          cis_rate?: number | null
          company_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          ni_number?: string | null
          status?: Database["public"]["Enums"]["cis_status"]
          trade_company_id?: string
          utr?: string | null
          verification_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          product_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          tier: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          product_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          product_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          approved: boolean
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          employee_id: string
          id: string
          job_id: string | null
          notes: string | null
        }
        Insert: {
          approved?: boolean
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          job_id?: string | null
          notes?: string | null
        }
        Update: {
          approved?: boolean
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          job_id?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_accounts: {
        Row: {
          account_name: string | null
          account_reference: string
          created_at: string
          discount_percentage: number | null
          encrypted_credentials: string | null
          id: string
          merchant_id: string
          metadata: Json
          portal_url: string | null
          portal_username: string | null
          trade_company_id: string
          verified: boolean
        }
        Insert: {
          account_name?: string | null
          account_reference: string
          created_at?: string
          discount_percentage?: number | null
          encrypted_credentials?: string | null
          id?: string
          merchant_id: string
          metadata?: Json
          portal_url?: string | null
          portal_username?: string | null
          trade_company_id: string
          verified?: boolean
        }
        Update: {
          account_name?: string | null
          account_reference?: string
          created_at?: string
          discount_percentage?: number | null
          encrypted_credentials?: string | null
          id?: string
          merchant_id?: string
          metadata?: Json
          portal_url?: string | null
          portal_username?: string | null
          trade_company_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trade_accounts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_accounts_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_companies: {
        Row: {
          address_line1: string | null
          cis_registered: boolean
          city: string | null
          company_number: string | null
          created_at: string
          id: string
          legal_name: string
          owner_profile_id: string
          postcode: string | null
          trading_name: string | null
          utr: string | null
          vat_number: string | null
        }
        Insert: {
          address_line1?: string | null
          cis_registered?: boolean
          city?: string | null
          company_number?: string | null
          created_at?: string
          id?: string
          legal_name: string
          owner_profile_id: string
          postcode?: string | null
          trading_name?: string | null
          utr?: string | null
          vat_number?: string | null
        }
        Update: {
          address_line1?: string | null
          cis_registered?: boolean
          city?: string | null
          company_number?: string | null
          created_at?: string
          id?: string
          legal_name?: string
          owner_profile_id?: string
          postcode?: string | null
          trading_name?: string | null
          utr?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_companies_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_companies_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "trader_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_repair_profiles: {
        Row: {
          available: boolean
          capability_verified: boolean
          created_at: string
          credential_expires_at: string | null
          credential_number: string | null
          credential_type: string | null
          credential_verified: boolean
          emergency_work: boolean
          id: string
          insurance_expires_at: string | null
          insurance_verified: boolean
          service_postcode_prefixes: string[]
          trade: Database["public"]["Enums"]["trade_type"]
          trade_company_id: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          capability_verified?: boolean
          created_at?: string
          credential_expires_at?: string | null
          credential_number?: string | null
          credential_type?: string | null
          credential_verified?: boolean
          emergency_work?: boolean
          id?: string
          insurance_expires_at?: string | null
          insurance_verified?: boolean
          service_postcode_prefixes?: string[]
          trade: Database["public"]["Enums"]["trade_type"]
          trade_company_id: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          capability_verified?: boolean
          created_at?: string
          credential_expires_at?: string | null
          credential_number?: string | null
          credential_type?: string | null
          credential_verified?: boolean
          emergency_work?: boolean
          id?: string
          insurance_expires_at?: string | null
          insurance_verified?: boolean
          service_postcode_prefixes?: string[]
          trade?: Database["public"]["Enums"]["trade_type"]
          trade_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_repair_profiles_trade_company_id_fkey"
            columns: ["trade_company_id"]
            isOneToOne: false
            referencedRelation: "trade_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhooks_log: {
        Row: {
          event_name: string
          id: string
          payload: Json
          received_at: string
          source: string
        }
        Insert: {
          event_name: string
          id?: string
          payload: Json
          received_at?: string
          source: string
        }
        Update: {
          event_name?: string
          id?: string
          payload?: Json
          received_at?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      trader_profiles_public: {
        Row: {
          company_name: string | null
          cover_image_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          rating: number | null
          service_radius_miles: number | null
          services_description: string | null
          trade_bodies: string[] | null
          trade_specialism: Database["public"]["Enums"]["trade_type"] | null
          verified: boolean | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          rating?: number | null
          service_radius_miles?: number | null
          services_description?: string | null
          trade_bodies?: string[] | null
          trade_specialism?: Database["public"]["Enums"]["trade_type"] | null
          verified?: boolean | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          company_name?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          rating?: number | null
          service_radius_miles?: number | null
          services_description?: string | null
          trade_bodies?: string[] | null
          trade_specialism?: Database["public"]["Enums"]["trade_type"] | null
          verified?: boolean | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_repair_offer: { Args: { p_quote_id: string }; Returns: string }
      current_tier: { Args: never; Returns: string }
      decline_repair_invite: { Args: { p_invite_id: string }; Returns: string }
      decline_repair_offer: { Args: { p_quote_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_repair_providers: {
        Args: {
          p_limit?: number
          p_postcode_sector: string
          p_rapid?: boolean
          p_trade: Database["public"]["Enums"]["trade_type"]
        }
        Returns: {
          ranking_score: number
          trade_company_id: string
        }[]
      }
      submit_repair_offer: {
        Args: {
          p_assumptions: Json
          p_duration_minutes: number
          p_eta_minutes: number
          p_exclusions: Json
          p_invite_id: string
          p_labour: number
          p_materials: number
          p_notes: string
          p_offer_type: string
          p_warranty_days: number
        }
        Returns: string
      }
      verify_order_status: { Args: { order_id: string }; Returns: Json }
    }
    Enums: {
      accounting_entry_type:
        | "invoice"
        | "bill"
        | "payment"
        | "payroll"
        | "journal"
        | "cis"
        | "driver_payout"
      app_role: "customer" | "trade" | "driver" | "admin" | "agent" | "staff"
      cis_status:
        | "not_applicable"
        | "pending_verification"
        | "verified"
        | "deducted"
        | "filed"
      delivery_status:
        | "unassigned"
        | "broadcast"
        | "assigned"
        | "arrived_at_pickup"
        | "collected"
        | "en_route"
        | "delivered"
        | "failed"
        | "cancelled"
      invoice_status: "draft" | "issued" | "part_paid" | "paid" | "void"
      job_status:
        | "posted"
        | "quoted"
        | "awarded"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      merchant_delivery_mode:
        | "merchant_delivery"
        | "trade_collect"
        | "platform_driver"
      order_status:
        | "draft"
        | "submitted"
        | "confirmed"
        | "ready_for_pickup"
        | "collected"
        | "delivered"
        | "cancelled"
      payroll_status: "draft" | "approved" | "paid"
      quote_status: "submitted" | "accepted" | "rejected" | "withdrawn"
      trade_type:
        | "builder"
        | "plumber"
        | "electrician"
        | "gas_engineer"
        | "tiler"
        | "carpenter"
        | "bricklayer"
        | "mason"
        | "roofer"
        | "plasterer"
        | "painter"
        | "landscaper"
        | "other"
        | "removals"
        | "rubbish_collection"
        | "cleaner"
      urgency_level: "standard" | "priority" | "emergency"
      vehicle_type:
        | "car"
        | "small_van"
        | "medium_van"
        | "large_van"
        | "luton"
        | "flatbed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      accounting_entry_type: [
        "invoice",
        "bill",
        "payment",
        "payroll",
        "journal",
        "cis",
        "driver_payout",
      ],
      app_role: ["customer", "trade", "driver", "admin", "agent", "staff"],
      cis_status: [
        "not_applicable",
        "pending_verification",
        "verified",
        "deducted",
        "filed",
      ],
      delivery_status: [
        "unassigned",
        "broadcast",
        "assigned",
        "arrived_at_pickup",
        "collected",
        "en_route",
        "delivered",
        "failed",
        "cancelled",
      ],
      invoice_status: ["draft", "issued", "part_paid", "paid", "void"],
      job_status: [
        "posted",
        "quoted",
        "awarded",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      merchant_delivery_mode: [
        "merchant_delivery",
        "trade_collect",
        "platform_driver",
      ],
      order_status: [
        "draft",
        "submitted",
        "confirmed",
        "ready_for_pickup",
        "collected",
        "delivered",
        "cancelled",
      ],
      payroll_status: ["draft", "approved", "paid"],
      quote_status: ["submitted", "accepted", "rejected", "withdrawn"],
      trade_type: [
        "builder",
        "plumber",
        "electrician",
        "gas_engineer",
        "tiler",
        "carpenter",
        "bricklayer",
        "mason",
        "roofer",
        "plasterer",
        "painter",
        "landscaper",
        "other",
        "removals",
        "rubbish_collection",
        "cleaner",
      ],
      urgency_level: ["standard", "priority", "emergency"],
      vehicle_type: [
        "car",
        "small_van",
        "medium_van",
        "large_van",
        "luton",
        "flatbed",
      ],
    },
  },
} as const
