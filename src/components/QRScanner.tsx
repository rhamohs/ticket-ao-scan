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
    console.log('🎥 Starting scanner...');
    setIsScanning(true);
    
    try {
      // Import barcode scanner dynamically for web compatibility
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      
      // Request permission automatically when opening camera
      let status = await BarcodeScanner.checkPermission({ force: false });
      console.log('📱 Permission status:', status);
      
      if (status.denied) {
        // If permission is denied, request it
        console.log('📱 Requesting camera permission...');
        status = await BarcodeScanner.checkPermission({ force: true });
        console.log('📱 Permission after request:', status);
      }
      
      if (status.granted) {
        // Make background transparent
        BarcodeScanner.hideBackground();
        console.log('🎥 Background hidden');
        
        // Add overlay for camera controls
        addCameraOverlay(cameraDirection);
        console.log('🎥 Overlay added');
        
        // Start scanning with current camera direction
        console.log(`🎥 Starting scan with camera: ${cameraDirection}`);
        const result = await BarcodeScanner.startScan({
          cameraDirection: cameraDirection
        });
        
        console.log(`🎥 Scan started with camera: ${cameraDirection}`);
        
        if (result.hasContent) {
          console.log('📷 QR Code scanned:', result.content);
          await validateCode(result.content);
          removeCameraOverlay();
        }
      } else {
        console.log('❌ Camera permission denied');
        toast({
          variant: 'destructive',
          title: 'Permissão necessária',
          description: 'Autorize o acesso à câmera nas configurações do dispositivo.',
        });
        setIsScanning(false);
      }
    } catch (error) {
      console.error('❌ Scanner error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro do scanner',
        description: 'Não foi possível iniciar o scanner. Use a entrada manual.',
      });
      setIsScanning(false);
    }
  };

  const addCameraOverlay = (currentDirection?: 'front' | 'back') => {
    const direction = currentDirection || cameraDirection;
    const overlay = document.createElement('div');
    overlay.id = 'camera-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      gap: 10px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px;
      border-radius: 8px;
      backdrop-filter: blur(8px);
    `;

    const restartButton = document.createElement('button');
    restartButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      </svg>
      Trocar Câmera
    `;
    restartButton.style.cssText = `
      background: white;
      color: black;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    restartButton.onclick = switchCamera;

    const stopButton = document.createElement('button');
    stopButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      </svg>
      Parar
    `;
    stopButton.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    stopButton.onclick = stopScanning;

    overlay.appendChild(restartButton);
    overlay.appendChild(stopButton);
    document.body.appendChild(overlay);
  };

  const removeCameraOverlay = () => {
    const overlay = document.getElementById('camera-overlay');
    if (overlay) {
      overlay.remove();
    }
  };

  const switchCamera = async () => {
    try {
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      
      console.log(`🔄 Starting camera switch from ${cameraDirection}`);
      
      // FORCE STOP everything
      try {
        await BarcodeScanner.stopScan();
        console.log('📱 Scanner stopped');
      } catch (e) {
        console.log('📱 Scanner was not running');
      }
      
      try {
        BarcodeScanner.showBackground();
        console.log('📱 Background shown');
      } catch (e) {
        console.log('📱 Background already visible');
      }
      
      // Remove overlay and reset state
      removeCameraOverlay();
      setIsScanning(false);
      
      // Wait for complete cleanup
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Toggle direction
      const newDirection = cameraDirection === 'back' ? 'front' : 'back';
      setCameraDirection(newDirection);
      
      console.log(`🔄 Camera direction changed to: ${newDirection}`);
      
      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Start fresh scan
      console.log(`🎥 Starting fresh scan with ${newDirection} camera`);
      await startFreshScan(newDirection);
      
    } catch (error) {
      console.error('❌ Complete camera switch error:', error);
      setIsScanning(false);
      removeCameraOverlay();
      toast({
        variant: 'destructive',
        title: 'Erro ao alternar câmera',
        description: 'Reinicie o scanner para tentar novamente.',
      });
    }
  };

  const startFreshScan = async (direction: 'front' | 'back') => {
    try {
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      
      setIsScanning(true);
      
      // Check permissions
      let status = await BarcodeScanner.checkPermission({ force: false });
      console.log(`📱 Permission check for ${direction}:`, status);
      
      if (status.granted) {
        // Hide background
        BarcodeScanner.hideBackground();
        console.log(`🎥 Background hidden for ${direction} camera`);
        
        // Add overlay
        addCameraOverlay(direction);
        console.log(`🎥 Overlay added for ${direction} camera`);
        
        // Start scan with explicit direction
        console.log(`🎥 Starting scan with explicit direction: ${direction}`);
        const result = await BarcodeScanner.startScan({
          cameraDirection: direction
        });
        
        console.log(`🎥 Scan result with ${direction} camera:`, result);
        
        if (result.hasContent) {
          console.log('📷 QR Code scanned:', result.content);
          await validateCode(result.content);
          removeCameraOverlay();
        }
      } else {
        setIsScanning(false);
        toast({
          variant: 'destructive',
          title: 'Permissão necessária',
          description: 'Autorize o acesso à câmera.',
        });
      }
    } catch (error) {
      console.error(`❌ Fresh scan error with ${direction}:`, error);
      setIsScanning(false);
      removeCameraOverlay();
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
    removeCameraOverlay();
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