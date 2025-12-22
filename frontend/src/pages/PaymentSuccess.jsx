import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { paymentAPI } from '../lib/api';
import { toast } from 'sonner';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = React.useState('loading');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    if (attempts >= 5) {
      setStatus('error');
      toast.error('Payment verification timed out');
      return;
    }

    try {
      const response = await paymentAPI.getStatus(sessionId);
      if (response.data.payment_status === 'paid') {
        setStatus('success');
        toast.success('Payment successful! Welcome to Premium!');
      } else if (response.data.status === 'expired') {
        setStatus('error');
      } else {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
      }
    } catch (error) {
      console.error('Payment status error:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-[#FFD60A] animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying Payment</h1>
            <p className="text-zinc-400">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-zinc-400 mb-8">Welcome to NotFox Premium</p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 rounded-xl bg-[#FFD60A] hover:bg-[#FFD60A]/90 text-black font-bold transition-all"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Issue</h1>
            <p className="text-zinc-400 mb-8">There was a problem verifying your payment</p>
            <button
              onClick={() => navigate('/pricing')}
              className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
            >
              Try Again
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
