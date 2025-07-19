import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { 
  CheckCircleIcon, 
  UserIcon, 
  AcademicCapIcon, 
  CalendarIcon, 
  UserAddIcon,
  CreditCardIcon,
  ArrowRightIcon,
  XIcon
} from '@heroicons/react/solid';

const InstructorOnboarding = () => {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSignupMode, setIsSignupMode] = useState(false);
  
  // Onboarding completion states
  const [completionStatus, setCompletionStatus] = useState({
    signup: false,
    profile: false,
    class: false,
    schedule: false,
    stripe: false
  });

  const steps = [
    {
      id: 'signup',
      title: 'Create Account',
      description: 'Sign up for your PocketClass account',
      icon: UserAddIcon,
      path: '/Register',
      completed: completionStatus.signup
    },
    {
      id: 'profile',
      title: 'Complete Profile',
      description: 'Add your personal and professional details',
      icon: UserIcon,
      path: '/updateProfile',
      completed: completionStatus.profile
    },
    {
      id: 'class',
      title: 'Create Your First Class',
      description: 'Set up your class offerings',
      icon: AcademicCapIcon,
      path: '/createClass',
      completed: completionStatus.class
    },
    {
      id: 'schedule',
      title: 'Set Your Schedule',
      description: 'Define your availability',
      icon: CalendarIcon,
      path: '/schedule',
      completed: completionStatus.schedule
    },
    {
      id: 'stripe',
      title: 'Connect Payment',
      description: 'Link your Stripe account to receive payments',
      icon: CreditCardIcon,
      path: '/addStripe',
      completed: completionStatus.stripe
    }
  ];

  useEffect(() => {
    if (!loading && !user) {
      setIsSignupMode(true);
      setCurrentStep(0);
    } else if (user) {
      checkUserData();
    }
  }, [user, loading]);

  // Check for completion after each step update
  useEffect(() => {
    if (userData?.isInstructor && Object.values(completionStatus).every(Boolean) && !loading && user) {
      // All steps completed, redirect to profile with reload
      setTimeout(() => {
        window.location.href = `/profile/${user.uid}`;
      }, 1000); // Small delay to show completion state
    }
  }, [completionStatus, userData, loading, user]);

  // Refresh data when user returns to this page
  useEffect(() => {
    const handleFocus = () => {
      if (user && !loading) {
        checkUserData();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, loading]);

  const checkUserData = async () => {
    try {
      const docRef = doc(db, 'Users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        
        // Check completion status
        const status = {
          signup: true, // User exists
          profile: isProfileComplete(data),
          class: false, // Will be checked separately
          schedule: false, // Will be checked separately
          stripe: data.payment_enabled || false
        };
        
        // Check classes and schedule
        await checkClassesAndSchedule(status);
        
        setCompletionStatus(status);
        
        // Check if user is instructor and all steps are completed
        if (data.isInstructor && Object.values(status).every(Boolean)) {
          // All steps completed, redirect to profile with reload
          window.location.href = `/profile/${user.uid}`;
          return;
        }
        
        // Determine current step
        const firstIncompleteStep = steps.findIndex(step => !status[step.id]);
        setCurrentStep(firstIncompleteStep === -1 ? steps.length - 1 : firstIncompleteStep);
        
      } else {
        setIsSignupMode(true);
        setCurrentStep(0);
      }
    } catch (error) {
      console.error('Error checking user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const isProfileComplete = (data) => {
    return !!(
      data.firstName &&
      data.lastName &&
      data.email &&
      data.gender &&
      data.dob &&
      data.phoneNumber &&
      data.profileImage &&
      data.profileDescription
    );
  };

  const checkClassesAndSchedule = async (status) => {
    try {
      // Check if user has classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('classCreator', '==', user.uid)
      );
      const classesSnap = await getDocs(classesQuery);
      status.class = classesSnap.docs.length > 0;

      // Check if user has schedule
      const scheduleRef = doc(db, 'Schedule', user.uid);
      const scheduleSnap = await getDoc(scheduleRef);
      status.schedule = scheduleSnap.exists() && scheduleSnap.data();
      
    } catch (error) {
      console.error('Error checking classes and schedule:', error);
    }
  };

  const handleStepClick = (stepIndex, step) => {
    if (step.id === 'signup' && !user) {
      router.push('/Register?from=instructor-onboarding');
      return;
    }
    
    if (user) {
      if (step.id === 'profile') {
        router.push(`/updateProfile/${user.uid}?from=instructor-onboarding`);
      } else if (step.id === 'class') {
        router.push(`/createClass?from=instructor-onboarding`);
      } else if (step.id === 'schedule') {
        router.push(`/schedule?from=instructor-onboarding`);
      } else if (step.id === 'stripe') {
        router.push(`/addStripe?from=instructor-onboarding`);
      } else {
        router.push(step.path);
      }
    }
  };

  const handleCompleteProfile = async () => {
    if (user && userData) {
      try {
        // Set isInstructor to true after profile completion
        await updateDoc(doc(db, 'Users', user.uid), {
          isInstructor: true,
          updatedAt: serverTimestamp()
        });
        
        toast.success('Welcome to PocketClass Instructors!');
        
        // Refresh user data and check for completion
        await checkUserData();

        window.location.href = `/instructor-onboarding`;

      } catch (error) {
        console.error('Error updating instructor status:', error);
        toast.error('Failed to update instructor status');
      }
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  const renderSteps = () => {
    return steps.map((step, index) => {
      const Icon = step.icon;
      const isActive = index === currentStep;
      const isCompleted = step.completed;
      const isAccessible = index <= currentStep || isCompleted;

      return (
        <div
          key={step.id}
          className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
            isCompleted
              ? 'bg-green-50 border-green-200'
              : isActive
              ? 'bg-[#E63F2B]/5 border-[#E63F2B]'
              : 'bg-white border-gray-200'
          } ${isAccessible ? 'cursor-pointer hover:shadow-lg' : 'opacity-50 cursor-not-allowed'}`}
          onClick={() => isAccessible && handleStepClick(index, step)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-green-500'
                    : isActive
                    ? 'bg-[#E63F2B]'
                    : 'bg-gray-300'
                }`}
              >
                {isCompleted ? (
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                ) : (
                  <Icon className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isCompleted && (
                <span className="text-green-600 font-medium">Completed</span>
              )}
              {isAccessible && !isCompleted && (
                <ArrowRightIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {step.id === 'profile' && isCompleted && !userData?.isInstructor && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteProfile();
                }}
                className="bg-[#E63F2B] text-white px-4 py-2 rounded-lg hover:bg-[#D63426] transition-colors"
              >
                Activate Instructor Status
              </button>
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-var(--navbar-height,80px))] bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#E63F2B]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-var(--navbar-height,80px))] bg-gray-50">
      <Head>
        <title>Become an Instructor - PocketClass</title>
        <meta name="description" content="Join PocketClass as an instructor and start teaching" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      <div className="relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
        >
          <XIcon className="w-6 h-6 text-gray-500" />
        </button>

        {/* Mobile Layout */}
        <div className="block lg:hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#E63F2B] to-[#FF6B5A] px-6 py-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Become an Instructor
              </h1>
              <p className="text-xl text-white/90 mb-8">
                Join thousands of instructors earning with PocketClass
              </p>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">1000+</div>
                    <div className="text-white/80 text-sm">Active Students</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">$10K+</div>
                    <div className="text-white/80 text-sm">Earned by Instructors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">95%</div>
                    <div className="text-white/80 text-sm">Satisfaction Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Steps */}
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Get Started in 5 Simple Steps
              </h2>
              <p className="text-gray-600">
                Complete these steps to start teaching and earning on PocketClass
              </p>
            </div>

            <div className="space-y-4">
              {renderSteps()}
            </div>

            {/* Progress Summary */}
            <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Your Progress</h3>
                <span className="text-sm text-gray-600">
                  {Object.values(completionStatus).filter(Boolean).length} of {steps.length} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#E63F2B] h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(Object.values(completionStatus).filter(Boolean).length / steps.length) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="mt-12 text-center">
              <div className="bg-gradient-to-r from-[#E63F2B]/10 to-[#FF6B5A]/10 rounded-xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Ready to Start Teaching?
                </h3>
                <p className="text-gray-600 mb-6">
                  Complete all steps to unlock your instructor dashboard and start earning
                </p>
                {Object.values(completionStatus).every(Boolean) ? (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="bg-[#E63F2B] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#D63426] transition-colors"
                  >
                    Go to Instructor Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => handleStepClick(currentStep, steps[currentStep])}
                    className="bg-[#E63F2B] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#D63426] transition-colors"
                  >
                    Continue Setup
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop 2-Panel Layout */}
        <div className="hidden lg:flex h-[calc(100vh-var(--navbar-height,80px))]">
          {/* Left Panel - Hero Section */}
          <div className="w-1/2 bg-gradient-to-br from-[#E63F2B] to-[#FF6B5A] flex items-center justify-center p-12">
            <div className="max-w-lg text-center text-white">
              <h1 className="text-5xl font-bold mb-6">
                Become an Instructor
              </h1>
              <p className="text-xl mb-8 text-white/90">
                Join thousands of instructors earning with PocketClass
              </p>
              
              {/* Stats */}
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <div className="text-3xl font-bold">10K+</div>
                      <div className="text-white/80">Active Students</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">$2M+</div>
                      <div className="text-white/80">Earned by Instructors</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">95%</div>
                      <div className="text-white/80">Satisfaction Rate</div>
                    </div>
                  </div>
                </div>
                
                {/* Progress Summary for Desktop */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
                  <div className="text-right mb-2 text-sm text-white/80">
                    {Object.values(completionStatus).filter(Boolean).length} of {steps.length} completed
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-white h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${(Object.values(completionStatus).filter(Boolean).length / steps.length) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Steps */}
          <div className="w-1/2 bg-gray-50 overflow-y-auto">
            <div className="p-12">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Get Started in 5 Simple Steps
                </h2>
                <p className="text-gray-600">
                  Complete these steps to start teaching and earning on PocketClass
                </p>
              </div>

              <div className="space-y-4">
                {renderSteps()}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorOnboarding;
