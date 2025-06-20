import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

export default function CalendarSuccess() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saveTokens = async () => {
      if (!user || !router.query.access_token) return;

      try {
        const userRef = doc(db, "Users", user.uid);
        await updateDoc(userRef, {
          googleCalendar: {
            accessToken: router.query.access_token,
            refreshToken: router.query.refresh_token,
            expiresIn: router.query.expires_in,
            updatedAt: new Date().toISOString()
          }
        })
        // Wait for 2 seconds before redirecting
        setTimeout(() => {
          router.push('/schedule');
        }, 2000);
      } catch (error) {
        console.error('Error saving tokens:', error);
      }
    };

    saveTokens();
  }, [user, router.query]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Calendar Connected Successfully!
        </h2>
        <p className="text-gray-600 mb-4">
          Your Google Calendar has been connected. Redirecting you to schedule...
        </p>
        <div className="animate-pulse flex justify-center">
          <div className="h-2 w-24 bg-green-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}