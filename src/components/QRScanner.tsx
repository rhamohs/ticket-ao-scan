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
    console.log(`🎥 Starting scanner with direction: ${cameraDirection}`);
    setIsScanning(true);
    
    try {
      const { BarcodeScanner, BarcodeFormat, LensFacing } = await import('@capacitor-mlkit/barcode-scanning');
      
      // Request permission
      const permission = await BarcodeScanner.requestPermissions();
      
      if (permission.camera === 'granted') {
        // Check if scanner is supported
        const isSupported = await BarcodeScanner.isSupported();
        
        if (isSupported.supported) {
          // Start scanning with camera selection
          const scanResult = await BarcodeScanner.scan({
            formats: [BarcodeFormat.QrCode, BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.Code128]
          });
          
          if (scanResult.barcodes && scanResult.barcodes.length > 0) {
            const qrCode = scanResult.barcodes[0].rawValue;
            console.log('📷 QR Code scanned:', qrCode);
            await validateCode(qrCode);
          }
        } else {
          throw new Error('Scanner not supported on this device');
        }
      } else {
        throw new Error('Camera permission denied');
      }
    } catch (error) {
      console.error('❌ Scanner error:', error);
      setScannerSupported(false);
      toast({
        variant: 'destructive',
        title: 'Erro do scanner',
        description: 'Scanner disponível apenas em apps nativos. Use entrada manual.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      await BarcodeScanner.stopScan();
    } catch (error) {
      console.error('Error stopping scanner:', error);
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
        {/* Camera Selection and Scanner */}
        <div className="space-y-3">
          {scannerSupported ? (
            <div className="space-y-2">
              {!isScanning && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setCameraDirection('back');
                      setTimeout(() => startScanning(), 100);
                    }}
                    variant="default"
                    size="sm"
                    className="flex-1 h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0 shadow-md text-sm rounded-lg"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Câmera Principal
                  </Button>
                  <Button
                    onClick={() => {
                      setCameraDirection('front');
                      setTimeout(() => startScanning(), 100);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 text-sm rounded-lg"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Câmera Frontal
                  </Button>
                </div>
              )}
              {isScanning && (
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                  size="sm"
                  className="w-full h-10 text-sm rounded-lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Parar Scanner
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