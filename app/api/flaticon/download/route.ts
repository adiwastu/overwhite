// app/api/flaticon/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, getContentType } from '@/lib/r2-upload';

// Define response types using Type Aliases for better maintainability
type SuccessResponse = {
  url: string;
};

type ErrorResponse = {
  error: string;
};

export async function GET(request: NextRequest) {
  // Destructure searchParams using Object Destructuring Pattern
  const { searchParams } = new URL(request.url);
  const iconId = searchParams.get('resourceId');
  const format = searchParams.get('format') || 'png';
  // Hardcode png_size to 512 (standard size for all formats)
  const pngSize = '512';

  // Input validation with Early Return Pattern
  if (!iconId) {
    return NextResponse.json<ErrorResponse>(
      { error: 'Missing iconId parameter' },
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
    // Step 1: Build API URL with Query String Parameters
    // Note: Flaticon uses the same API infrastructure as Freepik
    const apiUrl = new URL(`https://api.freepik.com/v1/icons/${iconId}/download`);
    apiUrl.searchParams.append('format', format);
    // Always include png_size parameter (API requirement, even for non-PNG formats)
    apiUrl.searchParams.append('png_size', pngSize);

    // Step 2: Fetch temporary Flaticon URL
    console.log(`Requesting Flaticon download: ${apiUrl.toString()}`);
    
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'x-freepik-api-key': process.env.FREEPIK_API_KEY,
        'Accept': 'application/json',
      },
      // Timeout Pattern using AbortSignal for request timeout
      signal: AbortSignal.timeout(10000),
    });

    // Error handling with Status Code Mapping Pattern
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Flaticon API error: ${response.status}`, errorText);
      
      if (response.status === 404) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Icon not found' },
          { status: 404 }
        );
      }
      
      if (response.status === 401) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      throw new Error(`Flaticon API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure using Guard Clause Pattern
    if (!data.data || !data.data.url) {
      throw new Error('Invalid response format from Flaticon API');
    }

    const flaticonUrl = data.data.url;
    const originalFilename = data.data.filename || `flaticon-${iconId}`;

    // Step 3: Download the actual file from Flaticon
    console.log(`Downloading file from Flaticon: ${flaticonUrl}`);
    const fileResponse = await fetch(flaticonUrl);
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from Flaticon: ${fileResponse.status}`);
    }

    // Step 4: Convert to Buffer using Stream-to-Buffer Pattern
    const fileBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    // Step 5: Upload to R2 using Shared Library Pattern
    // This is the DRY principle in action - reusing the same upload logic
    const fileName = `flaticon-${iconId}.${format}`;
    const contentType = getContentType(format);
    
    console.log(`Uploading to R2: ${fileName}`);
    const r2Url = await uploadToR2(buffer, fileName, contentType);

    // Step 6: Return permanent R2 URL
    console.log(`Successfully uploaded to R2: ${r2Url}`);
    return NextResponse.json<SuccessResponse>({ 
      url: r2Url 
    });
    
  } catch (error) {
    // Centralized Error Handling with Type Guard Pattern
    console.error('Flaticon download and R2 upload error:', error);
    
    if (error instanceof Error) {
      // Handle timeout errors specifically
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return NextResponse.json<ErrorResponse>(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
    }
    
    // Generic error fallback
    return NextResponse.json<ErrorResponse>(
      { error: error instanceof Error ? error.message : 'Failed to process download' },
      { status: 500 }
    );
  }
}