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

    const switchButton = document.createElement('button');
    switchButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      </svg>
      ${direction === 'back' ? 'Frontal' : 'Traseira'}
    `;
    switchButton.style.cssText = `
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
    switchButton.onclick = switchCamera;

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

    overlay.appendChild(switchButton);
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
      
      // Toggle camera direction
      const newDirection = cameraDirection === 'back' ? 'front' : 'back';
      
      console.log(`🔄 Switching from ${cameraDirection} camera to ${newDirection} camera`);
      
      // COMPLETELY stop everything
      await BarcodeScanner.stopScan();
      BarcodeScanner.showBackground();
      removeCameraOverlay();
      
      // Update state
      setCameraDirection(newDirection);
      setIsScanning(false);
      
      console.log(`📱 Camera direction updated to: ${newDirection}`);
      
      // Wait longer to ensure complete cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Restart everything from scratch
      console.log(`🔄 Restarting scanner with ${newDirection} camera`);
      setIsScanning(true);
      
      // Check permission again
      let status = await BarcodeScanner.checkPermission({ force: false });
      
      if (status.granted) {
        // Make background transparent
        BarcodeScanner.hideBackground();
        console.log('🎥 Background hidden for camera switch');
        
        // Add overlay with new direction
        addCameraOverlay(newDirection);
        console.log(`🎥 Overlay added for ${newDirection} camera`);
        
        // Start scanning with new camera direction
        console.log(`🎥 Starting scan with camera: ${newDirection}`);
        const result = await BarcodeScanner.startScan({
          cameraDirection: newDirection
        });
        
        console.log(`🎥 Scan started successfully with camera: ${newDirection}`);
        
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
      console.error('❌ Camera switch error:', error);
      setIsScanning(false);
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
        {/* Camera Scanner Button */}
        <div className="space-y-3">
          {scannerSupported ? (
            <Button
              onClick={isScanning ? stopScanning : startScanning}
              variant={isScanning ? "destructive" : "default"}
              size="sm"
              className="w-full h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0 shadow-md text-sm rounded-lg"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isScanning ? 'Parar Scanner' : 'Abrir Scanner'}
            </Button>
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