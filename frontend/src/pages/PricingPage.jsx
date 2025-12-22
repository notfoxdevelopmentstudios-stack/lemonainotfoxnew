import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, Zap, Crown, ArrowLeft, Loader2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { paymentAPI } from '../lib/api';
import { toast } from 'sonner';

const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    loadPlans();
    
    // Check for payment success
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const loadPlans = async () => {
    try {
      const response = await paymentAPI.getPlans();
      setPlans(response.data);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    if (attempts >= 5) {
      toast.error('Payment status check timed out');
      return;
    }

    setCheckingPayment(true);
    try {
      const response = await paymentAPI.getStatus(sessionId);
      if (response.data.payment_status === 'paid') {
        toast.success('Payment successful! Welcome to Premium!');
        // Refresh user data
        navigate('/');
      } else if (response.data.status === 'expired') {
        toast.error('Payment session expired');
      } else {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
        return;
      }
    } catch (error) {
      console.error('Payment status error:', error);
    }
    setCheckingPayment(false);
  };

  const handleSelectPlan = async (planId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.subscription_tier === 'premium') {
      toast.info('You already have a premium subscription!');
      return;
    }

    setSelectedPlan(planId);
    setLoading(true);

    try {
      const response = await paymentAPI.createCheckout({
        plan: planId,
        origin_url: window.location.origin,
      });
      
      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const planCards = [
    {
      id: 'weekly',
      name: 'Weekly',
      price: '$4.99',
      period: '/week',
      icon: Zap,
      popular: false,
      features: [
        'Unlimited AI chats',
        'Priority response times',
        'Basic code generation',
        'Email support',
      ],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$14.99',
      period: '/month',
      icon: Sparkles,
      popular: true,
      features: [
        'Everything in Weekly',
        'Advanced AI models',
        'Plugin integration',
        'Priority support',
        'Code review features',
      ],
      color: 'from-[#FFD60A] to-orange-500',
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '$99.99',
      period: '/year',
      icon: Crown,
      popular: false,
      badge: 'Save 44%',
      features: [
        'Everything in Monthly',
        '2 months FREE',
        'Early access features',
        'Custom AI training',
        'Dedicated support',
        'Team collaboration',
      ],
      color: 'from-purple-500 to-pink-500',
    },
  ];

  if (checkingPayment) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#FFD60A] animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] py-12 px-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#FFD60A]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#22C55E]/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          data-testid="back-to-dashboard"
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4">
              Upgrade to <span className="text-[#FFD60A]">Premium</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Unlock unlimited AI chats, advanced models, and premium features to supercharge your Roblox development
            </p>
          </motion.div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {planCards.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              data-testid={`plan-card-${plan.id}`}
              className={`relative rounded-2xl overflow-hidden ${
                plan.popular
                  ? 'bg-gradient-to-b from-[#FFD60A]/20 to-transparent border-2 border-[#FFD60A]/30'
                  : 'bg-zinc-900/50 border border-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-[#FFD60A] text-black text-center text-sm font-bold py-1.5">
                  MOST POPULAR
                </div>
              )}
              
              {plan.badge && (
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className={`p-6 ${plan.popular ? 'pt-12' : ''}`}>
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>

                {/* Plan name */}
                <h3 className="text-xl font-heading font-bold text-white mb-2">{plan.name}</h3>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-zinc-400">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading && selectedPlan === plan.id}
                  data-testid={`select-plan-${plan.id}`}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    plan.popular
                      ? 'bg-[#FFD60A] hover:bg-[#FFD60A]/90 text-black shadow-[0_0_20px_rgba(255,214,10,0.3)]'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Get Started'
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Free tier info */}
        <div className="mt-12 text-center">
          <p className="text-zinc-500">
            Free tier includes 10 AI chats per day with basic features.{' '}
            <button onClick={() => navigate('/')} className="text-[#FFD60A] hover:underline">
              Continue with free
            </button>
          </p>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex items-center justify-center gap-8 text-zinc-500 text-sm">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Secure payments
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Cancel anytime
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Instant access
          </span>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
