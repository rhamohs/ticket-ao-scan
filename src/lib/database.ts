import { Ticket, ValidationHistory } from '@/types/ticket';

export class TicketDatabase {
  private tickets: Map<string, Ticket> = new Map();
  private validationHistory: ValidationHistory[] = [];

  // Import tickets from CSV data
  importTickets(csvData: any[]): void {
    this.tickets.clear();
    csvData.forEach((row, index) => {
      try {
        const ticket: Ticket = {
          id: row.ID || row.id || `ticket_${index}`,
          qrCode: row['Código QR'] || row.qrCode || row.code,
          status: this.normalizeStatus(row['Status de Validação'] || row.status || 'valid'),
          validationDate: row['Data/Hora da Validação'] || row.validationDate,
          validationCount: parseInt(row['Número de utilizações'] || row.validationCount || '0'),
          eventName: row['Nome do Evento'] || row.eventName || 'Evento'
        };
        this.tickets.set(ticket.qrCode, ticket);
      } catch (error) {
        console.warn(`Error importing ticket at row ${index}:`, error);
      }
    });
  }

  private normalizeStatus(status: string): 'valid' | 'used' | 'invalid' {
    const normalized = status.toLowerCase();
    if (normalized.includes('usado') || normalized.includes('used')) return 'used';
    if (normalized.includes('válido') || normalized.includes('valid')) return 'valid';
    return 'invalid';
  }

  // Validate a QR code
  validateTicket(qrCode: string): { success: boolean; ticket?: Ticket; message: string; status: 'valid' | 'used' | 'not_found' } {
    const ticket = this.tickets.get(qrCode);
    
    if (!ticket) {
      return {
        success: false,
        message: 'Ingresso não encontrado',
        status: 'not_found'
      };
    }

    if (ticket.status === 'used') {
      return {
        success: false,
        ticket,
        message: `Ingresso já usado. Primeira validação: ${ticket.validationDate || 'N/A'}`,
        status: 'used'
      };
    }

    // Mark as used and record validation
    ticket.status = 'used';
    ticket.validationDate = new Date().toISOString();
    ticket.validationCount += 1;

    // Add to validation history
    this.validationHistory.push({
      id: `validation_${Date.now()}`,
      ticketId: ticket.id,
      qrCode: ticket.qrCode,
      validationDate: ticket.validationDate,
      eventName: ticket.eventName || 'Evento',
      status: 'validated'
    });

    return {
      success: true,
      ticket,
      message: 'Ingresso válido',
      status: 'valid'
    };
  }

  // Get validation history
  getValidationHistory(): ValidationHistory[] {
    return this.validationHistory.sort((a, b) => 
      new Date(b.validationDate).getTime() - new Date(a.validationDate).getTime()
    );
  }

  // Get total tickets imported
  getTotalTickets(): number {
    return this.tickets.size;
  }

  // Get validation stats
  getValidationStats() {
    const total = this.tickets.size;
    const used = Array.from(this.tickets.values()).filter(t => t.status === 'used').length;
    const valid = total - used;

    return {
      total,
      used,
      valid,
      validationCount: this.validationHistory.length
    };
  }

  // Clear all data
  clear(): void {
    this.tickets.clear();
    this.validationHistory.splice(0);
  }
}

export const ticketDB = new TicketDatabase();