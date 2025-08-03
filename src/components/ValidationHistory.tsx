import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Clock, Download } from 'lucide-react';
import { supabaseTicketDB } from '@/lib/supabaseDatabase';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface ValidationHistoryItem {
  id: string;
  qrCode: string;
  name?: string;
  eventName?: string;
  status: 'valid' | 'used' | 'not_found';
  validationDate: string;
}

interface ValidationStats {
  total: number;
  valid: number;
  used: number;
  validationCount: number;
}

export function ValidationHistory() {
  const [history, setHistory] = useState<ValidationHistoryItem[]>([]);
  const [stats, setStats] = useState<ValidationStats>({
    total: 0,
    valid: 0,
    used: 0,
    validationCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const subscription = supabaseTicketDB.subscribeToValidations(() => {
      loadData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const [historyData, statsData] = await Promise.all([
        supabaseTicketDB.getValidationHistory(),
        supabaseTicketDB.getValidationStats()
      ]);
      
      // Map the data to match our interface
      const mappedHistory = historyData.map(item => ({
        id: item.id,
        qrCode: item.qrCode,
        name: item.name,
        eventName: item.eventName,
        status: item.status as 'valid' | 'used' | 'not_found',
        validationDate: item.validationDate
      }));
      
      setHistory(mappedHistory);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load validation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDFReport = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(44, 44, 44);
      doc.text('Ticket.ao Pro', pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text('Relatório de Validação', pageWidth / 2, 45, { align: 'center' });
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 55, { align: 'center' });
      
      // Statistics
      doc.setFontSize(12);
      doc.setTextColor(44, 44, 44);
      doc.text('Estatísticas:', 20, 75);
      doc.setFontSize(10);
      doc.text(`Total de bilhetes: ${stats.total}`, 20, 85);
      doc.text(`Validações: ${stats.validationCount}`, 20, 95);
      doc.text(`Válidos: ${stats.valid}`, 20, 105);
      doc.text(`Usados: ${stats.used}`, 20, 115);
      
      // History header
      doc.setFontSize(12);
      doc.text('Histórico de Validações:', 20, 135);
      
      // History items
      let yPosition = 150;
      history.forEach((item, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
        
        doc.setFontSize(10);
        doc.setTextColor(44, 44, 44);
        doc.text(`${index + 1}. ${item.eventName || 'Evento'}`, 20, yPosition);
        doc.setTextColor(100, 100, 100);
        doc.text(`Nome: ${item.name || item.qrCode}`, 30, yPosition + 10);
        doc.text(`Status: ${item.status === 'valid' ? 'Válido' : item.status === 'used' ? 'Usado' : 'Não encontrado'}`, 30, yPosition + 20);
        doc.text(`Data: ${formatDate(item.validationDate)}`, 30, yPosition + 30);
        
        yPosition += 45;
      });
      
      doc.save(`ticket-ao-relatorio-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({
        title: 'PDF Gerado',
        description: 'Relatório exportado com sucesso!',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao gerar o PDF.',
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'used':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'not_found':
        return <XCircle className="h-4 w-4 text-error" />;
      default:
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Válido';
      case 'used':
        return 'Usado';
      case 'not_found':
        return 'Não Encontrado';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'valid':
        return 'default';
      case 'used':
        return 'secondary';
      case 'not_found':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Carregando histórico...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Validações
            </CardTitle>
            <CardDescription>
              Últimas validações de bilhetes realizadas
            </CardDescription>
          </div>
          <Button
            onClick={generatePDFReport}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={history.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-success">{stats.valid}</div>
            <div className="text-sm text-muted-foreground">Válidos</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-warning">{stats.used}</div>
            <div className="text-sm text-muted-foreground">Usados</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{stats.validationCount}</div>
            <div className="text-sm text-muted-foreground">Validações</div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma validação realizada ainda
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {item.eventName || 'Evento Não Especificado'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.name || item.qrCode}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(item.status)} className="text-xs">
                    {getStatusText(item.status)}
                  </Badge>
                  <div className="text-xs text-muted-foreground text-right">
                    {formatDate(item.validationDate)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}