import { supabase, DbTicket, DbValidationHistory } from './supabase';
import { Ticket, ValidationHistory } from '@/types/ticket';

class SupabaseTicketDatabase {
  // Initialize tables if they don't exist
  async initializeTables() {
    try {
      // Tables are already created via migration, just verify they exist
      const { data: tables } = await supabase.from('tickets').select('id').limit(1);
      console.log('Supabase tables verified');
    } catch (error) {
      console.error('Failed to verify Supabase tables:', error);
      throw error;
    }
  }

  // Import tickets from CSV data
  async importTickets(csvData: any[]): Promise<number> {
    try {
      // Clear existing tickets - get all records first then delete by ID
      const { data: existingTickets } = await supabase.from('tickets').select('id');
      if (existingTickets && existingTickets.length > 0) {
        await supabase.from('tickets').delete().in('id', existingTickets.map(t => t.id));
      }

      const tickets: Omit<DbTicket, 'created_at' | 'updated_at'>[] = csvData.map((row, index) => {
        console.log('Supabase DB - Processando linha CSV:', row);
        
        // Generate a UUID-like id from the URL or use index
        const originalId = row.ID || row.id || `ticket_${index}`;
        const ticketId = originalId.includes('attendee_id=') 
          ? originalId.split('attendee_id=')[1] 
          : `ticket_${Date.now()}_${index}`;
        
        const ticket = {
          id: ticketId,
          qr_code: row['Código QR'] || row.qrCode || row.code || originalId,
          name: row['Name'] || row.name || '',
          email: row['Email'] || row.email || '',
          phone: row['Phone'] || row.phone || '',
          security_code: row['Security Code'] || row.securityCode || '',
          status: this.normalizeStatus(row['Status de Validação'] || row.status || 'valid'),
          validation_date: row['Data/Hora da Validação'] && row['Data/Hora da Validação'].trim() ? row['Data/Hora da Validação'] : null,
          validation_count: parseInt(row['Número de utilizações'] || row.validationCount || '0'),
          event_name: row['Nome do Evento'] || row.eventName || 'Evento'
        };
        console.log('Supabase DB - Ticket criado:', ticket);
        return ticket;
      });

      if (tickets.length > 0) {
        const { error: insertError } = await supabase
          .from('tickets')
          .upsert(tickets, { onConflict: 'qr_code' });
        
        if (insertError) throw insertError;
      }

      return csvData.length;
    } catch (error) {
      console.error('Supabase import failed:', error);
      throw error;
    }
  }

  private normalizeStatus(status: string): 'valid' | 'used' | 'invalid' {
    const normalized = status.toLowerCase();
    if (normalized.includes('usado') || normalized.includes('used')) return 'used';
    if (normalized.includes('válido') || normalized.includes('valid') || normalized.includes('ingresso')) return 'valid';
    return 'valid'; // Default to valid instead of invalid
  }

  // Validate a QR code
  async validateTicket(qrCode: string): Promise<{ success: boolean; ticket?: Ticket; message: string; status: 'valid' | 'used' | 'not_found' }> {
    try {
      // Get ticket from database
      const { data: ticket, error } = await supabase
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
          message: `Ingresso já foi utilizado em ${new Date(ticket.validation_date || '').toLocaleString('pt-BR')}`,
          status: 'used'
        };
      }

      // Update ticket status to used
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'used',
          validation_date: new Date().toISOString(),
          validation_count: ticket.validation_count + 1
        })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      // Record validation in history
      const historyRecord: Omit<DbValidationHistory, 'id' | 'created_at'> = {
        ticket_id: ticket.id,
        qr_code: ticket.qr_code,
        name: ticket.name || '',
        validation_date: new Date().toISOString(),
        event_name: ticket.event_name || 'Evento',
        status: 'validated'
      };

      const { error: historyError } = await supabase
        .from('validation_history')
        .insert([historyRecord]);

      if (historyError) console.warn('Error saving validation history:', historyError);

      const validatedTicket = this.mapDbTicketToTicket({
        ...ticket,
        status: 'used',
        validation_date: new Date().toISOString(),
        validation_count: ticket.validation_count + 1
      });

      return {
        success: true,
        ticket: validatedTicket,
        message: `Ingresso validado com sucesso para ${ticket.name || 'utilizador'}`,
        status: 'valid'
      };
    } catch (error) {
      console.error('Error validating ticket:', error);
      throw error;
    }
  }

  // Get validation history
  async getValidationHistory(): Promise<ValidationHistory[]> {
    try {
      const { data, error } = await supabase
        .from('validation_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapDbHistoryToHistory);
    } catch (error) {
      console.error('Error getting validation history:', error);
      throw error;
    }
  }

  // Get total tickets count
  async getTotalTickets(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting total tickets:', error);
      throw error;
    }
  }

  // Get validation statistics
  async getValidationStats() {
    try {
      const [totalResult, validResult, usedResult, validationCountResult] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'valid'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'used'),
        supabase.from('validation_history').select('*', { count: 'exact', head: true })
      ]);

      return {
        total: totalResult.count || 0,
        valid: validResult.count || 0,
        used: usedResult.count || 0,
        validationCount: validationCountResult.count || 0
      };
    } catch (error) {
      console.error('Error getting validation stats:', error);
      throw error;
    }
  }

  // Clear all data
  async clear(): Promise<void> {
    try {
      // Clear tickets
      const { data: existingTickets } = await supabase.from('tickets').select('id');
      if (existingTickets && existingTickets.length > 0) {
        await supabase.from('tickets').delete().in('id', existingTickets.map(t => t.id));
      }
      
      // Clear validation history  
      const { data: existingHistory } = await supabase.from('validation_history').select('id');
      if (existingHistory && existingHistory.length > 0) {
        await supabase.from('validation_history').delete().in('id', existingHistory.map(h => h.id));
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  // Subscribe to real-time validation updates
  subscribeToValidations(callback: (payload: any) => void) {
    try {
      const channel = supabase
        .channel('validation-updates')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'validation_history' }, 
          callback
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'tickets' }, 
          callback
        )
        .subscribe();

      return {
        unsubscribe: () => {
          supabase.removeChannel(channel);
        }
      };
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
      return {
        unsubscribe: () => {}
      };
    }
  }

  // Helper methods
  private mapDbTicketToTicket(dbTicket: DbTicket): Ticket {
    return {
      id: dbTicket.id,
      qrCode: dbTicket.qr_code,
      name: dbTicket.name || '',
      email: dbTicket.email || '',
      phone: dbTicket.phone || '',
      securityCode: dbTicket.security_code || '',
      status: dbTicket.status,
      validationDate: dbTicket.validation_date,
      validationCount: dbTicket.validation_count,
      eventName: dbTicket.event_name || 'Evento'
    };
  }

  private mapDbHistoryToHistory(dbHistory: DbValidationHistory): ValidationHistory {
    return {
      id: dbHistory.id,
      ticketId: dbHistory.ticket_id,
      qrCode: dbHistory.qr_code,
      name: dbHistory.name || '',
      validationDate: dbHistory.validation_date,
      eventName: dbHistory.event_name,
      status: dbHistory.status
    };
  }
}

// Export a singleton instance
export const supabaseTicketDB = new SupabaseTicketDatabase();