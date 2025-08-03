import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { ValidationResult as ValidationResultType } from '@/types/ticket';
import { cn } from '@/lib/utils';

interface ValidationResultProps {
  result: ValidationResultType | null;
  onClose: () => void;
}

export function ValidationResult({ result, onClose }: ValidationResultProps) {
  if (!result) return null;

  const getStatusConfig = () => {
    switch (result.status) {
      case 'valid':
        return {
          bgColor: 'bg-success',
          textColor: 'text-success-foreground',
          icon: CheckCircle,
          iconColor: 'text-success-foreground',
          borderColor: 'border-success'
        };
      case 'used':
        return {
          bgColor: 'bg-warning',
          textColor: 'text-warning-foreground',
          icon: AlertTriangle,
          iconColor: 'text-warning-foreground',
          borderColor: 'border-warning'
        };
      case 'not_found':
        return {
          bgColor: 'bg-error',
          textColor: 'text-error-foreground',
          icon: XCircle,
          iconColor: 'text-error-foreground',
          borderColor: 'border-error'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className={cn(
        "w-full max-w-md",
        config.bgColor,
        config.borderColor,
        "border-2 shadow-xl"
      )}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <Icon className={cn("h-8 w-8", config.iconColor)} />
              <div>
                <h3 className={cn("text-xl font-bold", config.textColor)}>
                  {result.status === 'valid' && 'Bilhete Válido'}
                  {result.status === 'used' && 'Bilhete Já Usado'}
                  {result.status === 'not_found' && 'Bilhete Não Encontrado'}
                </h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={cn("h-8 w-8", config.textColor, "hover:bg-white/20")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className={cn("space-y-3", config.textColor)}>
            <p className="text-lg font-medium">
              {result.message}
            </p>

            {result.ticket && (
              <div className="space-y-2 text-sm bg-white/10 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium">Nome:</span>
                  <span>{result.ticket.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Código QR:</span>
                  <span className="font-mono text-xs break-all">
                    {result.ticket.qrCode}
                  </span>
                </div>
                {result.ticket.eventName && (
                  <div className="flex justify-between">
                    <span className="font-medium">Evento:</span>
                    <span>{result.ticket.eventName}</span>
                  </div>
                )}
                {result.ticket.validationDate && (
                  <div className="flex justify-between">
                    <span className="font-medium">Data de Validação:</span>
                    <span>{formatDate(result.ticket.validationDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Utilizações:</span>
                  <span>{result.ticket.validationCount}</span>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={onClose}
            variant="outline"
            className={cn(
              "w-full mt-6",
              "bg-white/20 border-white/30",
              config.textColor,
              "hover:bg-white/30"
            )}
          >
            Continuar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}