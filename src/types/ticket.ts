export interface Ticket {
  id: string;
  qrCode: string;
  name?: string;
  email?: string;
  phone?: string;
  securityCode?: string;
  status: 'valid' | 'used' | 'invalid';
  validationDate?: string;
  validationCount: number;
  eventName?: string;
}

export interface ValidationResult {
  success: boolean;
  ticket?: Ticket;
  message: string;
  status: 'valid' | 'used' | 'not_found';
}

export interface ValidationHistory {
  id: string;
  ticketId: string;
  qrCode: string;
  name?: string;
  validationDate: string;
  eventName: string;
  status: string;
}

export interface CSVTicket {
  ID: string;
  'Código QR': string;
  'Status de Validação': string;
  'Data/Hora da Validação': string;
  'Número de utilizações': string;
}