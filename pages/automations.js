import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import PremiumPurchaseModal from '../components/PremiumPurchaseModal';

// Helper function to convert Firestore Timestamp to Date
const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  
  // Handle Firestore Timestamp objects
  if (timestamp.seconds && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  
  // Handle Date objects
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Handle ISO strings
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  // Handle timestamp objects with toDate method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  return null;
};
import {
  BellIcon,
  CalendarIcon,
  XIcon,
  CheckCircleIcon,
  HeartIcon,
  ThumbUpIcon,
  ClockIcon,
  UserGroupIcon,
  MailIcon,
  ChatAltIcon,
  StarIcon,
  GiftIcon,
  RefreshIcon,
  UserAddIcon,
  TrendingUpIcon,
  CashIcon,
  EyeIcon,
  CodeIcon,
  InformationCircleIcon
} from '@heroicons/react/outline';
import { 
  BellIcon as BellSolid,
  CalendarIcon as CalendarSolid,
  XIcon as XSolid,
  CheckCircleIcon as CheckSolid,
  HeartIcon as HeartSolid,
  ThumbUpIcon as ThumbUpSolid
} from '@heroicons/react/solid';

const AutomationsPage = () => {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('reminders');
  const [showModal, setShowModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [modalTab, setModalTab] = useState('description');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [automations, setAutomations] = useState({
    reminders: {
      upcomingClass: { enabled: true, timeDelay: '24h' },
      classReminder: { enabled: true, timeDelay: '30min' }
    },
    classUpdates: {
      newBooking: { enabled: true },
      rescheduled: { enabled: true },
      cancelled: { enabled: true }
    },
    engagement: {
      thankYouVisit: { enabled: true }
    },
    bookingBoost: {
      reminderRebook: { enabled: true },
      winBackLapsed: { enabled: false }
    },
    milestones: {
      welcomeNew: { enabled: true }
    }
  });

  const automationDefinitions = {
    reminders: {
      upcomingClass: {
        title: "Upcoming Class Reminder",
        description: "Automatically sends to students 24 hours before their upcoming class.",
        fullDescription: "This automation sends a friendly reminder email to students 24 hours before their scheduled class. The email includes class details, instructor information, and options to reschedule or cancel if needed. This helps reduce no-shows and ensures students are prepared for their upcoming session.",
        templateFile: "upcomingClassReminder.html",
        triggers: ["24 hours before class start time"],
        benefits: ["Reduces no-shows by 40%", "Gives students time to reschedule if needed", "Improves class attendance rates", "Provides important class details"]
      },
      classReminder: {
        title: "1 Hour Class Reminder",
        description: "Send students a final reminder 1 hour before their class starts.",
        fullDescription: "This automation sends a final reminder to students 1 hour before their class begins. It includes last-minute tips, class location details, and serves as a final prompt to ensure students don't miss their session. This is particularly effective for reducing last-minute cancellations.",
        templateFile: "oneHourReminder.html",
        triggers: ["1 hour before class start time"],
        benefits: ["Final chance to remind students", "Reduces last-minute no-shows", "Provides preparation tips", "Ensures students are ready"]
      }
    },
    classUpdates: {
      newBooking: {
        title: "New Class Booking",
        description: "Reach out to students when their class is booked for them.",
        fullDescription: "Automatically welcome new students with a confirmation email when they book their first or any new class. This email sets expectations, provides important details, and helps build excitement for their upcoming learning experience.",
        templateFile: "newBooking.html",
        triggers: ["Immediately after class booking is confirmed"],
        benefits: ["Confirms booking details", "Sets clear expectations", "Builds student excitement", "Provides important information"]
      },
      rescheduled: {
        title: "Rescheduled Class",
        description: "Automatically sends to students when their class start time is changed.",
        fullDescription: "When an instructor needs to reschedule a class, this automation immediately notifies affected students with the new date and time. It clearly shows both old and new times to avoid confusion and provides options for students if the new time doesn't work.",
        templateFile: "rescheduled.html",
        triggers: ["When instructor reschedules a class"],
        benefits: ["Immediate notification of changes", "Clear before/after comparison", "Reduces scheduling confusion", "Maintains good communication"]
      },
      cancelled: {
        title: "Cancelled Class",
        description: "Automatically sends to students when their class is cancelled.",
        fullDescription: "If a class needs to be cancelled, this automation immediately notifies students and provides information about refunds and rebooking options. It helps maintain trust by being transparent and offering solutions.",
        templateFile: "cancelled.html",
        triggers: ["When a class is cancelled by instructor"],
        benefits: ["Immediate cancellation notification", "Clear refund information", "Rebooking assistance", "Maintains student trust"]
      }
    },
    bookingBoost: {
      reminderRebook: {
        title: "Reminder to Rebook",
        description: "Remind your students to rebook a few weeks after their last class.",
        fullDescription: "This automation reaches out to students who haven't booked a follow-up class within a specified time period. It includes a special discount offer and highlights the benefits of continuing their learning journey to encourage rebooking.",
        templateFile: "reminderRebook.html",
        triggers: ["21 days after last completed class"],
        benefits: ["Increases student retention", "Encourages continued learning", "Includes special offers", "Builds long-term relationships"]
      },
      winBackLapsed: {
        title: "Win Back Lapsed Students",
        description: "Reach students that you haven't seen for a while and encourage them to book their next class.",
        fullDescription: "Target students who haven't booked a class in several months with a compelling win-back campaign. This email includes their class history, what they've missed, and an attractive offer to return.",
        templateFile: "winBackLapsed.html",
        triggers: ["60 days after last completed class"],
        benefits: ["Reactivates inactive students", "Compelling comeback offers", "Shows what they've missed", "Second chance engagement"]
      }
    },
    milestones: {
      welcomeNew: {
        title: "Welcome New Students",
        description: "Celebrate new students joining your classes by offering them a discount or special welcome.",
        fullDescription: "Welcome new students to your class community with a warm, informative email that sets expectations, provides helpful tips, and includes a special new student discount for their next booking.",
        templateFile: "welcomeNew.html",
        triggers: ["After completing first class"],
        benefits: ["Warm welcome experience", "Sets clear expectations", "New student discount", "Builds community feeling"]
      }
    },
    engagement: {
      thankYouVisit: {
        title: "Thank You for Attending",
        description: "Reach out to students when their class is checked out, with a link to leave a review.",
        fullDescription: "After students complete a class, this automation sends a thank you message with a request for a review and suggestions for their next learning step. It helps gather valuable feedback and encourages continued engagement.",
        templateFile: "thankYouVisit.html",
        triggers: ["Immediately after class is marked complete"],
        benefits: ["Gathers valuable reviews", "Shows appreciation", "Encourages next bookings", "Builds positive relationships"]
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/Login');
      return;
    }

    const getUserData = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, "Users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            
            // Load saved automations or use defaults
            if (data.automations) {
              setAutomations(data.automations);
            }
            console.log("User data loaded:", data); 
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    if (user) {
      getUserData();
    }
  }, [user, loading, router]);

  const saveAutomations = async (newAutomations) => {
    try {
      if (user?.uid) {
        await updateDoc(doc(db, "Users", user.uid), {
          automations: newAutomations,
          updatedAt: serverTimestamp()
        });
        toast.success('Automation settings saved!');
      }
    } catch (error) {
      console.error('Error saving automations:', error);
      toast.error('Failed to save settings');
    }
  };

  const toggleAutomation = (category, automation) => {
    // Check if user has premium access for non-reminder automations
    if (category !== 'reminders') {
      const today = new Date();
      const premiumExpire = timestampToDate(userData?.premiumExpire);
      if (!premiumExpire || premiumExpire < today) {
        toast.error('Premium subscription required for this automation feature!');
        return;
      }
    }

    const newAutomations = {
      ...automations,
      [category]: {
        ...automations[category],
        [automation]: {
          ...automations[category][automation],
          enabled: !automations[category][automation].enabled
        }
      }
    };
    setAutomations(newAutomations);
    saveAutomations(newAutomations);
  };

  const tabs = [
    { id: 'reminders', label: 'Reminders', icon: BellIcon },
    { id: 'classUpdates', label: 'Class Updates', icon: CalendarIcon },
    { id: 'bookingBoost', label: 'Booking Boost', icon: TrendingUpIcon },
    { id: 'milestones', label: 'Milestones', icon: StarIcon },
    { id: 'engagement', label: 'Engagement', icon: HeartIcon }
  ];

  const AutomationCard = ({ icon: Icon, title, description, enabled, onToggle, hasSettings = false, isPremium = false, onPreview }) => {
    const today = new Date();
    const premiumExpire = timestampToDate(userData?.premiumExpire);
    const hasValidPremium = premiumExpire && premiumExpire >= today;
    const isLocked = isPremium && !hasValidPremium;

    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow ${isLocked ? 'opacity-75' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-lg ${enabled && !isLocked ? 'bg-[#E63F2B]/10' : 'bg-gray-100'}`}>
              <Icon className={`w-6 h-6 ${enabled && !isLocked ? 'text-[#E63F2B]' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {isPremium && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-yellow-500 text-white">
                    Premium
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
              <div className="mt-4 flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  enabled && !isLocked
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {enabled && !isLocked ? 'Enabled' : isLocked ? 'Premium Required' : 'Disabled'}
                </span>
                {hasSettings && (
                  <div className="flex items-center space-x-2">
                    <MailIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={onPreview}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                >
                  <EyeIcon className="w-3 h-3 mr-1" />
                  Preview
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggle}
              disabled={isLocked}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled && !isLocked ? 'bg-[#E63F2B]' : 'bg-gray-300'
              } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled && !isLocked ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reminders':
        return (
          <div className="space-y-6">
            <AutomationCard
              icon={ClockIcon}
              title="Upcoming Class Reminder"
              description="Automatically sends to students 24 hours before their upcoming class."
              enabled={automations.reminders.upcomingClass.enabled}
              onToggle={() => toggleAutomation('reminders', 'upcomingClass')}
              onPreview={() => openAutomationModal('reminders', 'upcomingClass')}
              hasSettings={true}
            />
            <AutomationCard
              icon={BellIcon}
              title="1 Hour Class Reminder"
              description="Send students a final reminder 1 hour before their class starts."
              enabled={automations.reminders.classReminder.enabled}
              onToggle={() => toggleAutomation('reminders', 'classReminder')}
              onPreview={() => openAutomationModal('reminders', 'classReminder')}
              hasSettings={true}
            />
          </div>
        );

      case 'classUpdates':
        return (
          <div className="space-y-6">
            <AutomationCard
              icon={CalendarIcon}
              title="New Class Booking"
              description="Reach out to students when their class is booked for them."
              enabled={automations.classUpdates.newBooking.enabled}
              onToggle={() => toggleAutomation('classUpdates', 'newBooking')}
              onPreview={() => openAutomationModal('classUpdates', 'newBooking')}
              hasSettings={true}
              isPremium={true}
            />
            <AutomationCard
              icon={RefreshIcon}
              title="Rescheduled Class"
              description="Automatically sends to students when their class start time is changed."
              enabled={automations.classUpdates.rescheduled.enabled}
              onToggle={() => toggleAutomation('classUpdates', 'rescheduled')}
              onPreview={() => openAutomationModal('classUpdates', 'rescheduled')}
              hasSettings={true}
              isPremium={true}
            />
            <AutomationCard
              icon={XIcon}
              title="Cancelled Class"
              description="Automatically sends to students when their class is cancelled."
              enabled={automations.classUpdates.cancelled.enabled}
              onToggle={() => toggleAutomation('classUpdates', 'cancelled')}
              onPreview={() => openAutomationModal('classUpdates', 'cancelled')}
              hasSettings={true}
              isPremium={true}
            />
          </div>
        );

      case 'bookingBoost':
        return (
          <div className="space-y-6">
            <AutomationCard
              icon={RefreshIcon}
              title="Reminder to Rebook"
              description="Remind your students to rebook a few weeks after their last class."
              enabled={automations.bookingBoost.reminderRebook.enabled}
              onToggle={() => toggleAutomation('bookingBoost', 'reminderRebook')}
              onPreview={() => openAutomationModal('bookingBoost', 'reminderRebook')}
              hasSettings={true}
              isPremium={true}
            />
            <AutomationCard
              icon={TrendingUpIcon}
              title="Win Back Lapsed Students"
              description="Reach students that you haven't seen for a while and encourage them to book their next class."
              enabled={automations.bookingBoost.winBackLapsed.enabled}
              onToggle={() => toggleAutomation('bookingBoost', 'winBackLapsed')}
              onPreview={() => openAutomationModal('bookingBoost', 'winBackLapsed')}
              hasSettings={true}
              isPremium={true}
            />
          </div>
        );

      case 'milestones':
        return (
          <div className="space-y-6">
            <AutomationCard
              icon={UserAddIcon}
              title="Welcome New Students"
              description="Celebrate new students joining your classes by offering them a discount or special welcome."
              enabled={automations.milestones.welcomeNew.enabled}
              onToggle={() => toggleAutomation('milestones', 'welcomeNew')}
              onPreview={() => openAutomationModal('milestones', 'welcomeNew')}
              hasSettings={true}
              isPremium={true}
            />
          </div>
        );

      case 'engagement':
        return (
          <div className="space-y-6">
            <AutomationCard
              icon={ThumbUpIcon}
              title="Thank You for Attending"
              description="Reach out to students when their class is checked out, with a link to leave a review."
              enabled={automations.engagement.thankYouVisit.enabled}
              onToggle={() => toggleAutomation('engagement', 'thankYouVisit')}
              onPreview={() => openAutomationModal('engagement', 'thankYouVisit')}
              hasSettings={true}
              isPremium={true}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getAutomationData = (category, automationKey) => {
    return automationDefinitions[category]?.[automationKey] || null;
  };

  const openAutomationModal = (category, automationKey) => {
    const automationData = getAutomationData(category, automationKey);
    if (automationData) {
      setSelectedAutomation({
        category,
        key: automationKey,
        ...automationData
      });
      setModalTab('description');
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAutomation(null);
    setModalTab('description');
  };

  const handlePremiumPurchaseSuccess = () => {
    // Refresh user data to get updated premium status
    const refreshUserData = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, "Users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
            toast.success('Premium features are now available!');
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      }
    };
    refreshUserData();
  };

  const handleRenewPremium = () => {
    // Calculate the new expiry date
    const today = new Date();
    const currentPremiumExpire = timestampToDate(userData?.premiumExpire);
    
    let newExpiryDate;
    if (!currentPremiumExpire || currentPremiumExpire < today) {
      // If expired or no expiry date, add 30 days from today
      newExpiryDate = new Date(today);
      newExpiryDate.setDate(today.getDate() + 30);
    } else {
      // If still active, add 30 days from current expiry
      newExpiryDate = new Date(currentPremiumExpire);
      newExpiryDate.setDate(currentPremiumExpire.getDate() + 30);
    }
    
    // Open premium modal for renewal
    setShowPremiumModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-var(--navbar-height,80px))] bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#E63F2B]"></div>
      </div>
    );
  }

  if (!userData?.isInstructor) {
    return (
      <div className="min-h-[calc(100vh-var(--navbar-height,80px))] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">This page is only available to instructors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-var(--navbar-height,80px))] bg-gray-50">
      <Head>
        <title>Automations - PocketClass</title>
        <meta name="description" content="Manage your automated messages and notifications" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Automations</h1>
          <p className="text-gray-600">Set up automated messages to engage with your students and streamline your class management.</p>
        </div>

        {/* Premium Status Banner */}
        {(() => {
          const today = new Date();
          const premiumExpire = timestampToDate(userData?.premiumExpire);
          const hasValidPremium = premiumExpire && premiumExpire >= today;
          
          if (!hasValidPremium) {
            // No active subscription - show "Buy Premium" CTA
            return (
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-4 border-l-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <StarIcon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-white">
                      <h3 className="text-lg font-semibold mb-1">Unlock Premium Automations</h3>
                      <p className="text-white/90 text-sm">
                        Get access to advanced automation features like class updates, booking boost, milestones, and engagement tools.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => setShowPremiumModal(true)}
                      className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Buy Premium
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            // Active subscription - show expiry date and renew button
            const daysUntilExpiry = Math.ceil((premiumExpire - today) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = daysUntilExpiry <= 7;
            
            return (
              <div className={`rounded-xl p-6 mb-4 border-l-4 ${
                isExpiringSoon 
                  ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-400' 
                  : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${
                      isExpiringSoon ? 'bg-orange-100' : 'bg-green-100'
                    }`}>
                      <CheckCircleIcon className={`w-8 h-8 ${
                        isExpiringSoon ? 'text-orange-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold mb-1 ${
                        isExpiringSoon ? 'text-orange-900' : 'text-green-900'
                      }`}>
                        {isExpiringSoon ? 'Premium Expiring Soon' : 'Premium Active'}
                      </h3>
                      <p className={`text-sm ${
                        isExpiringSoon ? 'text-orange-700' : 'text-green-700'
                      }`}>
                        {isExpiringSoon 
                          ? `Your premium subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} (${premiumExpire.toLocaleDateString()})`
                          : `Premium subscription active until ${premiumExpire.toLocaleDateString()}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleRenewPremium}
                      className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                        isExpiringSoon
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      Renew Premium
                    </button>
                  </div>
                </div>
              </div>
            );
          }
        })()}

        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#E63F2B] to-[#FF6B5A] rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-lg font-semibold mb-2">Boost Your Student Engagement</h2>
              <p className="text-white/90">Automatically send personalized messages to keep your students engaged and coming back for more classes.</p>
            </div>
            <div className="hidden md:block">
              <ChatAltIcon className="w-16 h-16 text-white/30" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 overflow-y-hidden overflow-x-auto">
            <nav className="flex space-x-8 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-[#E63F2B] text-[#E63F2B]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {renderTabContent()}
        </div>
 
      </div>

      {/* Automation Preview Modal */}
      {showModal && selectedAutomation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#E63F2B]/10 rounded-lg">
                  <MailIcon className="w-6 h-6 text-[#E63F2B]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedAutomation.title}</h3>
                  <p className="text-sm text-gray-500">Email Automation Preview</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setModalTab('description')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                    modalTab === 'description'
                      ? 'border-[#E63F2B] text-[#E63F2B]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <InformationCircleIcon className="w-4 h-4" />
                  <span>Description</span>
                </button>
                <button
                  onClick={() => setModalTab('email')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                    modalTab === 'email'
                      ? 'border-[#E63F2B] text-[#E63F2B]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CodeIcon className="w-4 h-4" />
                  <span>Email Preview</span>
                </button>
              </nav>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {modalTab === 'description' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">How it Works</h4>
                    <p className="text-gray-700 leading-relaxed">{selectedAutomation.fullDescription}</p>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">When it Triggers</h4>
                    <ul className="space-y-2">
                      {selectedAutomation.triggers.map((trigger, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-[#E63F2B] rounded-full"></div>
                          <span className="text-gray-700">{trigger}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Key Benefits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedAutomation.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-green-50 p-3 rounded-lg">
                          <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-green-800 text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'email' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Email Preview</h4>
                    <p className="text-sm text-gray-600">This is how the email will appear to your students:</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      src={`/api/email-template?template=${selectedAutomation.templateFile}`}
                      className="w-full h-96 border-none"
                      title="Email Preview"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Template variables (like {`{{studentFirstName}}`}) will be automatically replaced with actual student data when the email is sent.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Template: {selectedAutomation.templateFile}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Purchase Modal */}
      <PremiumPurchaseModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        user={user}
        userData={userData}
        onPurchaseSuccess={handlePremiumPurchaseSuccess}
      />
    </div>
  );
};

export default AutomationsPage;
