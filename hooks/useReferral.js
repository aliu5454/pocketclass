import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseConfig';
import { toast } from 'react-toastify';

export const useReferral = (classId) => {
  const [user] = useAuthState(auth);
  const [referralCode, setReferralCode] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for pending referral in localStorage
  useEffect(() => {
    const pendingReferral = localStorage.getItem('pendingReferral');
    if (pendingReferral) {
      try {
        const referral = JSON.parse(pendingReferral);
        if (referral.classId === classId) {
          setReferralCode(referral.code);
          setReferralData(referral);
        }
      } catch (error) {
        console.error('Error parsing pending referral:', error);
        localStorage.removeItem('pendingReferral');
      }
    }
  }, [classId]);

  // Apply referral discount
  const applyReferralDiscount = async (bookingData) => {
    if (!referralCode || !user) return null;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/referrals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'applyReferralDiscount',
          referralCode,
          userId: user.uid,
          bookingData,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.couponCode) {
        setDiscountAmount(result.discountAmount);
        
        // Store coupon for payment processing
        localStorage.setItem('referralCoupon', JSON.stringify({
          couponCode: result.couponCode,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
        }));

        return result;
      } else {
        throw new Error(result.error || 'Failed to apply referral discount');
      }
    } catch (error) {
      console.error('Error applying referral discount:', error);
      toast.error(error.message || 'Failed to apply referral discount');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Process referral after successful payment
  const processReferralRedemption = async (bookingId, paymentAmount) => {
    const couponData = localStorage.getItem('referralCoupon');
    if (!couponData) return false;

    try {
      const coupon = JSON.parse(couponData);
      
      const response = await fetch('/api/referrals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'processRedemption',
          couponCode: coupon.couponCode,
          bookingId,
          paymentAmount,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Clean up stored data
        localStorage.removeItem('pendingReferral');
        localStorage.removeItem('referralCoupon');
        
        toast.success('🎉 Referral bonus applied! Your friend earned credits too!');
        return true;
      } else {
        throw new Error(result.error || 'Failed to process referral redemption');
      }
    } catch (error) {
      console.error('Error processing referral redemption:', error);
      return false;
    }
  };

  // Generate referral link for a class
  const generateReferralLink = async (instructorId) => {
    if (!user || !classId || !instructorId) return null;

    try {
      const response = await fetch('/api/referrals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrerId: user.uid,
          instructorId,
          classId,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        return result.referralLink;
      } else {
        throw new Error(result.error || 'Failed to generate referral link');
      }
    } catch (error) {
      console.error('Error generating referral link:', error);
      toast.error(error.message || 'Failed to generate referral link');
      return null;
    }
  };

  // Copy referral link to clipboard
  const copyReferralLink = async (instructorId, className, instructorName) => {
    const link = await generateReferralLink(instructorId);
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        toast.success(`Referral link copied for ${className} with ${instructorName}!`);
        return link;
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        toast.error('Failed to copy referral link');
        return null;
      }
    }
    return null;
  };

  // Validate referral code
  const validateReferralCode = async (code, userId = null) => {
    if (!code || !classId) return false;

    setIsValidating(true);
    try {
      const response = await fetch('/api/referrals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validateReferral',
          referralCode: code,
          userId: userId || user?.uid,
          classId,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.valid) {
        setReferralData(result.referralData);
        return true;
      } else {
        // Check if we should redirect (own referral code case)
        if (result.shouldRedirect && result.redirectUrl) {
          // Return a special object to indicate redirect needed
          return { shouldRedirect: true, redirectUrl: result.redirectUrl, error: result.error };
        }
        
        console.warn('Invalid referral code:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Clear referral data
  const clearReferral = () => {
    setReferralCode(null);
    setReferralData(null);
    setDiscountAmount(0);
    localStorage.removeItem('pendingReferral');
    localStorage.removeItem('referralCoupon');
  };

  // Get referral statistics
  const getReferralStats = async (type = 'student') => {
    if (!user) return null;

    try {
      const response = await fetch(`/api/referrals/stats?userId=${user.uid}&type=${type}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        return result.stats;
      } else {
        throw new Error(result.error || 'Failed to fetch referral stats');
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      return null;
    }
  };

  return {
    referralCode,
    referralData,
    discountAmount,
    isValidating,
    isProcessing,
    applyReferralDiscount,
    processReferralRedemption,
    generateReferralLink,
    copyReferralLink,
    validateReferralCode,
    clearReferral,
    getReferralStats,
    hasReferral: !!referralCode,
  };
};

export default useReferral;
