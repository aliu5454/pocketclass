import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import NewHeader from '../components/NewHeader';
import ClassScheduleCreator from '../components/ClassScheduleCreator';
import Head from 'next/head';
import { toast } from 'react-toastify';

const ClassScheduleManager = () => {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSchedules, setClassSchedules] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/Login');
      return;
    }

    if (user) {
      fetchClasses();
    }
  }, [user, loading, router]);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      
      // Get user's classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('classCreator', '==', user.uid)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const userClasses = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setClasses(userClasses);

      // Check which classes have schedules
      const scheduleStatuses = {};
      for (const classItem of userClasses) {
        const scheduleDoc = await getDoc(doc(db, 'Schedule', classItem.id));
        scheduleStatuses[classItem.id] = scheduleDoc.exists();
      }
      setClassSchedules(scheduleStatuses);

    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleCreated = (classId) => {
    setClassSchedules(prev => ({
      ...prev,
      [classId]: true
    }));
    setSelectedClass(null);
    toast.success('Schedule created successfully!');
  };

  const handleManageSchedule = (classId) => {
    router.push(`/schedule/${classId}`);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Manage Class Schedules - PocketClass</title>
        <meta name="description" content="Manage schedules for your classes" />
      </Head>
      
      <NewHeader />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manage Class Schedules
          </h1>
          <p className="text-gray-600">
            Set up individual schedules for each of your classes. Each class can have its own unique availability.
          </p>
        </div>

        {selectedClass ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Create Schedule for: {selectedClass.Name}
              </h2>
              <button
                onClick={() => setSelectedClass(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
            
            <ClassScheduleCreator
              classId={selectedClass.id}
              onScheduleCreated={() => handleScheduleCreated(selectedClass.id)}
            />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 mb-2 truncate">
                        {classItem.Name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {classItem.Description}
                      </p>
                      
                      <div className="flex items-center mb-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          classSchedules[classItem.id]
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {classSchedules[classItem.id] ? 'Schedule Set' : 'No Schedule'}
                        </span>
                      </div>
                    </div>
                    
                    {classItem.image && (
                      <div className="ml-4 flex-shrink-0">
                        <img
                          src={classItem.image}
                          alt={classItem.Name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {!classSchedules[classItem.id] ? (
                      <button
                        onClick={() => setSelectedClass(classItem)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Create Schedule
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleManageSchedule(classItem.id)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Manage Schedule
                        </button>
                        <button
                          onClick={() => router.push(`/classes/${classItem.id}`)}
                          className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          View Class Page
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {classes.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Classes Found
            </h3>
            <p className="text-gray-600 mb-4">
              You haven't created any classes yet. Create your first class to set up schedules.
            </p>
            <button
              onClick={() => router.push('/createClass')}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Create Your First Class
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassScheduleManager;