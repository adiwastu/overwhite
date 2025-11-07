// components/download-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export function DownloadCard() {
  const handleConfirmRequest = () => {
    console.log("API request initiated");
    // This is where you'd make your actual API call
  };

  return (
    <div className="space-y-6">
      <FieldGroup>
        <Field>
          <Input id="links" autoComplete="off" placeholder="Paste your download links here..." />
        </Field>
        <Field orientation="responsive" className="justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="submit">Request</Button>
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmRequest}>
                  Yes, Use My Credit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" type="button">
            Clear all
          </Button>
        </Field>
      </FieldGroup>
    </div>
  );
}