'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface MarketCountdownProps {
  compact?: boolean;
}

export default function MarketCountdown({ compact = false }: MarketCountdownProps) {
  const [timeUntilClose, setTimeUntilClose] = useState<string>('');
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(true);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = estTime.getDay();
      const hour = estTime.getHours();
      const minute = estTime.getMinutes();
      const currentMinutes = hour * 60 + minute;

      // Market hours: 9:30 AM - 4:00 PM EST, Mon-Fri
      const marketOpenMinutes = 9 * 60 + 30;
      const marketCloseMinutes = 16 * 60;

      const isWeekday = day >= 1 && day <= 5;
      const isWithinMarketHours = currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes;
      const marketIsOpen = isWeekday && isWithinMarketHours;

      setIsMarketOpen(marketIsOpen);

      if (marketIsOpen) {
        // Countdown to market close
        const minutesUntilClose = marketCloseMinutes - currentMinutes;
        const hours = Math.floor(minutesUntilClose / 60);
        const mins = minutesUntilClose % 60;
        setTimeUntilClose(`${hours}h ${mins}m`);
      } else {
        // Countdown to next market open
        let minutesUntilOpen: number;
        if (day === 6) {
          // Saturday - next open is Monday 9:30 AM
          minutesUntilOpen = (24 * 60 - currentMinutes) + (24 * 60) + marketOpenMinutes;
        } else if (day === 0) {
          // Sunday - next open is Monday 9:30 AM
          minutesUntilOpen = (24 * 60 - currentMinutes) + marketOpenMinutes;
        } else if (currentMinutes >= marketCloseMinutes) {
          // After hours on weekday - next open is tomorrow 9:30 AM
          minutesUntilOpen = (24 * 60 - currentMinutes) + marketOpenMinutes;
        } else {
          // Before market open - today 9:30 AM
          minutesUntilOpen = marketOpenMinutes - currentMinutes;
        }
        const hours = Math.floor(minutesUntilOpen / 60);
        const mins = minutesUntilOpen % 60;
        setTimeUntilClose(`${hours}h ${mins}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <span className={`text-xs ${isMarketOpen ? 'text-[#238636]' : 'text-[#8b949e]'}`}>
        {isMarketOpen ? `Closes in ${timeUntilClose}` : `Opens in ${timeUntilClose}`}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
      isMarketOpen ? 'bg-[#238636]/20 text-[#238636]' : 'bg-[#8b949e]/20 text-[#8b949e]'
    }`}>
      <Clock className="w-3 h-3" />
      <span>{isMarketOpen ? `Market closes in ${timeUntilClose}` : `Market opens in ${timeUntilClose}`}</span>
    </div>
  );
}
