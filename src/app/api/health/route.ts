// src/app/api/public-health/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ 
    status: 'online', 
    message: 'KIMOO CRT Engine Active' 
  });
}
