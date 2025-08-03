import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, KeyboardIcon, Zap } from 'lucide-react';
import { supabaseTicketDB } from '@/lib/supabaseDatabase';
import { ValidationResult } from '@/types/ticket';
import { toast } from '@/hooks/use-toast';
import { ModernCard } from './ModernCard';

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

  const validateCode = async (qrCode: string) => {
    if (!qrCode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, insira um código QR válido.',
      });
      return;
    }

    try {
      const result = await supabaseTicketDB.validateTicket(qrCode.trim());
      onValidation(result);
      setManualCode('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'Falha ao conectar com a base de dados.',
      });
    }
  };

  const handleManualValidation = async () => {
    await validateCode(manualCode);
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
        
        // Configure to use back camera by default
        const result = await BarcodeScanner.startScan({
          cameraDirection: 'back' // Use back camera instead of front
        });
        
        if (result.hasContent) {
          await validateCode(result.content);
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
    <ModernCard 
      variant="glass"
      title="Validar Bilhete"
      description="Escaneie o código QR ou digite manualmente para validar"
      icon={<Zap className="h-5 w-5 text-primary" />}
      className="w-full"
    >
        {/* Camera Scanner Button */}
        <div className="space-y-3">
          {scannerSupported ? (
            <Button
              onClick={isScanning ? stopScanning : startScanning}
              variant={isScanning ? "destructive" : "default"}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0 shadow-lg"
            >
              <Camera className="h-4 w-4 mr-2" />
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
              disabled={!manualCode.trim()}
            >
              Validar
            </Button>
          </div>
        </div>

    </ModernCard>
  );
}