// components/download-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Field,
  FieldGroup,
} from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRef, useState, useEffect } from "react";
import PocketBase from 'pocketbase';
import { toast } from 'sonner';

type LoadingState = 
  | 'idle'
  | 'validating'
  | 'parsing'
  | 'fetching-temp-urls'
  | 'generating-permanent-urls'
  | 'saving-records'
  | 'incrementing-credits'
  | 'complete'
  | 'error';

interface DownloadCardProps {
  onDownloadComplete?: () => void;
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

// NEW: Type to represent the platform detected from the URL
type Platform = 'freepik' | 'flaticon' | null;

// NEW: Enhanced return type that includes both the resource ID and platform
interface ResourceInfo {
  id: string;
  platform: Platform;
}

export function DownloadCard({ onDownloadComplete, inputValue, onInputChange }: DownloadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');

  const getButtonText = (): string => {
    switch (loadingState) {
      case 'validating':
        return "Validating...";
      case 'parsing':
        return "Parsing...";
      case 'fetching-temp-urls':
        return "Creating links...";
      case 'saving-records':
        return "Saving Records...";
      case 'incrementing-credits':
        return "Incrementing Credits...";
      case 'complete':
        return "Complete!";
      case 'error':
        return "Error!";
      default:
        return "Request";
    }
  };

  const isButtonDisabled = loadingState !== 'idle';

  useEffect(() => {
    if (inputRef.current && inputValue !== undefined) {
      inputRef.current.value = inputValue;
    }
  }, [inputValue]);

  // UPDATED: This function now returns both the resource ID and the platform
  // This is called a "Discriminated Union Pattern" - where we return an object
  // that contains both the data and metadata about what type of data it is
  const extractResourceId = (url: string): ResourceInfo | null => {
    // Handle flaticon.com pattern: /free-icon/..._digits
    const flaticonMatch = url.match(/flaticon\.com.*_(\d+)(?:\?|$)/);
    if (flaticonMatch) {
      return {
        id: flaticonMatch[1],
        platform: 'flaticon'
      };
    }
    
    // Handle freepik.com pattern: /..._digits.htm
    const freepikMatch = url.match(/_(\d+)\.htm/);
    if (freepikMatch) {
      return {
        id: freepikMatch[1],
        platform: 'freepik'
      };
    }
    
    return null;
  };

  const createDownloadRecord = async (downloadData: {
    original_url: string;
    download_url: string;
    file_type: string;
    file_name: string;
  }) => {
    try {
      const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
      pb.autoCancellation(false)

      if (!pb.authStore.isValid) {
        console.error('User not authenticated');
        return;
      }

      const record = await pb.collection('downloads').create({
        user: pb.authStore.record?.id,
        ...downloadData,
        download_count: 0
      });

      return record;
    } catch (error) {
      console.error('Error creating download record:', error);
    }
  };

  const incrementApiCalls = async (incrementBy: number) => {
    try {
        const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
        pb.autoCancellation(false)

        if (!pb.authStore.isValid || !pb.authStore.record) {
        console.error('User not authenticated');
        return;
        }

        const currentUser = await pb.collection('users').getOne(pb.authStore.record.id);
        const currentCalls = currentUser.api_calls_used || 0;

        await pb.collection('users').update(pb.authStore.record.id, {
        api_calls_used: currentCalls + incrementBy
        });

        console.log(`Incremented API calls by ${incrementBy}. New total: ${currentCalls + incrementBy}`);

    } catch (error) {
        console.error('Error incrementing API calls:', error);
    }
  };

  const handleConfirmRequest = async () => {
    setLoadingState('validating');

    if (!inputRef.current?.value) {
        toast.error("Please enter a download link");
        setLoadingState('idle');
        return;
    }

    const link = inputRef.current.value;
    // UPDATED: Now receives an object with both id and platform
    const resourceInfo = extractResourceId(link);

    if (!resourceInfo) {
        toast.error("Invalid link format. Could not extract resource ID.");
        setLoadingState('idle');
        return;
    }

    setLoadingState('parsing');
    setLoadingState('fetching-temp-urls');
    
    // UPDATED: Destructure to get both pieces of information
    const { id: resourceId, platform } = resourceInfo;
    console.log(`API request initiated for ${platform} resource:`, resourceId);

    try {
        const formats = ["eps", "png", "jpg", "svg"];
        const successfulDownloads: { format: string; url: string; filename: string }[] = [];

        // UPDATED: Map function now uses the platform to construct the correct API endpoint
        // This is called "Dynamic Route Construction" - building URLs programmatically
        const requests = formats.map(async (format) => {
        try {
            // UPDATED: Use the platform variable to route to the correct API endpoint
            const response = await fetch(
            `/api/${platform}/download?resourceId=${resourceId}&format=${format}`
            );

            if (response.ok) {
            const data = await response.json();
            if (data.url) {
                // UPDATED: Include platform name in filename for clarity
                const filename = `${platform}-${resourceId}.${format}`;
                successfulDownloads.push({
                format,
                url: data.url,
                filename
                });
                console.log(`✅ ${format.toUpperCase()}: ${data.url}`);
            }
            } else {
            console.log(`❌ ${format.toUpperCase()}: ${response.status} - ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Error fetching ${format}:`, error);
        }
        });

        await Promise.all(requests);

        setLoadingState('saving-records');

        const dbPromises = successfulDownloads.map(async (download) => {
        await createDownloadRecord({
            original_url: link,
            download_url: download.url,
            file_type: download.format,
            file_name: download.filename
        });
        });

        await Promise.all(dbPromises);

        setLoadingState('incrementing-credits');

        if (successfulDownloads.length > 0) {
        await incrementApiCalls(successfulDownloads.length);
        }

        setLoadingState('complete');

        if (successfulDownloads.length > 0) {
        toast.success(`Successfully processed ${successfulDownloads.length} file(s)`);
        if (onDownloadComplete) {
            onDownloadComplete();
        }
        } else {
        toast.error("No files were successfully processed");
        }

        setTimeout(() => {
            setLoadingState('idle');
        }, 1000);

    } catch (error) {
        console.error("Error in download process:", error);
        toast.error("Download process failed");
        setLoadingState('idle');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onInputChange) {
      onInputChange(e.target.value);
    }
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      if (onInputChange) {
        onInputChange("");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download</CardTitle>
        <CardDescription>Paste your links here.</CardDescription>
        <CardAction>
          <div className="flex w-full flex-wrap gap-2">
            <Badge variant="default">Freepik</Badge>
            <Badge variant="default">Flaticon</Badge>
            <Badge variant="outline">Unsplash</Badge>
            <Badge variant="outline">Flicker</Badge>
            <Badge variant="outline">Envato</Badge>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <FieldGroup>
            <Field>
              <Input
                ref={inputRef}
                id="links"
                autoComplete="off"
                placeholder="Paste your download links here..."
                onChange={handleInputChange}
                disabled={isButtonDisabled}
              />
            </Field>
            <Field orientation="responsive" className="justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="submit" disabled={isButtonDisabled}>
                    <span className="flex items-center">
                      {(loadingState !== 'idle' && loadingState !== 'complete' && loadingState !== 'error') && (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      )}
                      <span className="whitespace-nowrap">
                        {getButtonText()}
                      </span>
                    </span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Download Request</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will use 1 credit from your account.
                      Each download costs real money that you've purchased.
                      Are you sure you want to proceed with this request?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isButtonDisabled}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmRequest}
                      disabled={isButtonDisabled}
                    >
                      {isButtonDisabled ? "Processing..." : "Yes, Use My Credit"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                type="button"
                onClick={handleClear}
                disabled={isButtonDisabled}
              >
                Clear all
              </Button>
            </Field>
          </FieldGroup>
        </div>
      </CardContent>
    </Card>
  );
}