import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use Google OAuth para criar conta' },
    { status: 400 }
  );
}

export async function GET() {
  return NextResponse.redirect('/login');
}
