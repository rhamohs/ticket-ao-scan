import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, FileText } from 'lucide-react';
import { parseCSV, downloadSampleCSV } from '@/lib/csvParser';
import { supabaseTicketDB } from '@/lib/supabaseDatabase';
import { toast } from '@/hooks/use-toast';

interface CSVImporterProps {
  onImportComplete: (count: number) => void;
}

export function CSVImporter({ onImportComplete }: CSVImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, selecione um arquivo CSV válido.',
      });
      return;
    }

    try {
      toast({
        title: 'Importando...',
        description: 'Processando arquivo CSV...',
      });

      const csvData = await parseCSV(file);
      
      if (csvData.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'O arquivo CSV está vazio ou não contém dados válidos.',
        });
        return;
      }

      const count = await supabaseTicketDB.importTickets(csvData);
      
      toast({
        variant: 'default',
        title: 'Sucesso!',
        description: `${count} bilhetes importados e sincronizados com outros utilizadores.`,
      });

      onImportComplete(count);
      
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: 'Não foi possível importar o arquivo CSV. Verifique o formato.',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadSample = () => {
    downloadSampleCSV();
    toast({
      title: 'Download iniciado',
      description: 'Arquivo de exemplo baixado com sucesso.',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importar Base de Dados
        </CardTitle>
        <CardDescription>
          Importe um arquivo CSV com os códigos de bilhete para validação offline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleImportClick}
            variant="default"
            size="lg"
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Selecionar Arquivo CSV
          </Button>
          
          <Button
            onClick={handleDownloadSample}
            variant="outline"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Exemplo
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Formatos CSV suportados:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Formato comum:</strong> QR Code URL, Name, Ticket Type, Security Code, Email, Phone</li>
            <li><strong>Formato padrão:</strong> ID, Código QR, Status de Validação, Data/Hora da Validação, Número de utilizações</li>
            <li>A aplicação detecta automaticamente diferentes formatos e ordens de colunas</li>
            <li>Campos obrigatórios: pelo menos um identificador e código QR</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}