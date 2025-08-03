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
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      
      // Check permission
      const permission = await BarcodeScanner.checkPermission({ force: true });
      
      if (permission.granted) {
        // Hide background and show scanner
        document.body.classList.add('scanner-active');
        
        // For camera selection, we need to use a different approach
        // Since @capacitor-community/barcode-scanner doesn't support camera selection
        // We'll use navigator.mediaDevices to check available cameras first
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          console.log('📹 Available cameras:', videoDevices.length);
          
          // Find the desired camera
          let deviceId = undefined;
          if (cameraDirection === 'front') {
            const frontCamera = videoDevices.find(device => 
              device.label.toLowerCase().includes('front') || 
              device.label.toLowerCase().includes('user') ||
              device.label.toLowerCase().includes('selfie')
            );
            deviceId = frontCamera?.deviceId;
          } else {
            const backCamera = videoDevices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('rear') ||
              device.label.toLowerCase().includes('environment')
            );
            deviceId = backCamera?.deviceId || videoDevices[0]?.deviceId;
          }
          
          console.log(`📹 Selected camera: ${cameraDirection}, deviceId: ${deviceId}`);
        } catch (error) {
          console.log('📹 Could not enumerate cameras, using default');
        }
        
        // Prepare scanner
        await BarcodeScanner.prepare();
        
        // Start scanning - note: camera selection limitation in this plugin
        const result = await BarcodeScanner.startScan({
          targetedFormats: ['QR_CODE', 'EAN_13', 'EAN_8', 'CODE_128'],
        });
        
        if (result.hasContent) {
          console.log('📷 QR Code scanned:', result.content);
          validateCode(result.content);
          stopScanning();
        }
        
        setScannerSupported(true);
      } else {
        throw new Error('Camera permission denied');
      }
    } catch (error) {
      console.error('❌ Scanner error:', error);
      setScannerSupported(false);
      toast({
        variant: 'destructive',
        title: 'Erro do scanner',
        description: 'Não foi possível iniciar o scanner. Use a entrada manual.',
      });
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      await BarcodeScanner.stopScan();
      document.body.classList.remove('scanner-active');
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