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

// Define possible states for the loading process
type LoadingState = 
  | 'idle' // Initial state
  | 'validating' // Checking input
  | 'parsing' // Parsing resource ID (though very quick, could be shown)
  | 'fetching-temp-urls' // Fetching from Freepik API
  | 'generating-permanent-urls' // Processing and uploading to R2
  | 'saving-records' // Saving to database
  | 'incrementing-credits' // Updating API call count
  | 'complete' // Process finished (will be reset quickly)
  | 'error'; // Error occurred (will be reset quickly)

interface DownloadCardProps {
  onDownloadComplete?: () => void;
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

export function DownloadCard({ onDownloadComplete, inputValue, onInputChange }: DownloadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');

  // Function to get the display text for the button based on the current state
  const getButtonText = (): string => {
    switch (loadingState) {
      case 'validating':
        return "Validating...";
      case 'parsing':
        return "Parsing..."; // Might be too quick to show, see below
      case 'fetching-temp-urls':
        return "Creating links...";
      case 'saving-records':
        return "Saving Records...";
      case 'incrementing-credits':
        return "Incrementing Credits...";
      case 'complete':
        return "Complete!";
      case 'error':
        return "Error!"; // This state might transition quickly, see handleConfirmRequest
      default: // 'idle'
        return "Request";
    }
  };

  // Determine if the button should be disabled
  const isButtonDisabled = loadingState !== 'idle';

  useEffect(() => {
    if (inputRef.current && inputValue !== undefined) {
      inputRef.current.value = inputValue;
    }
  }, [inputValue]);

  const extractResourceId = (url: string): string | null => {
    const match = url.match(/_(\d+)\.htm/);
    return match ? match[1] : null;
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
      // Don't throw here - we don't want to break the download flow if DB save fails
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
        // Don't throw - we don't want to break the download flow
    }
  };

  const handleConfirmRequest = async () => {
    // Start the process by setting the first state
    setLoadingState('validating');

    if (!inputRef.current?.value) {
        toast.error("Please enter a download link");
        setLoadingState('idle'); // Reset state
        return;
    }

    const link = inputRef.current.value;
    const resourceId = extractResourceId(link);

    if (!resourceId) {
        toast.error("Invalid link format. Could not extract resource ID.");
        setLoadingState('idle'); // Reset state
        return;
    }

    // Parsing step (might be too quick, but shown here for completeness)
    setLoadingState('parsing');
    // Parsing happens synchronously, so state might flicker. You could skip this step or add a small delay if desired.
    // setTimeout(() => setLoadingState('fetching-temp-urls'), 100); // Example of adding a small delay if needed

    // Move to fetching state
    setLoadingState('fetching-temp-urls');
    console.log("API request initiated for resource:", resourceId);

    try {
        const formats = ["eps", "png", "jpg", "svg"];
        const successfulDownloads: { format: string; url: string; filename: string }[] = [];

        // Make parallel requests for all formats
        const requests = formats.map(async (format) => {
        try {
            // Note: The API route itself handles fetching temp URL and generating permanent URL.
            // So from the client's perspective, these fetches represent the overall "fetching" step.
            const response = await fetch(
            `/api/freepik/download?resourceId=${resourceId}&format=${format}`
            );

            if (response.ok) {
            const data = await response.json();
            if (data.url) {
                const filename = `freepik-${resourceId}.${format}`;
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

        // Update state after fetching is done
        setLoadingState('saving-records');

        // Create database records for each successful download
        const dbPromises = successfulDownloads.map(async (download) => {
        await createDownloadRecord({
            original_url: link,
            download_url: download.url,
            file_type: download.format,
            file_name: download.filename
        });
        });

        await Promise.all(dbPromises);

        // Update state after saving records
        setLoadingState('incrementing-credits');

        // 🔥 INCREMENT API CALLS USED - one per successful format
        if (successfulDownloads.length > 0) {
        await incrementApiCalls(successfulDownloads.length);
        }

        // Update state after incrementing credits
        setLoadingState('complete'); // Show "Complete!" briefly

        // Show success message
        if (successfulDownloads.length > 0) {
        toast.success(`Successfully processed ${successfulDownloads.length} file(s)`);
        // Call the refresh callback to update HistoryCard
        if (onDownloadComplete) {
            onDownloadComplete();
        }
        } else {
        toast.error("No files were successfully processed");
        }

        // Reset the button state after a short delay to show "Complete!" or go back to "Request"
        setTimeout(() => {
            setLoadingState('idle');
        }, 1000); // Show "Complete!" for 1 second before resetting

    } catch (error) {
        console.error("Error in download process:", error);
        toast.error("Download process failed");
        setLoadingState('idle'); // Reset state
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
            <Badge variant="outline">Envato</Badge>
            <Badge variant="outline">Unsplash</Badge>
            <Badge variant="outline">Flicker</Badge>
            <Badge variant="outline">Shutterstock</Badge>
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
                disabled={isButtonDisabled} // Optionally disable input during process
              />
            </Field>
            <Field orientation="responsive" className="justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  {/* Use isButtonDisabled instead of isLoading */}
                  <Button type="submit" disabled={isButtonDisabled}>
                    <span className="flex items-center">
                      {/* Show spinner only if actively processing */}
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
                    {/* Disable buttons during the process */}
                    <AlertDialogCancel disabled={isButtonDisabled}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmRequest}
                      disabled={isButtonDisabled} // Disable action button during process
                    >
                      {/* Use text based on state, might be useful if state changes quickly after click */}
                      {isButtonDisabled ? "Processing..." : "Yes, Use My Credit"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                type="button"
                onClick={handleClear}
                disabled={isButtonDisabled} // Disable clear during process
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