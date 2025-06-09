
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { CreateRsvpInput, RsvpDisplay, Rsvp, CreateRsvpResponse, RsvpResponse, DeviceType } from '../../server/src/schema';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

function App() {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [existingRsvp, setExistingRsvp] = useState<Rsvp | null>(null);
  const [rsvpDisplays, setRsvpDisplays] = useState<RsvpDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<Omit<CreateRsvpInput, 'recaptcha_token'>>({
    phone_number: '',
    first_name: '',
    last_name: '',
    response: 'Yes',
    comment: null,
    device_type: 'Other'
  });

  // Get phone number from URL path
  useEffect(() => {
    const path = window.location.pathname;
    const phoneFromPath = path.replace('/', '').replace(/\D/g, '');
    if (phoneFromPath.length === 10) {
      setPhoneNumber(phoneFromPath);
      setFormData(prev => ({ ...prev, phone_number: phoneFromPath }));
    }
  }, []);

  // Detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent;
    let deviceType: DeviceType = 'Other';
    
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      deviceType = 'iPhone';
    } else if (/Android/.test(userAgent)) {
      deviceType = 'Android';
    }
    
    setFormData(prev => ({ ...prev, device_type: deviceType }));
  }, []);

  // Load existing RSVP if phone number exists
  const loadExistingRsvp = useCallback(async () => {
    if (phoneNumber.length === 10) {
      try {
        const rsvp = await trpc.getRsvpByPhone.query({ phoneNumber });
        setExistingRsvp(rsvp);
      } catch (error) {
        console.error('Failed to load existing RSVP:', error);
      }
    }
  }, [phoneNumber]);

  // Load RSVP displays
  const loadRsvpDisplays = useCallback(async () => {
    try {
      const displays = await trpc.getRsvpDisplays.query();
      setRsvpDisplays(displays);
    } catch (error) {
      console.error('Failed to load RSVP displays:', error);
    }
  }, []);

  useEffect(() => {
    loadExistingRsvp();
    loadRsvpDisplays();
  }, [loadExistingRsvp, loadRsvpDisplays]);

  const generateRecaptchaToken = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          window.grecaptcha!.execute(process.env.REACT_APP_RECAPTCHA_SITE_KEY || '', { 
            action: 'rsvp_submit' 
          }).then(resolve).catch(reject);
        });
      } else {
        // Fallback for development or when reCAPTCHA is not loaded
        resolve('development_token_' + Date.now());
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const recaptchaToken = await generateRecaptchaToken();
      
      const submitData: CreateRsvpInput = {
        ...formData,
        comment: formData.comment || null,
        recaptcha_token: recaptchaToken
      };

      const response: CreateRsvpResponse = await trpc.createRsvp.mutate(submitData);
      
      setSubmitStatus('success');
      setExistingRsvp(response.rsvp);
      
      // Reload displays to show the new RSVP
      await loadRsvpDisplays();
      
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderWalletButton = (rsvp: Rsvp) => {
    if (rsvp.device_type === 'iPhone' && rsvp.wallet_pass_url) {
      return (
        <Button 
          onClick={() => window.open(rsvp.wallet_pass_url!, '_blank')}
          className="bg-black text-white hover:bg-gray-800"
        >
          📱 Add to Apple Wallet
        </Button>
      );
    } else if (rsvp.device_type === 'Android' && rsvp.wallet_pass_url) {
      return (
        <Button 
          onClick={() => window.open(rsvp.wallet_pass_url!, '_blank')}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          📱 Add to Google Wallet
        </Button>
      );
    } else {
      // For 'Other' device type
      if (rsvp.wallet_pass_url) {
        // Web-based pass was generated, show QR code for the pass
        return (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Scan this QR code to view your digital pass:</p>
            <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
              <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                QR Code for:<br/>{rsvp.wallet_pass_url}
              </div>
            </div>
          </div>
        );
      } else {
        // No wallet pass available (response was 'No' or pass generation failed)
        // Show QR code for the current URL as deep link
        const currentUrl = window.location.href;
        return (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Scan this QR code to access your RSVP:</p>
            <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
              <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                QR Code for:<br/>{currentUrl}
              </div>
            </div>
          </div>
        );
      }
    }
  };

  const getBadgeColor = (response: RsvpResponse) => {
    switch (response) {
      case 'Yes': return 'bg-green-100 text-green-800';
      case 'Maybe': return 'bg-yellow-100 text-yellow-800';
      case 'No': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-2">👶 Baby Shower Invitation</h1>
          <p className="text-xl mb-4">It's a Boy! 💙</p>
          <div className="text-lg space-y-1">
            <p>📅 Sunday, July 27, 2025 at 12:00 PM</p>
            <p>📍 Bunbury Miami</p>
            <p className="text-sm">55 NE 14th St., Miami, FL 33132</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* RSVP Section */}
        <Card className="mb-8 border-blue-200 shadow-lg">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-2xl text-blue-800">
              {existingRsvp ? '✅ Your RSVP' : '📝 Please RSVP'}
            </CardTitle>
            <CardDescription>
              {existingRsvp 
                ? 'Thank you for your response! You can update it below if needed.'
                : 'We can\'t wait to celebrate with you!'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {existingRsvp ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Current RSVP Details:</h3>
                  <p><strong>Name:</strong> {existingRsvp.first_name} {existingRsvp.last_name}</p>
                  <p><strong>Response:</strong> 
                    <Badge className={`ml-2 ${getBadgeColor(existingRsvp.response)}`}>
                      {existingRsvp.response}
                    </Badge>
                  </p>
                  {existingRsvp.comment && (
                    <p><strong>Comment:</strong> {existingRsvp.comment}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    Submitted on: {existingRsvp.created_at.toLocaleDateString()}
                  </p>
                </div>
                
                {(existingRsvp.response === 'Yes' || existingRsvp.response === 'Maybe') && 
                 renderWalletButton(existingRsvp)}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.first_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData(prev => ({ ...prev, first_name: e.target.value }))
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.last_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData(prev => ({ ...prev, last_name: e.target.value }))
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phone_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, phone_number: value }));
                    }}
                    placeholder="1234567890"
                    required
                    className="mt-1"
                    disabled={phoneNumber.length === 10}
                  />
                  {phoneNumber.length === 10 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Phone number set from invitation link
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="response">Will you be attending? *</Label>
                  <Select 
                    value={formData.response} 
                    onValueChange={(value: RsvpResponse) => 
                      setFormData(prev => ({ ...prev, response: value }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">✅ Yes, I'll be there!</SelectItem>
                      <SelectItem value="Maybe">🤔 Maybe</SelectItem>
                      <SelectItem value="No">❌ Sorry, can't make it</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="comment">Message for the parents (optional)</Label>
                  <Textarea
                    id="comment"
                    value={formData.comment || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData(prev => ({ 
                        ...prev, 
                        comment: e.target.value || null 
                      }))
                    }
                    placeholder="Share your excitement or well wishes..."
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>

                {submitStatus === 'error' && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                >
                  {isLoading ? '🔄 Submitting...' : '💌 Send RSVP'}
                </Button>
              </form>
            )}

            {submitStatus === 'success' && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">
                  🎉 Thank you for your RSVP! We're excited to celebrate with you.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* RSVP Displays */}
        {rsvpDisplays.length > 0 && (
          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-xl text-blue-800">
                👥 Who's Coming to Celebrate
              </CardTitle>
              <CardDescription>
                See what others are saying about the big day!
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {rsvpDisplays.map((display: RsvpDisplay, index: number) => (
                  <div key={index}>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {display.first_name.charAt(0)}{display.last_name_initial}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {display.first_name} {display.last_name_initial}.
                        </p>
                        {display.comment && (
                          <p className="text-gray-600 text-sm mt-1 italic">
                            "{display.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                    {index < rsvpDisplays.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="bg-blue-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            💙 Can't wait to shower this little prince with love! 💙
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
