import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, CheckCircle, Calendar, Hash } from 'lucide-react';
import { ticketDB } from '@/lib/database';

export function ValidationHistory() {
  const history = ticketDB.getValidationHistory();
  const stats = ticketDB.getValidationStats();

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Validações
        </CardTitle>
        <CardDescription>
          Registro de todos os bilhetes validados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Bilhetes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{stats.valid}</div>
            <div className="text-xs text-muted-foreground">Válidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{stats.used}</div>
            <div className="text-xs text-muted-foreground">Usados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-foreground">{stats.validationCount}</div>
            <div className="text-xs text-muted-foreground">Validações</div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma validação registrada ainda</p>
              <p className="text-sm">As validações aparecerão aqui após escanear bilhetes</p>
            </div>
          ) : (
            history.map((validation) => (
              <div
                key={validation.id}
                className="flex items-center justify-between p-3 bg-card border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-full">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {validation.eventName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono">{validation.qrCode}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-1">
                    {validation.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(validation.validationDate)}</span>
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