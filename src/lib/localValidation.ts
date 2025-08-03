// Local validation cache for fast offline validation
export interface CachedTicket {
  qrCode: string;
  status: 'valid' | 'used' | 'invalid';
  name?: string;
  email?: string;
  phone?: string;
  eventName?: string;
  lastSync: number;
}

class LocalValidationCache {
  private cache = new Map<string, CachedTicket>();
  private readonly CACHE_KEY = 'ticket_validation_cache';
  private readonly SYNC_INTERVAL = 1000; // 1 second sync interval

  constructor() {
    this.loadFromStorage();
  }

  // Load cache from localStorage
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.CACHE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }

  // Save cache to localStorage
  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }

  // Add or update ticket in cache
  updateTicket(qrCode: string, ticket: Omit<CachedTicket, 'lastSync'>) {
    this.cache.set(qrCode, {
      ...ticket,
      lastSync: Date.now()
    });
    this.saveToStorage();
  }

  // Get ticket from cache
  getTicket(qrCode: string): CachedTicket | null {
    return this.cache.get(qrCode) || null;
  }

  // Check if ticket exists and is valid
  isTicketValid(qrCode: string): boolean {
    const ticket = this.cache.get(qrCode);
    return ticket ? ticket.status === 'valid' : false;
  }

  // Mark ticket as used locally (for instant feedback)
  markAsUsedLocally(qrCode: string): boolean {
    const ticket = this.cache.get(qrCode);
    if (ticket && ticket.status === 'valid') {
      this.updateTicket(qrCode, {
        ...ticket,
        status: 'used'
      });
      return true;
    }
    return false;
  }

  // Load tickets from database to cache
  async syncFromDatabase(tickets: any[]) {
    for (const ticket of tickets) {
      this.updateTicket(ticket.qr_code, {
        qrCode: ticket.qr_code,
        status: ticket.status,
        name: ticket.name,
        email: ticket.email,
        phone: ticket.phone,
        eventName: ticket.event_name
      });
    }
  }

  // Clear cache
  clear() {
    this.cache.clear();
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Get all tickets
  getAllTickets(): CachedTicket[] {
    return Array.from(this.cache.values());
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }
}

export const localValidationCache = new LocalValidationCache();