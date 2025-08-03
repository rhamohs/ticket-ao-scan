import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, KeyboardIcon } from 'lucide-react';
import { ticketDB } from '@/lib/database';
import { ValidationResult } from '@/types/ticket';
import { toast } from '@/hooks/use-toast';

interface QRScannerProps {
  onValidation: (result: ValidationResult) => void;
}

export function QRScanner({ onValidation }: QRScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);

  useEffect(() => {
    // Check if we're in a mobile environment with camera support
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setScannerSupported(isMobile && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices);
  }, []);

  const validateCode = (qrCode: string) => {
    if (!qrCode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, insira um código QR válido.',
      });
      return;
    }

    const result = ticketDB.validateTicket(qrCode.trim());
    onValidation(result);
    setManualCode('');
  };

  const handleManualValidation = () => {
    validateCode(manualCode);
  };

  const startScanning = async () => {
    setIsScanning(true);
    
    try {
      // Import barcode scanner dynamically for web compatibility
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      
      // Check permission
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        // Make background transparent
        BarcodeScanner.hideBackground();
        
        const result = await BarcodeScanner.startScan();
        
        if (result.hasContent) {
          validateCode(result.content);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Permissão negada',
          description: 'Permissão da câmera é necessária para escanear códigos QR.',
        });
      }
    } catch (error) {
      console.error('Scanner error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro do scanner',
        description: 'Não foi possível iniciar o scanner. Use a entrada manual.',
      });
    } finally {
      setIsScanning(false);
      // Show background again
      try {
        const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
        BarcodeScanner.showBackground();
      } catch (e) {
        // Ignore error if not in mobile environment
      }
    }
  };

  const stopScanning = async () => {
    try {
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      BarcodeScanner.stopScan();
      BarcodeScanner.showBackground();
    } catch (error) {
      // Ignore error if not in mobile environment
    }
    setIsScanning(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Validar Bilhete
        </CardTitle>
        <CardDescription>
          Escaneie o código QR ou digite manualmente para validar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Camera Scanner Button */}
        <div className="space-y-3">
          {scannerSupported ? (
            <Button
              onClick={isScanning ? stopScanning : startScanning}
              variant="scanner"
              size="xl"
              className="w-full"
              disabled={ticketDB.getTotalTickets() === 0}
            >
              <Camera className="h-5 w-5 mr-2" />
              {isScanning ? 'Parar Scanner' : 'Abrir Scanner'}
            </Button>
          ) : (
            <div className="text-center p-4 bg-muted rounded-lg">
              <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Scanner disponível apenas em dispositivos móveis
              </p>
            </div>
          )}
        </div>

        {/* Manual Input */}
        <div className="space-y-3">
          <Label htmlFor="manual-code" className="flex items-center gap-2">
            <KeyboardIcon className="h-4 w-4" />
            Entrada Manual
          </Label>
          <div className="flex gap-2">
            <Input
              id="manual-code"
              placeholder="Digite o código QR..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualValidation()}
              className="flex-1"
            />
            <Button 
              onClick={handleManualValidation}
              disabled={!manualCode.trim() || ticketDB.getTotalTickets() === 0}
            >
              Validar
            </Button>
          </div>
        </div>

        {ticketDB.getTotalTickets() === 0 && (
          <div className="text-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning-foreground">
              ⚠️ Importe uma base de dados CSV primeiro para começar a validar bilhetes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}