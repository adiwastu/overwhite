// app\api\freepik\download\route.ts
import { NextRequest, NextResponse } from 'next/server';

// Define response types
type SuccessResponse = {
  url: string;
};

type ErrorResponse = {
  error: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get('resourceId');
  const format = searchParams.get('format') || 'eps';

  // Validate input
  if (!resourceId) {
    return NextResponse.json<ErrorResponse>(
      { error: 'Missing resourceId parameter' },
      { status: 400 }
    );
  }

  if (!process.env.FREEPIK_API_KEY) {
    console.error('Freepik API key not configured');
    return NextResponse.json<ErrorResponse>(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const apiUrl = `https://api.freepik.com/v1/resources/${resourceId}/download/${format}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'x-freepik-api-key': process.env.FREEPIK_API_KEY,
        'Accept': 'application/json',
      },
      // Optional: Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Freepik API error: ${response.status}`, errorText);
      
      if (response.status === 404) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Resource not found' },
          { status: 404 }
        );
      }
      
      if (response.status === 401) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      throw new Error(`Freepik API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid response format from Freepik API');
    }

    // Return only the download URL
    return NextResponse.json<SuccessResponse>({ 
      url: data.data[0].url 
    });
    
  } catch (error) {
    console.error('Freepik download error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return NextResponse.json<ErrorResponse>(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
    }
    
    return NextResponse.json<ErrorResponse>(
      { error: error instanceof Error ? error.message : 'Failed to fetch download URL' },
      { status: 500 }
    );
  }
}