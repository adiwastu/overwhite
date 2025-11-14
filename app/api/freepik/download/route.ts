import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, getContentType } from '@/lib/r2-upload';

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
    // Step 1: Get temporary Freepik URL
    const apiUrl = `https://api.freepik.com/v1/resources/${resourceId}/download/${format}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'x-freepik-api-key': process.env.FREEPIK_API_KEY,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
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

    const freepikUrl = data.data[0].url;

    // Step 2: Download the actual file from Freepik
    console.log(`Downloading file from Freepik: ${freepikUrl}`);
    const fileResponse = await fetch(freepikUrl);
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from Freepik: ${fileResponse.status}`);
    }

    // Step 3: Get file as buffer
    const fileBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    // Step 4: Upload to R2
    const fileName = `freepik-${resourceId}.${format}`;
    const contentType = getContentType(format);
    
    console.log(`Uploading to R2: ${fileName}`);
    const r2Url = await uploadToR2(buffer, fileName, contentType);

    // Step 5: Return permanent R2 URL
    console.log(`Successfully uploaded to R2: ${r2Url}`);
    return NextResponse.json<SuccessResponse>({ 
      url: r2Url 
    });
    
  } catch (error) {
    console.error('Freepik download and R2 upload error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return NextResponse.json<ErrorResponse>(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
    }
    
    return NextResponse.json<ErrorResponse>(
      { error: error instanceof Error ? error.message : 'Failed to process download' },
      { status: 500 }
    );
  }
}