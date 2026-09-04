import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || '5m';
  const period1 = searchParams.get('period1');
  const period2 = searchParams.get('period2');

  // Determine intelligent default range for deep history if not explicitly given
  let range = searchParams.get('range');
  if (!range && !period1) {
    if (interval === '1m') {
      range = '7d';
    } else if (['2m', '5m', '15m', '30m', '90m'].includes(interval)) {
      range = '60d';
    } else if (['60m', '1h'].includes(interval)) {
      range = '730d'; // 2 full years of hourly candles
    } else if (interval === '1d') {
      range = '5y';
    } else if (interval === '1wk') {
      range = '10y';
    } else {
      range = '60d';
    }
  }

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const encodedSym = encodeURIComponent(symbol);
    const query = period1 && period2
      ? `interval=${interval}&period1=${period1}&period2=${period2}`
      : `interval=${interval}&range=${range || '60d'}`;

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSym}?${query}`;
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Yahoo Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data from Yahoo' }, { status: 500 });
  }
}
