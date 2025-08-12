import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { SubscriptionStatus } from '../components/SubscriptionStatus';
import { TrialStatus } from '../components/TrialStatus';
import { useSubscription } from '../hooks/useSubscription';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { Link } from 'react-router-dom';
import { Crown, Settings, LogOut, ShoppingBag, Zap, Trash2 } from 'lucide-react';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const { hasActiveSubscription, isTrialing } = useSubscription();
  const { isTrialActive, isTrialExpired, isScheduledForDeletion } = useTrialStatus();

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will remove your access to AI workflows.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Delete Axie Studio account first
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (error) {
      console.error('Failed to delete Axie Studio account:', error);
    }

    // Sign out from Supabase (this will also clean up the session)
    await signOut();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none">
                <Crown className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-black uppercase tracking-wide">DASHBOARD</h1>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors font-medium uppercase tracking-wide"
              >
                <LogOut className="w-4 h-4" />
                SIGN OUT
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-black mb-4 uppercase tracking-wide">
            {hasActiveSubscription || isTrialing ? 'AI WORKFLOWS READY' : 'WELCOME TO AXIE STUDIO'}
          </h2>
          <p className="text-gray-600 text-lg">
            {hasActiveSubscription || isTrialing 
              ? 'Your AI workflow platform is active and ready to use.'
              : 'Start your 7-day free trial to access advanced AI workflow capabilities.'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                TRIAL STATUS
              </h3>
              <TrialStatus />
            </div>

            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                SUBSCRIPTION STATUS
              </h3>
              <SubscriptionStatus />
            </div>

            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                QUICK ACTIONS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Link
                  to="/products"
                  className="flex items-center gap-4 p-6 border-2 border-black rounded-none hover:bg-gray-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                >
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-black uppercase tracking-wide">VIEW PLANS</h4>
                    <p className="text-sm text-gray-600">Upgrade or change plan</p>
                  </div>
                </Link>
                
                {(hasActiveSubscription || isTrialing) && (
                  <a
                    href="https://axiestudio-axiestudio-ttefi.ondigitalocean.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-6 border-2 border-black rounded-none hover:bg-gray-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  >
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-black uppercase tracking-wide">LAUNCH STUDIO</h4>
                      <p className="text-sm text-gray-600">Access AI workflow builder</p>
                    </div>
                  </a>
                )}
                
                {!(hasActiveSubscription || isTrialing) && !isTrialExpired && !isScheduledForDeletion && (
                  <div className="flex items-center gap-4 p-6 border-2 border-gray-300 rounded-none opacity-50">
                    <div className="w-12 h-12 bg-gray-300 text-gray-500 flex items-center justify-center rounded-none">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-500 uppercase tracking-wide">AI WORKFLOWS</h4>
                      <p className="text-sm text-gray-400">Requires active subscription</p>
                    </div>
                  </div>
                )}

                {(isTrialExpired || isScheduledForDeletion) && !hasActiveSubscription && (
                  <div className="flex items-center gap-4 p-6 border-2 border-red-600 rounded-none bg-red-50">
                    <div className="w-12 h-12 bg-red-600 text-white flex items-center justify-center rounded-none">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-800 uppercase tracking-wide">TRIAL EXPIRED</h4>
                      <p className="text-sm text-red-700">Upgrade to Pro to restore access</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                ACCOUNT INFO
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-black uppercase tracking-wide">EMAIL</label>
                  <p className="text-gray-900 font-medium">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-black uppercase tracking-wide">MEMBER SINCE</label>
                  <p className="text-gray-900 font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black text-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">
                {hasActiveSubscription || isTrialing ? 'STUDIO ACCESS' : 
                 isTrialExpired || isScheduledForDeletion ? 'UPGRADE REQUIRED' : 'START FREE TRIAL'}
              </h3>
              <p className="text-gray-300 text-sm mb-6">
                {hasActiveSubscription || isTrialing 
                  ? 'Your AI workflow studio is ready to use with full access to all features.'
                  : isTrialExpired || isScheduledForDeletion
                  ? 'Your trial has expired. Upgrade to Pro to restore access to AI workflows.'
                  : 'Get 7 days free access to advanced AI workflow capabilities.'
                }
              </p>
              {hasActiveSubscription || isTrialing ? (
                <a
                  href="https://axiestudio-axiestudio-ttefi.ondigitalocean.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-none font-bold hover:bg-gray-100 transition-colors uppercase tracking-wide border-2 border-white hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                >
                  <Zap className="w-4 h-4" />
                  OPEN STUDIO
                </a>
              ) : !(isTrialExpired || isScheduledForDeletion) ? (
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-none font-bold hover:bg-gray-100 transition-colors uppercase tracking-wide border-2 border-white hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                >
                  <Crown className="w-4 h-4" />
                  START TRIAL
                </Link>
              ) : (
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-none font-bold hover:bg-red-700 transition-colors uppercase tracking-wide border-2 border-red-600 hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                >
                  <Crown className="w-4 h-4" />
                  UPGRADE NOW
                </Link>
              )}
            </div>

            <div className="bg-white border-2 border-red-500 rounded-none shadow-[8px_8px_0px_0px_rgba(239,68,68,1)] p-6">
              <h3 className="text-lg font-bold text-red-600 mb-3 uppercase tracking-wide">
                DANGER ZONE
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Permanently delete your account and all associated data. This will also remove your Axie Studio account.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-none font-bold hover:bg-red-700 transition-colors uppercase tracking-wide text-sm border-2 border-red-600"
              >
                <Trash2 className="w-4 h-4" />
                DELETE ACCOUNT
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}