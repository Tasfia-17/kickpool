import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'auth') {
        return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
}

export async function POST(request: Request) {
    return GET(request);
}

export async function PUT(request: Request) {
    return GET(request);
}

export async function DELETE(request: Request) {
    return GET(request);
}

export async function PATCH(request: Request) {
    return GET(request);
}
