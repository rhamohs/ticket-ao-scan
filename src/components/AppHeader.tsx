import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Wifi, WifiOff, Share2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AppHeaderProps {
  isOnline: boolean;
  totalTickets: number;
  hasData?: boolean;
}

export function AppHeader({ isOnline, totalTickets, hasData = false }: AppHeaderProps) {
  const handleShareSession = () => {
    const shareUrl = `${window.location.origin}?mode=multi&session=${Date.now()}`;
    
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      navigator.share({
        title: 'Ticket.ao Pro - Validação Multi-utilizador',
        text: 'Aceda à sessão de validação de bilhetes',
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: 'Link copiado!',
          description: 'Partilhe este link para acesso multi-utilizador.',
        });
      }).catch(() => {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível copiar o link.',
        });
      });
    }
  };
  return (
    <Card className="w-full bg-gradient-to-r from-header-gradient-start to-header-gradient-end text-header-foreground border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <img 
                src="/lovable-uploads/4286576c-38a4-4fc4-902b-608c593ecc24.png" 
                alt="Ticket.ao" 
                className="h-8 w-auto"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">Ticket.ao Pro</h1>
              <p className="text-sm opacity-90">Validador de Bilhetes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Share Session Button */}
            {hasData && (
              <Button
                onClick={handleShareSession}
                variant="secondary"
                size="sm"
                className="bg-white/20 text-white hover:bg-white/30 border-white/30"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Partilhar
              </Button>
            )}
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-300" />
              ) : (
                <WifiOff className="h-4 w-4 text-orange-300" />
              )}
              <span className="text-xs">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {/* Ticket Count */}
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {totalTickets} bilhetes
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}