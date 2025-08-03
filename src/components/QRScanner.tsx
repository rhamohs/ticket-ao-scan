import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, KeyboardIcon, Zap, RotateCcw } from 'lucide-react';
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
  const [cameraDirection, setCameraDirection] = useState<'front' | 'back'>('back');

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
      
      // Request permission automatically when opening camera
      let status = await BarcodeScanner.checkPermission({ force: false });
      
      if (status.denied) {
        // If permission is denied, request it
        status = await BarcodeScanner.checkPermission({ force: true });
      }
      
      if (status.granted) {
        // Make background transparent
        BarcodeScanner.hideBackground();
        
        // Start scanning with current camera direction
        const result = await BarcodeScanner.startScan({
          cameraDirection: cameraDirection
        });
        
        console.log(`BarcodeScanner camera direction set to: ${cameraDirection}`);
        
        if (result.hasContent) {
          await validateCode(result.content);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Permissão necessária',
          description: 'Autorize o acesso à câmera nas configurações do dispositivo.',
        });
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Scanner error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro do scanner',
        description: 'Não foi possível iniciar o scanner. Use a entrada manual.',
      });
      setIsScanning(false);
    }
  };

  const switchCamera = async () => {
    try {
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      
      // Stop current scanning
      BarcodeScanner.stopScan();
      
      // Toggle camera direction
      const newDirection = cameraDirection === 'back' ? 'front' : 'back';
      setCameraDirection(newDirection);
      
      // Restart scanning with new camera direction
      const result = await BarcodeScanner.startScan({
        cameraDirection: newDirection
      });
      
      console.log(`BarcodeScanner camera switched to: ${newDirection}`);
      
      if (result.hasContent) {
        await validateCode(result.content);
      }
    } catch (error) {
      console.error('Camera switch error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao alternar câmera',
        description: 'Não foi possível alterar a câmera.',
      });
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
        {/* Camera Scanner Buttons */}
        <div className="space-y-3">
          {scannerSupported ? (
            <div className="space-y-2">
              <Button
                onClick={isScanning ? stopScanning : startScanning}
                variant={isScanning ? "destructive" : "default"}
                size="sm"
                className="w-full h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0 shadow-md text-sm rounded-lg"
              >
                <Camera className="h-4 w-4 mr-2" />
                {isScanning ? 'Parar Scanner' : 'Abrir Scanner'}
              </Button>
              
              {isScanning && (
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Alternar para Câmera {cameraDirection === 'back' ? 'Frontal' : 'Traseira'}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <Camera className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Scanner disponível apenas em dispositivos móveis
              </p>
            </div>
          )}
        </div>

        {/* Manual Input */}
        <div className="space-y-3">
          <Label htmlFor="manual-code" className="flex items-center gap-2 text-sm">
            <KeyboardIcon className="h-4 w-4" />
            Entrada Manual
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="manual-code"
              placeholder="Digite o código QR..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualValidation()}
              className="flex-1 h-10 sm:h-9"
            />
            <Button 
              onClick={handleManualValidation}
              disabled={!manualCode.trim()}
              className="w-full sm:w-auto h-10 sm:h-9 text-sm"
            >
              Validar
            </Button>
          </div>
        </div>

    </ModernCard>
  );
}