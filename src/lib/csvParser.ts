import Papa from 'papaparse';
import { CSVTicket } from '@/types/ticket';

// Common CSV field mappings to handle different formats
const FIELD_MAPPINGS = {
  // ID fields
  id: ['id', 'ID', 'ticket_id', 'ticketid', 'ticket id', 'Ticket ID'],
  
  // QR Code fields
  qrCode: [
    'qr code', 'qr_code', 'qrcode', 'QR Code', 'QR_Code', 'QRCode',
    'Código QR', 'codigo qr', 'qr code url', 'QR Code URL', 'url'
  ],
  
  // Status fields
  status: [
    'status', 'Status', 'status de validação', 'Status de Validação',
    'ticket type', 'Ticket Type', 'type', 'Type', 'estado'
  ],
  
  // Date fields
  date: [
    'data/hora da validação', 'Data/Hora da Validação', 'validation_date',
    'validationdate', 'date', 'Date', 'data', 'Data'
  ],
  
  // Count fields
  count: [
    'número de utilizações', 'Número de utilizações', 'validation_count',
    'validationcount', 'count', 'Count', 'utilizações', 'uses'
  ],
  
  // Additional common fields
  name: ['name', 'Name', 'Nome', 'nome'],
  email: ['email', 'Email', 'e-mail', 'E-mail'],
  phone: ['phone', 'Phone', 'telefone', 'Telefone'],
  securityCode: ['security code', 'Security Code', 'codigo segurança', 'Código de Segurança']
};

function findFieldMapping(headers: string[], fieldType: keyof typeof FIELD_MAPPINGS): string | null {
  const possibleNames = FIELD_MAPPINGS[fieldType];
  return headers.find(header => 
    possibleNames.some(name => 
      header.toLowerCase().trim() === name.toLowerCase().trim()
    )
  ) || null;
}

function normalizeCSVData(data: any[]): any[] {
  if (data.length === 0) return data;
  
  const headers = Object.keys(data[0]);
  
  // Find the best field mappings
  const idField = findFieldMapping(headers, 'id');
  const qrField = findFieldMapping(headers, 'qrCode');
  const statusField = findFieldMapping(headers, 'status');
  const dateField = findFieldMapping(headers, 'date');
  const countField = findFieldMapping(headers, 'count');
  const nameField = findFieldMapping(headers, 'name');
  const emailField = findFieldMapping(headers, 'email');
  const phoneField = findFieldMapping(headers, 'phone');
  const securityCodeField = findFieldMapping(headers, 'securityCode');
  
  // If we can't find at least ID and QR Code, try to guess from position
  let finalIdField = idField || headers[0];
  let finalQrField = qrField;
  
  // If no QR field found, look for URL-like content or first column
  if (!finalQrField) {
    for (const header of headers) {
      const sampleValue = data[0][header];
      if (typeof sampleValue === 'string' && 
          (sampleValue.includes('http') || sampleValue.includes('QR') || header.toLowerCase().includes('url'))) {
        finalQrField = header;
        break;
      }
    }
    // Fallback to first column if available (QR Code URL is usually first)
    if (!finalQrField && headers.length > 0) {
      finalQrField = headers[0];
    }
  }
  
  if (!finalQrField) {
    throw new Error('Não foi possível identificar a coluna do código QR no CSV');
  }
  
  return data.map(row => {
    const result = {
      'ID': row[finalIdField] || `TKT${Math.random().toString(36).substr(2, 9)}`,
      'Código QR': row[finalQrField] || '',
      'Name': row[nameField] || '',
      'Email': row[emailField] || '',
      'Phone': row[phoneField] || '',
      'Security Code': row[securityCodeField] || '',
      'Status de Validação': row[statusField] || 'válido',
      'Data/Hora da Validação': row[dateField] || '',
      'Número de utilizações': row[countField] || '0'
    };
    
    console.log('CSV Parser - Nome encontrado:', row[nameField]);
    console.log('CSV Parser - Resultado final:', result);
    return result;
  });
}

export function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }
        
        try {
          // Normalize the CSV data to handle different formats
          const normalizedData = normalizeCSVData(results.data as any[]);
          resolve(normalizedData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function generateSampleCSV(): string {
  const sampleData = [
    {
      'ID': 'TKT001',
      'Código QR': 'QR123456789',
      'Status de Validação': 'válido',
      'Data/Hora da Validação': '',
      'Número de utilizações': '0'
    },
    {
      'ID': 'TKT002', 
      'Código QR': 'QR987654321',
      'Status de Validação': 'válido',
      'Data/Hora da Validação': '',
      'Número de utilizações': '0'
    },
    {
      'ID': 'TKT003',
      'Código QR': 'QR555666777',
      'Status de Validação': 'usado',
      'Data/Hora da Validação': '2024-01-15T19:30:00Z',
      'Número de utilizações': '1'
    }
  ];

  return Papa.unparse(sampleData);
}

export function downloadSampleCSV(): void {
  const csvContent = generateSampleCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_tickets.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}