import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, AuthProvider } from '../../../server/src/schema';

interface UserAuthProps {
  onLogin: (user: User) => void;
}

export function UserAuth({ onLogin }: UserAuthProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: ''
  });

  const handleSocialLogin = async (provider: AuthProvider) => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would integrate with actual OAuth providers
      // For now, we'll create a mock user for demonstration
      const mockUser = await trpc.createUser.mutate({
        email: `${provider}user@example.com`,
        display_name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        auth_provider: provider,
        auth_provider_id: `${provider}_${Date.now()}`
      });

      onLogin(mockUser);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Social login failed:', error);
      setError(error.message || 'Failed to log in with social provider');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to find existing user
      const existingUser = await trpc.getUserByEmail.query(formData.email);
      if (existingUser) {
        onLogin(existingUser);
        setIsOpen(false);
        return;
      }

      // User doesn't exist, show error for login
      setError('No account found with this email. Please sign up first.');
    } catch (error: any) {
      console.error('Email login failed:', error);
      setError('Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!formData.email.trim() || !formData.displayName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user already exists
      try {
        const existingUser = await trpc.getUserByEmail.query(formData.email);
        if (existingUser) {
          setError('An account with this email already exists. Please log in instead.');
          return;
        }
      } catch (error) {
        // User doesn't exist, which is what we want for signup
      }

      // Create new user
      const newUser = await trpc.createUser.mutate({
        email: formData.email,
        display_name: formData.displayName,
        auth_provider: 'email',
        auth_provider_id: `email_${Date.now()}`
      });

      onLogin(newUser);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Email signup failed:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ email: '', displayName: '', password: '' });
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          🔐 Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            🔴 Sign in to Dotz.fit
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Social Login */}
          <div className="space-y-3">
            <div className="text-center text-sm text-gray-600 mb-3">
              Quick sign in with social accounts
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                className="flex items-center gap-2 hover:bg-red-50"
              >
                🔴 Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={isLoading}
                className="flex items-center gap-2 hover:bg-blue-50"
              >
                🔵 Facebook
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email Auth */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginEmail">Email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                />
              </div>
              <Button 
                onClick={handleEmailLogin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? '⏳ Signing In...' : '📧 Sign In'}
              </Button>
              <p className="text-xs text-center text-gray-600">
                💡 For demo purposes, any valid email will work
              </p>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signupEmail">Email</Label>
                <Input
                  id="signupEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your Name"
                />
              </div>
              <Button 
                onClick={handleEmailSignup}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? '⏳ Creating Account...' : '🎉 Create Account'}
              </Button>
              <p className="text-xs text-center text-gray-600">
                💡 No password required for demo - just email and name
              </p>
            </TabsContent>
          </Tabs>

          {/* Guest Mode Notice */}
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>🎮 Guest Mode Available:</strong><br />
              You can play and create puzzles without signing in. 
              Sign in to save progress and publish puzzles!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}