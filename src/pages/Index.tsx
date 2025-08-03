import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CSVImporter } from '@/components/CSVImporter';
import { QRScanner } from '@/components/QRScanner';
import { ValidationResult } from '@/components/ValidationResult';
import { ValidationHistory } from '@/components/ValidationHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ValidationResult as ValidationResultType } from '@/types/ticket';
import { supabaseTicketDB } from '@/lib/supabaseDatabase';
import { FileText, QrCode, History, RotateCcw, Users, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [totalTickets, setTotalTickets] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidationResultType | null>(null);
  const [activeTab, setActiveTab] = useState('import');
  const [isInitialized, setIsInitialized] = useState(false);
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);
  const [isMultiUserMode, setIsMultiUserMode] = useState(true); // Always multi-user with Supabase

  useEffect(() => {
    // Check for multi-user mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const isMultiMode = urlParams.get('mode') === 'multi';
    if (isMultiMode) {
      setActiveTab('scanner'); // Go directly to scanner in multi-user mode
    }

    // Check online status
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Initialize Supabase tables and get initial data
    const initializeApp = async () => {
      try {
        await supabaseTicketDB.initializeTables();
        const count = await supabaseTicketDB.getTotalTickets();
        setTotalTickets(count);
        setIsInitialized(true);
        
        // Show welcome message for multi-user mode
        if (count > 0) {
          toast({
            title: 'Modo Multi-utilizador Ativo',
            description: `Conectado à sessão com ${count} bilhetes disponíveis.`,
          });
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        toast({
          title: 'Erro de inicialização',
          description: 'Falha ao conectar com a base de dados.',
          variant: 'destructive'
        });
      }
    };

    initializeApp();

    // Subscribe to real-time updates
    const subscription = supabaseTicketDB.subscribeToValidations((payload) => {
      console.log('Real-time update:', payload);
      setRealtimeUpdates(prev => prev + 1);
      
      if (payload.eventType === 'INSERT' && payload.table === 'validation_history') {
        toast({
          title: 'Nova validação',
          description: `Bilhete ${payload.new.qr_code} foi validado por outro utilizador.`,
        });
      }
    });

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      subscription.unsubscribe();
    };
  }, []);

  const handleImportComplete = async (count: number) => {
    setTotalTickets(count);
    setActiveTab('scanner');
    toast({
      title: 'Importação concluída',
      description: `${count} bilhetes sincronizados com outros utilizadores.`,
    });
  };

  const handleValidation = (result: ValidationResultType) => {
    setValidationResult(result);
    // Update ticket count and trigger re-render for real-time sync
    setRealtimeUpdates(prev => prev + 1);
    // Auto switch to history tab after validation
    setTimeout(() => {
      setActiveTab('history');
    }, 2000);
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      toast({
        title: 'Permissão concedida',
        description: 'Acesso à câmera autorizado com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Permissão negada',
        description: 'Não foi possível aceder à câmera.',
      });
    }
  };

  const handleClearData = async () => {
    if (confirm('Tem certeza que deseja limpar todos os dados importados e histórico? Esta ação afetará todos os utilizadores.')) {
      try {
        await supabaseTicketDB.clear();
        setTotalTickets(0);
        setActiveTab('import');
        toast({
          title: 'Dados limpos',
          description: 'Todos os dados foram removidos com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao limpar os dados.',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <AppHeader isOnline={isOnline} totalTickets={totalTickets} hasData={totalTickets > 0} />

          {/* Multi-user sync status */}
          {isInitialized && (
            <div className="flex items-center gap-2 text-sm bg-transparent p-3 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Modo Multi-utilizador Ativo</span>
              <span className="text-muted-foreground">• Sincronização em tempo real entre dispositivos</span>
            </div>
          )}

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
              <div className="flex justify-center mb-4">
                <Button
                  onClick={requestCameraPermission}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/30 hover:bg-accent/10"
                >
                  <Camera className="h-3 w-3" />
                  Autorizar Câmera
                </Button>
              </div>
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