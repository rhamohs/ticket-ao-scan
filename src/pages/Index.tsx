import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CSVImporter } from '@/components/CSVImporter';
import { QRScanner } from '@/components/QRScanner';
import { ValidationResult } from '@/components/ValidationResult';
import { ValidationHistory } from '@/components/ValidationHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ValidationResult as ValidationResultType } from '@/types/ticket';
import { ticketDB } from '@/lib/database';
import { FileText, QrCode, History, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [totalTickets, setTotalTickets] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResultType | null>(null);
  const [activeTab, setActiveTab] = useState('import');

  useEffect(() => {
    // Check online status
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Initial ticket count
    setTotalTickets(ticketDB.getTotalTickets());

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleImportComplete = (count: number) => {
    setTotalTickets(count);
    setActiveTab('scanner');
  };

  const handleValidation = (result: ValidationResultType) => {
    setValidationResult(result);
    // Auto switch to history tab after validation
    setTimeout(() => {
      setActiveTab('history');
    }, 2000);
  };

  const handleClearData = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados importados e histórico?')) {
      ticketDB.clear();
      setTotalTickets(0);
      setActiveTab('import');
      toast({
        title: 'Dados limpos',
        description: 'Todos os dados foram removidos com sucesso.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <AppHeader isOnline={isOnline} totalTickets={totalTickets} />

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="import" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
              </TabsTrigger>
              <TabsTrigger value="scanner" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                <span className="hidden sm:inline">Scanner</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="space-y-4">
              <CSVImporter onImportComplete={handleImportComplete} />
              
              {totalTickets > 0 && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleClearData}
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Limpar Dados
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="scanner" className="space-y-4">
              <QRScanner onValidation={handleValidation} />
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <ValidationHistory />
            </TabsContent>
          </Tabs>

          {/* Validation Result Modal */}
          {validationResult && (
            <ValidationResult
              result={validationResult}
              onClose={() => setValidationResult(null)}
            />
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground py-4">
            <p>Ticket.ao Pro v1.0 • Validador Profissional de Bilhetes</p>
            <p className="text-xs mt-1">
              {isOnline ? '🟢 Modo Online' : '🔴 Modo Offline'} • 
              {totalTickets > 0 ? ` ${totalTickets} bilhetes carregados` : ' Nenhum bilhete carregado'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;