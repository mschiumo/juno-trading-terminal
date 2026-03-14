# Juno Trading Terminal

A professional trading journal and portfolio management application built with Next.js. Track your trades, analyze performance, and manage your watchlist—all in one place.

## Features

- **📊 Trading Dashboard** - Overview of your trading performance with calendar view
- **📈 Trade Management** - Active trades, closed positions, and trade journal
- **📋 Watchlist** - Track stocks and setups you're monitoring
- **🎯 Profit Projection** - Calculate potential returns and risk/reward scenarios
- **📰 Market Overview** - Real-time market data with gap scanner and news screener
- **📓 Trade Journal** - Document your trading decisions and lessons learned

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: Redis (Upstash)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Redis instance (Upstash recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mschiumo/juno-trading-terminal.git
cd juno-trading-terminal
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your credentials (see Configuration section)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Redis Setup

This app uses Redis for data storage. We recommend Upstash:

1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the REST API credentials to `.env.local`:

```env
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Market Data (Optional)

For real-time market data, you can add:

**Finnhub** (Recommended - generous free tier):
1. Sign up at [finnhub.io](https://finnhub.io)
2. Get your API key
3. Add to `.env.local`:
```env
FINNHUB_API_KEY=your-api-key
MARKET_DATA_PROVIDER=finnhub
```

## Project Structure

```
juno-trading-terminal/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main trading dashboard
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   └── api/                  # API routes
│   │       ├── trades/           # Trade CRUD operations
│   │       ├── watchlist/        # Watchlist management
│   │       ├── active-trades/    # Active positions
│   │       ├── closed-positions/ # Trade history
│   │       └── market-data/      # Market data feeds
│   ├── components/
│   │   ├── trading/              # Trading-specific components
│   │   │   ├── WatchlistView.tsx
│   │   │   ├── ActiveTradesView.tsx
│   │   │   ├── ClosedPositionsView.tsx
│   │   │   ├── TradeCard.tsx
│   │   │   ├── CalendarView.tsx
│   │   │   ├── ProfitProjectionView.tsx
│   │   │   └── ...
│   │   ├── TradingView.tsx       # Main trading view
│   │   ├── MarketCard.tsx
│   │   ├── MarketHoursBanner.tsx
│   │   ├── GapScannerCard.tsx
│   │   └── NewsScreenerCard.tsx
│   ├── lib/                      # Utility functions
│   ├── types/                    # TypeScript definitions
│   └── hooks/                    # React hooks
├── public/                       # Static assets
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/trades` | GET/POST | List all trades or create new trade |
| `/api/trades/[id]` | GET/PUT/DELETE | Manage specific trade |
| `/api/trades/stats` | GET | Get trading statistics |
| `/api/trades/analytics` | GET | Performance analytics |
| `/api/trades/journal` | GET | Trade journal entries |
| `/api/trades/import` | POST | Import trades from CSV |
| `/api/trades/export` | GET | Export trades to CSV |
| `/api/watchlist` | GET/POST | Manage watchlist |
| `/api/active-trades` | GET/POST | Active positions |
| `/api/closed-positions` | GET/POST | Closed trades history |
| `/api/market-data` | GET | Real-time market data |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

## Screenshots

*Coming soon*

## License

MIT License - see LICENSE file for details

## Credits

Built with ❤️ using Next.js, Tailwind CSS, and Lucide Icons.

Originally extracted from [Juno Mission Control](https://github.com/mschiumo/juno-mission-control).
