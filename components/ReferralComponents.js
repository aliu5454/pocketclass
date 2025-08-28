import React from 'react';
import { GiftIcon, CheckCircleIcon, UsersIcon } from '@heroicons/react/outline';

const ReferralBanner = ({ 
  referralData, 
  discountAmount, 
  className = "bg-gradient-to-r from-green-50 to-blue-50 border border-green-200" 
}) => {
  if (!referralData) return null;

  return (
    <div className={`rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <GiftIcon className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-green-800">
            Referral Discount Applied!
          </h3>
          <p className="mt-1 text-sm text-green-700">
            You're getting{" "}
            <span className="font-semibold">
              {referralData.discountType === "fixed" 
                ? `$${referralData.discountValue}` 
                : `${referralData.discountValue}%`
              }
            </span>{" "}
            off this class thanks to a friend's referral.
            {discountAmount && (
              <span className="block mt-1 font-semibold">
                Discount: ${discountAmount.toFixed(2)}
              </span>
            )}
          </p>
        </div>
        <div className="flex-shrink-0">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        </div>
      </div>
    </div>
  );
};

const ReferralInfoCard = ({ 
  referralData, 
  className = "bg-white border border-gray-200 rounded-lg p-4" 
}) => {
  if (!referralData) return null;

  return (
    <div className={className}>
      <div className="flex items-center space-x-3 mb-3">
        <UsersIcon className="h-5 w-5 text-blue-600" />
        <h4 className="text-sm font-medium text-gray-900">
          Referral Benefits
        </h4>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Your discount:</span>
          <span className="font-semibold text-green-600">
            {referralData.discountType === "fixed" 
              ? `$${referralData.discountValue}` 
              : `${referralData.discountValue}%`
            } off
          </span>
        </div>
        <div className="flex justify-between">
          <span>Friend earns:</span>
          <span className="font-semibold text-blue-600">
            ${referralData.referrerReward} credit
          </span>
        </div>
      </div>
    </div>
  );
};

const ReferralSuccessModal = ({ 
  isOpen, 
  onClose, 
  referralData, 
  friendsEarned = 0 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Referral Success!
          </h3>
          
          <p className="text-gray-600 mb-6">
            Your friend just earned ${referralData?.referrerReward || 5} credit 
            for referring you to this class!
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">You saved:</span>
              <span className="font-semibold text-green-600">
                {referralData?.discountType === "fixed" 
                  ? `$${referralData?.discountValue}` 
                  : `${referralData?.discountValue}%`
                }
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">Friend earned:</span>
              <span className="font-semibold text-blue-600">
                ${referralData?.referrerReward} credit
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full bg-logo-red text-white px-6 py-3 rounded-lg hover:bg-logo-red/90 transition-colors"
            >
              Continue
            </button>
            
            <p className="text-xs text-gray-500">
              Want to earn credits too? Share your favorite classes with friends!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReferralLinkGenerator = ({ 
  classId, 
  instructorId, 
  className, 
  instructorName,
  onLinkGenerated 
}) => {
  const [generating, setGenerating] = React.useState(false);
  const [link, setLink] = React.useState(null);

  const generateLink = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/referrals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrerId: 'current-user-id', // This should be passed as prop
          instructorId,
          classId,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setLink(result.referralLink);
        if (onLinkGenerated) {
          onLinkGenerated(result.referralLink);
        }
      }
    } catch (error) {
      console.error('Error generating referral link:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        // You might want to show a toast notification here
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  return (
    <div className="space-y-3">
      {!link ? (
        <button
          onClick={generateLink}
          disabled={generating}
          className="flex items-center space-x-2 bg-logo-red text-white px-4 py-2 rounded-lg hover:bg-logo-red/90 transition-colors disabled:opacity-50"
        >
          <GiftIcon className="w-4 h-4" />
          <span>{generating ? 'Generating...' : 'Get Referral Link'}</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={link}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={copyLink}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Share this link with friends to earn rewards when they book!
          </p>
        </div>
      )}
    </div>
  );
};

export {
  ReferralBanner,
  ReferralInfoCard,
  ReferralSuccessModal,
  ReferralLinkGenerator,
};
