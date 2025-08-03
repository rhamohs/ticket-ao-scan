import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Shield, Wifi, WifiOff } from 'lucide-react';

interface AppHeaderProps {
  isOnline: boolean;
  totalTickets: number;
}

export function AppHeader({ isOnline, totalTickets }: AppHeaderProps) {
  return (
    <Card className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Ticket.ao Pro</h1>
              <p className="text-sm opacity-90">Validador de Bilhetes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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