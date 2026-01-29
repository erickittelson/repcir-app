"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Cookie, Shield, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  hasConsented,
  getConsentPreferences,
  saveConsentPreferences,
  acceptAllCookies,
  rejectAllCookies,
  detectRegion,
  type ConsentPreferences,
} from "@/lib/privacy/consent-manager";

interface CookieBannerProps {
  className?: string;
}

export function CookieBanner({ className }: CookieBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [region, setRegion] = useState<"eu" | "california" | "other">("other");
  const [preferences, setPreferences] = useState<Partial<ConsentPreferences>>({
    analytics: false,
    marketing: false,
    personalization: false,
    doNotSell: false,
  });

  useEffect(() => {
    // Check if consent is needed
    const consentGiven = hasConsented();
    if (!consentGiven) {
      setShowBanner(true);
    }

    // Detect region for compliance messaging
    detectRegion().then(setRegion);

    // Load existing preferences if available
    const existing = getConsentPreferences();
    if (existing) {
      setPreferences({
        analytics: existing.analytics,
        marketing: existing.marketing,
        personalization: existing.personalization,
        doNotSell: existing.doNotSell,
      });
    }
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleRejectAll = () => {
    rejectAllCookies();
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleSavePreferences = () => {
    saveConsentPreferences({
      ...preferences,
      region,
    });
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Main Banner */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-background border-t shadow-lg",
          className
        )}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-1">
                <Cookie className="h-6 w-6 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm md:text-base">
                  We value your privacy
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {region === "eu" ? (
                    <>
                      We use cookies to enhance your experience. Under GDPR, you have
                      the right to choose which cookies you allow.{" "}
                      <a href="/privacy-policy" className="underline hover:text-foreground">
                        Privacy Policy
                      </a>
                    </>
                  ) : region === "california" ? (
                    <>
                      We use cookies and may share your information with partners.
                      Under CCPA, you can opt out of the sale of your personal information.{" "}
                      <a href="/privacy-policy" className="underline hover:text-foreground">
                        Privacy Policy
                      </a>
                    </>
                  ) : (
                    <>
                      We use cookies to improve your experience and analyze site usage.{" "}
                      <a href="/privacy-policy" className="underline hover:text-foreground">
                        Privacy Policy
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="flex-1 md:flex-none"
              >
                <Settings className="h-4 w-4 mr-1" />
                Customize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="flex-1 md:flex-none"
              >
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="flex-1 md:flex-none bg-brand hover:bg-brand/90"
              >
                Accept All
              </Button>
            </div>
          </div>

          {/* CCPA "Do Not Sell" Link */}
          {region === "california" && (
            <div className="mt-3 pt-3 border-t">
              <button
                onClick={() => {
                  setPreferences((p) => ({ ...p, doNotSell: true, marketing: false }));
                  setShowSettings(true);
                }}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Do Not Sell or Share My Personal Information
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage how we use cookies and your data. Required cookies cannot be
              disabled as they are necessary for the site to function.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Necessary Cookies - Always On */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">Necessary Cookies</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for core functionality like authentication, security,
                      and saving preferences.
                    </p>
                  </div>
                  <Switch checked disabled className="ml-4" />
                </div>
              </CardContent>
            </Card>

            {/* Analytics Cookies */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">Analytics Cookies</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Help us understand how you use the app so we can improve it.
                      Data is anonymized.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.analytics}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({ ...p, analytics: checked }))
                    }
                    className="ml-4"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Marketing Cookies */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">Marketing Cookies</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used to show relevant ads and measure campaign effectiveness.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.marketing}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({ ...p, marketing: checked }))
                    }
                    className="ml-4"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Personalization Cookies */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium">Personalization</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enable personalized recommendations based on your activity and
                      preferences.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.personalization}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({ ...p, personalization: checked }))
                    }
                    className="ml-4"
                  />
                </div>
              </CardContent>
            </Card>

            {/* CCPA Do Not Sell */}
            {region === "california" && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="font-medium">
                        Do Not Sell My Personal Information
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Under California law (CCPA), you can opt out of the sale or
                        sharing of your personal information.
                      </p>
                    </div>
                    <Switch
                      checked={preferences.doNotSell}
                      onCheckedChange={(checked) =>
                        setPreferences((p) => ({
                          ...p,
                          doNotSell: checked,
                          marketing: checked ? false : p.marketing,
                        }))
                      }
                      className="ml-4"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={handleRejectAll} className="flex-1">
              Reject All
            </Button>
            <Button onClick={handleSavePreferences} className="flex-1">
              Save Preferences
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            You can change these preferences anytime in Settings.{" "}
            <a href="/privacy-policy" className="underline">
              Privacy Policy
            </a>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CookieBanner;
