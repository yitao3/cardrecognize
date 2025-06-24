import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const pagePassword = process.env.PAGE_ACCESS_PASSWORD;

  if (!pagePassword) {
    // If the password is not set on the server, deny access
    // to avoid being insecure by default.
    return NextResponse.json({ error: 'Password not configured on server.' }, { status: 500 });
  }

  if (password === pagePassword) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }
} 