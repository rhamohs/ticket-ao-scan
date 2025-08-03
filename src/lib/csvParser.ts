import Papa from 'papaparse';
import { CSVTicket } from '@/types/ticket';

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
        resolve(results.data);
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