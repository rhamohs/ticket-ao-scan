import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ModernCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'neon';
}

export function ModernCard({ 
  children, 
  title, 
  description, 
  icon, 
  className,
  variant = 'default' 
}: ModernCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    glass: 'bg-background/40 backdrop-blur-xl border-border/50 shadow-2xl',
    gradient: 'bg-gradient-to-br from-card/80 to-card/60 border-border/50 shadow-xl',
    neon: 'bg-card/90 border-primary/30 shadow-2xl shadow-primary/10 ring-1 ring-primary/20'
  };

  return (
    <Card className={cn(
      'transition-all duration-300 hover:shadow-lg hover:shadow-primary/5',
      variantStyles[variant],
      className
    )}>
      {(title || description || icon) && (
        <CardHeader className="space-y-3">
          {(title || icon) && (
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              {icon && <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>}
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-base">{description}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}