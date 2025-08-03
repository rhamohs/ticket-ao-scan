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
    console.log(`🌐 Current environment: ${navigator.userAgent}`);
    setIsScanning(true);
    
    try {
      // Check if we're in mobile environment first
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log(`📱 Is mobile device: ${isMobile}`);
      
      if (!isMobile) {
        throw new Error('Scanner only works on mobile devices');
      }

      // Try to import the MLKit barcode scanner
      console.log('📦 Importing @capacitor-mlkit/barcode-scanning...');
      const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
      console.log('✅ MLKit scanner imported successfully');
      
      // Request permission
      console.log('📱 Requesting camera permission...');
      const permission = await BarcodeScanner.requestPermissions();
      console.log('📱 Permission result:', permission);
      
      if (permission.camera === 'granted') {
        console.log('✅ Camera permission granted');
        
        // Check if scanner is supported
        console.log('🔍 Checking if scanner is supported...');
        const isSupported = await BarcodeScanner.isSupported();
        console.log('📱 Scanner support check:', isSupported);
        
        if (isSupported.supported) {
          console.log(`🎥 Starting scan with camera: ${cameraDirection}`);
          
          // Start scanning
          const scanResult = await BarcodeScanner.scan();
          console.log('📱 Scan completed, result:', scanResult);
          
          if (scanResult.barcodes && scanResult.barcodes.length > 0) {
            const qrCode = scanResult.barcodes[0].rawValue;
            console.log('📷 QR Code scanned:', qrCode);
            await validateCode(qrCode);
          } else {
            console.log('❌ No barcodes found in scan result');
          }
        } else {
          console.log('❌ Scanner not supported on this device');
          throw new Error('Scanner not supported on this device');
        }
      } else {
        console.log('❌ Camera permission denied:', permission);
        throw new Error('Camera permission denied');
      }
    } catch (error) {
      console.error('❌ Detailed scanner error:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Expected camera direction:', cameraDirection);
      
      // Provide more specific error messages
      let errorMessage = 'Não foi possível iniciar o scanner.';
      if (error.message.includes('permission')) {
        errorMessage = 'Permissão da câmera negada. Autorize o acesso à câmera nas configurações.';
      } else if (error.message.includes('not supported')) {
        errorMessage = 'Scanner não suportado neste dispositivo.';
      } else if (error.message.includes('mobile')) {
        errorMessage = 'Scanner disponível apenas em dispositivos móveis.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Erro do scanner',
        description: errorMessage,
      });
    } finally {
      console.log('🔄 Setting scanning to false');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
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