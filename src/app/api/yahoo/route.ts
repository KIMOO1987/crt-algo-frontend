import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || '5m';
  let period1 = searchParams.get('period1');
  let period2 = searchParams.get('period2');
  let range = searchParams.get('range');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // Yahoo limits:
  // 1m: 7 days max
  // 2m, 5m, 15m, 30m, 90m: 60 days max (~17,200 candles)
  // 60m, 1h: 730 days max (2 full years = ~17,500 candles)
  // 1d, 1wk: 10y-20y+ (5y default)
  if (['2m', '5m', '15m', '30m', '90m'].includes(interval)) {
    const maxPastSec = nowSec - (59 * 86400); // 59 days ago
    if (period1 && Number(period1) < maxPastSec) {
      period1 = String(maxPastSec);
    }
  } else if (interval === '1m') {
    const maxPastSec = nowSec - (6.5 * 86400); // 6.5 days ago
    if (period1 && Number(period1) < maxPastSec) {
      period1 = String(maxPastSec);
    }
  } else if (['60m', '1h'].includes(interval)) {
    const maxPastSec = nowSec - (728 * 86400); // 728 days ago (2 years)
    if (period1 && Number(period1) < maxPastSec) {
      period1 = String(maxPastSec);
    }
  }

  // Determine intelligent default range for deep history if not explicitly given
  if (!range && !period1) {
    if (interval === '1m') {
      range = '7d';
    } else if (['2m', '5m', '15m', '30m', '90m'].includes(interval)) {
      range = '60d'; // ~17,200 candles!
    } else if (['60m', '1h'].includes(interval)) {
      range = '730d'; // 2 full years of hourly candles (~17,500 candles)!
    } else if (interval === '1d') {
      range = '5y'; // 5 full years of daily candles!
    } else if (interval === '1wk') {
      range = '10y';
    } else {
      range = '60d';
    }
  }

  try {
    const encodedSym = encodeURIComponent(symbol);
    const query = period1 && period2
      ? `interval=${interval}&period1=${period1}&period2=${period2}`
      : `interval=${interval}&range=${range || '60d'}`;

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSym}?${query}`;
    let response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    let data = await response.json();

    // If Yahoo rejected period1/period2 with an error, gracefully retry with the deepest safe range
    if (data?.chart?.error || !data?.chart?.result) {
      const fallbackRange = interval === '1d' ? '5y' : (['60m', '1h'].includes(interval) ? '730d' : '60d');
      const fallbackUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSym}?interval=${interval}&range=${fallbackRange}`;
      const fbResponse = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      data = await fbResponse.json();
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Yahoo Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data from Yahoo' }, { status: 500 });
  }
}
