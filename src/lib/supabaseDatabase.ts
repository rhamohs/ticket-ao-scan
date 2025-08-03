import { supabase, DbTicket, DbValidationHistory } from './supabase';
import { Ticket, ValidationHistory } from '@/types/ticket';
import { TicketDatabase } from './database';

class SupabaseTicketDatabase {
  private fallbackDB = new TicketDatabase();
  private isSupabaseAvailable = !!supabase;

  // Initialize tables if they don't exist
  async initializeTables() {
    if (!this.isSupabaseAvailable) {
      console.warn('Supabase not available, using local database');
      return;
    }

    try {
      // Create tickets table
      const { error: ticketsError } = await supabase.rpc('create_tickets_table_if_not_exists');
      if (ticketsError) console.warn('Tickets table creation:', ticketsError);

      // Create validation_history table
      const { error: historyError } = await supabase.rpc('create_validation_history_table_if_not_exists');
      if (historyError) console.warn('Validation history table creation:', historyError);
    } catch (error) {
      console.warn('Table initialization error:', error);
      this.isSupabaseAvailable = false;
    }
  }

  // Import tickets from CSV data
  async importTickets(csvData: any[]): Promise<number> {
    if (!this.isSupabaseAvailable) {
      this.fallbackDB.importTickets(csvData);
      return csvData.length;
    }

    try {
      // Clear existing tickets
      await supabase!.from('tickets').delete().neq('id', '');

      const tickets: DbTicket[] = csvData.map((row, index) => ({
        id: row.ID || row.id || `ticket_${index}`,
        qr_code: row['Código QR'] || row.qrCode || row.code,
        status: this.normalizeStatus(row['Status de Validação'] || row.status || 'valid'),
        validation_date: row['Data/Hora da Validação'] || row.validationDate,
        validation_count: parseInt(row['Número de utilizações'] || row.validationCount || '0'),
        event_name: row['Nome do Evento'] || row.eventName || 'Evento'
      }));

      const { error } = await supabase!
        .from('tickets')
        .upsert(tickets, { onConflict: 'qr_code' });

      if (error) throw error;

      return tickets.length;
    } catch (error) {
      console.error('Error importing tickets:', error);
      // Fallback to local database
      this.isSupabaseAvailable = false;
      this.fallbackDB.importTickets(csvData);
      return csvData.length;
    }
  }

  private normalizeStatus(status: string): 'valid' | 'used' | 'invalid' {
    const normalized = status.toLowerCase();
    if (normalized.includes('usado') || normalized.includes('used')) return 'used';
    if (normalized.includes('válido') || normalized.includes('valid')) return 'valid';
    return 'invalid';
  }

  // Validate a QR code
  async validateTicket(qrCode: string): Promise<{ success: boolean; ticket?: Ticket; message: string; status: 'valid' | 'used' | 'not_found' }> {
    if (!this.isSupabaseAvailable) {
      return this.fallbackDB.validateTicket(qrCode);
    }

    try {
      // Get ticket from database
      const { data: ticket, error } = await supabase!
        .from('tickets')
        .select('*')
        .eq('qr_code', qrCode)
        .single();

      if (error || !ticket) {
        return {
          success: false,
          message: 'Ingresso não encontrado',
          status: 'not_found'
        };
      }

      if (ticket.status === 'used') {
        return {
          success: false,
          ticket: this.mapDbTicketToTicket(ticket),
          message: `Ingresso já usado. Primeira validação: ${ticket.validation_date || 'N/A'}`,
          status: 'used'
        };
      }

      // Mark as used and record validation
      const now = new Date().toISOString();
      const { error: updateError } = await supabase!
        .from('tickets')
        .update({
          status: 'used',
          validation_date: now,
          validation_count: ticket.validation_count + 1,
          updated_at: now
        })
        .eq('qr_code', qrCode);

      if (updateError) throw updateError;

      // Add to validation history
      const { error: historyError } = await supabase!
        .from('validation_history')
        .insert({
          ticket_id: ticket.id,
          qr_code: ticket.qr_code,
          validation_date: now,
          event_name: ticket.event_name || 'Evento',
          status: 'validated'
        });

      if (historyError) throw historyError;

      const updatedTicket = {
        ...ticket,
        status: 'used' as const,
        validation_date: now,
        validation_count: ticket.validation_count + 1
      };

      return {
        success: true,
        ticket: this.mapDbTicketToTicket(updatedTicket),
        message: 'Ingresso válido',
        status: 'valid'
      };
    } catch (error) {
      console.error('Error validating ticket:', error);
      // Fallback to local database
      this.isSupabaseAvailable = false;
      return this.fallbackDB.validateTicket(qrCode);
    }
  }

  // Get validation history
  async getValidationHistory(): Promise<ValidationHistory[]> {
    if (!this.isSupabaseAvailable) {
      return this.fallbackDB.getValidationHistory();
    }

    try {
      const { data, error } = await supabase!
        .from('validation_history')
        .select('*')
        .order('validation_date', { ascending: false });

      if (error) throw error;

      return data.map(this.mapDbHistoryToHistory);
    } catch (error) {
      console.error('Error getting validation history:', error);
      this.isSupabaseAvailable = false;
      return this.fallbackDB.getValidationHistory();
    }
  }

  // Get total tickets imported
  async getTotalTickets(): Promise<number> {
    if (!this.isSupabaseAvailable) {
      return this.fallbackDB.getTotalTickets();
    }

    try {
      const { count, error } = await supabase!
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting total tickets:', error);
      this.isSupabaseAvailable = false;
      return this.fallbackDB.getTotalTickets();
    }
  }

  // Get validation stats
  async getValidationStats() {
    if (!this.isSupabaseAvailable) {
      return this.fallbackDB.getValidationStats();
    }

    try {
      const { data: tickets, error } = await supabase!
        .from('tickets')
        .select('status');

      if (error) throw error;

      const total = tickets.length;
      const used = tickets.filter(t => t.status === 'used').length;
      const valid = total - used;

      const { count: validationCount, error: countError } = await supabase!
        .from('validation_history')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      return {
        total,
        used,
        valid,
        validationCount: validationCount || 0
      };
    } catch (error) {
      console.error('Error getting validation stats:', error);
      this.isSupabaseAvailable = false;
      return this.fallbackDB.getValidationStats();
    }
  }

  // Clear all data
  async clear(): Promise<void> {
    if (!this.isSupabaseAvailable) {
      this.fallbackDB.clear();
      return;
    }

    try {
      await Promise.all([
        supabase!.from('tickets').delete().neq('id', ''),
        supabase!.from('validation_history').delete().neq('id', '')
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      this.isSupabaseAvailable = false;
      this.fallbackDB.clear();
    }
  }

  // Subscribe to real-time changes
  subscribeToValidations(callback: (payload: any) => void) {
    if (!this.isSupabaseAvailable) {
      console.warn('Supabase not available, real-time subscriptions disabled');
      return { unsubscribe: () => {} };
    }

    return supabase!
      .channel('validation_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'validation_history' }, 
        callback
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'tickets' }, 
        callback
      )
      .subscribe();
  }

  // Helper methods
  private mapDbTicketToTicket(dbTicket: DbTicket): Ticket {
    return {
      id: dbTicket.id,
      qrCode: dbTicket.qr_code,
      status: dbTicket.status,
      validationDate: dbTicket.validation_date,
      validationCount: dbTicket.validation_count,
      eventName: dbTicket.event_name
    };
  }

  private mapDbHistoryToHistory(dbHistory: DbValidationHistory): ValidationHistory {
    return {
      id: dbHistory.id,
      ticketId: dbHistory.ticket_id,
      qrCode: dbHistory.qr_code,
      validationDate: dbHistory.validation_date,
      eventName: dbHistory.event_name,
      status: dbHistory.status
    };
  }
}

export const supabaseTicketDB = new SupabaseTicketDatabase();