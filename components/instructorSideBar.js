import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import {
  UserGroupIcon,
  AcademicCapIcon,
  CalendarIcon,
  PlusIcon,
  BookOpenIcon,
  CreditCardIcon,
  CogIcon,
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  UserCircleIcon,
  ChatIcon,
  GiftIcon
} from '@heroicons/react/outline';
import { SupportIcon, UserIcon } from '@heroicons/react/solid';
import { icon } from '@fortawesome/fontawesome-svg-core';

const InstructorSideBar = () => {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [currentView, setCurrentView] = useState("student");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("userView");
      if (savedView && user) {
        setCurrentView(savedView);
      }
    }
  }, [user]);

  // Listen for localStorage changes to update currentView automatically
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== "undefined") {
        const savedView = localStorage.getItem("userView");
        if (savedView) {
          setCurrentView(savedView);
        }
      }
    };

    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-tab localStorage changes
    window.addEventListener('localStorageChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const getUserData = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, "Users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    if (user) {
      getUserData();
    }
  }, [user]);

  // Don't render if user is not an instructor or not in instructor view
  if (loading || !user || !userData?.isInstructor || currentView !== "instructor") {
    return null;
  }

  const menuItems = [
    {
      name: 'My Profile',
      href: `/profile/${user.uid}`,
      icon: UserCircleIcon,
      active: router.pathname.includes('/profile')
    },
    {
      name: 'My Classes',
      href: `/myClass/${user.uid}`,
      icon: AcademicCapIcon,
      active: router.pathname.includes('/myClass')
    },
    {
      name: 'Create Class',
      href: '/createClass',
      icon: PlusIcon,
      active: router.pathname === '/createClass'
    },
    {
      name: 'Automations',
      href: '/automations',
      icon: CogIcon,
      active: router.pathname === '/automations'
    },
    {
      name: 'Class Bookings',
      href: `/mybooking?id=${user.uid}`,
      icon: BookOpenIcon,
      active: router.pathname === '/mybooking'
    },
    {
      name: 'My Clients',
      href: `/myStudents/${user.uid}`,
      icon: UserGroupIcon,
      active: router.pathname.includes('/myStudents')
    },
    {
        name: 'My Messages',
        href: `/chat`,
        icon: ChatIcon,
        active: router.pathname === '/chat'
    },
    {
      name: 'Manage Schedule',
      href: '/schedule',
      icon: CalendarIcon,
      active: router.pathname === '/schedule'
    },
    {
      name: 'My Wallet',
      href: '/withdraw',
      icon: CreditCardIcon,
      active: router.pathname === '/withdraw'
    },
    {
      name: 'Referral Program',
      href: '/referrals',
      icon: GiftIcon,
      active: router.pathname === '/referrals',
      // premium: true // Mark as premium feature
    }
  ];

  // Add Analytics if user is admin
  if (userData?.isAdmin) {
    menuItems.push({
      name: 'Analytics',
      href: '/dashboard',
      icon: ChartBarIcon,
      active: router.pathname === '/analytics'
    });
  }

  // Helper function to check if user has premium access
  const isPremiumInstructor = () => {
    if (!userData) return false;
    const premiumExpire = userData.premiumExpire;
    return premiumExpire && new Date(premiumExpire.seconds * 1000) >= new Date();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 bg-white border-r border-gray-200 shadow-sm flex-shrink-0 h-[calc(100vh-var(--navbar-height,80px))] overflow-y-auto sticky top-[var(--navbar-height,80px)]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#E63F2B]/10 rounded-full flex items-center justify-center">
              <AcademicCapIcon className="w-6 h-6 text-[#E63F2B]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Instructor Panel</h2>
              <p className="text-sm text-gray-500">Manage your classes</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              
              // Skip premium features if user doesn't have premium access
              if (item.premium && !isPremiumInstructor()) {
                return null;
              }
              
              return (
                <li key={index}>
                  <Link href={item.href}>
                    <a
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                        item.active
                          ? 'bg-[#E63F2B]/10 text-[#E63F2B] border-l-4 border-[#E63F2B]'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-[#E63F2B]'
                      }`}
                    >
                      <Icon 
                        className={`w-5 h-5 transition-colors ${
                          item.active ? 'text-[#E63F2B]' : 'text-gray-500 group-hover:text-[#E63F2B]'
                        }`} 
                      />
                      <span className="font-medium">{item.name}</span>
                    </a>
                  </Link>
                </li>
              );
            }).filter(Boolean)}
          </ul>
        </nav>

        {/* Support Section */}
        <div className="p-4 border-t border-gray-100">
          <Link href="/support">
            <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#E63F2B] transition-colors">
              <SupportIcon className="w-5 h-5" />
              <span className="font-medium">Support</span>
            </a>
          </Link>
        </div>
      </div>

      
    </>
  );
};

export default InstructorSideBar;
