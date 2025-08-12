import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { SubscriptionStatus } from '../components/SubscriptionStatus';
import { Link } from 'react-router-dom';
import { Crown, Settings, LogOut, ShoppingBag } from 'lucide-react';

export function DashboardPage() {
  const { user, signOut } = useAuth();

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
            WELCOME BACK
          </h2>
          <p className="text-gray-600 text-lg">
            Manage your subscription and access premium features.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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
                
                <div className="flex items-center gap-4 p-6 border-2 border-gray-300 rounded-none opacity-50">
                  <div className="w-12 h-12 bg-gray-300 text-gray-500 flex items-center justify-center rounded-none">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-500 uppercase tracking-wide">SETTINGS</h4>
                    <p className="text-sm text-gray-400">Coming soon</p>
                  </div>
                </div>
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
                GO PREMIUM
              </h3>
              <p className="text-gray-300 text-sm mb-6">
                Unlock advanced capabilities with our premium subscription.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-none font-bold hover:bg-gray-100 transition-colors uppercase tracking-wide border-2 border-white hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
              >
                <Crown className="w-4 h-4" />
                UPGRADE NOW
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}