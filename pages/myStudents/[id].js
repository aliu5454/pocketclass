import NewHeader from "../../components/NewHeader";
import { useRouter } from "next/router";
import { useEffect, useState, useRef, useMemo } from "react";
import { collection, doc as firestoreDoc, getDocs, where, addDoc, query, getDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { toast } from "react-toastify";
import Head from "next/head";
import { 
    UserCircleIcon, 
    SearchIcon, 
    FilterIcon, 
    ChevronDownIcon,
    UploadIcon,
    XIcon,
    DocumentIcon
} from "@heroicons/react/solid";
import { useAuthState } from "react-firebase-hooks/auth";

// Constants and utility functions
const SORT_OPTIONS = {
    NEWEST: "newest",
    OLDEST: "oldest", 
    SALES_HIGH: "sales-high",
    SALES_LOW: "sales-low"
};

const formatDate = (dateInput) => {
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (error) {
        return 'Invalid Date';
    }
};

const parsePrice = (price) => {
    if (typeof price === 'number' && Number.isFinite(price)) {
        return price;
    }
    if (typeof price === 'string') {
        const parsed = parseFloat(price.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const getClientEmail = (client) => {
    return client.groupEmails?.[0] || client.studentDetails?.email || client.email || null;
};

const getClientName = (client) => {
    if (client.student_name) return client.student_name;
    const firstName = client.studentDetails?.firstName || client.firstName || '';
    const lastName = client.studentDetails?.lastName || client.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
};

function MyStudents() {
    // State management
    const [bookingClients, setBookingClients] = useState([]);
    const [externalClients, setExternalClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState(SORT_OPTIONS.NEWEST);
    const [showOptions, setShowOptions] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [filters, setFilters] = useState({
        source: 'all', // 'all', 'booking', 'external', 'manual', 'import'
        salesRange: 'all', // 'all', 'none', 'low', 'medium', 'high'
        hasBookings: 'all', // 'all', 'yes', 'no'
        dateRange: 'all' // 'all', 'last30', 'last90', 'last365'
    });
    const [newClient, setNewClient] = useState({
        firstName: "",
        lastName: "",
        email: "",
        totalSales: ""
    });
    
    const router = useRouter();
    const { id } = router.query;
    const [user, loadingUser] = useAuthState(auth);
    const fileInputRef = useRef(null);

    // Authentication and authorization
    useEffect(() => {
        if (loadingUser) return;
        
        if (!user) {
            toast.error("Please login to see this section");
            setTimeout(() => router.push('/Login'), 1000);
            return;
        }
        
        if (user.uid.trim() !== String(id).trim()) {
            toast.warning("The information you are trying to access does not belong to you!");
            setTimeout(() => router.push('/'), 1000);
            return;
        }
        
        if (id) {
            fetchClientsData(id);
        }
    }, [id, user, loadingUser, router]);

    // Data fetching functions
    const fetchClientsData = async (instructorId) => {
        setLoading(true);
        try {
            await Promise.all([
                fetchBookingClients(instructorId),
                fetchExternalClients(instructorId)
            ]);
        } catch (error) {
            console.error("Error fetching clients data:", error);
            toast.error("Failed to load clients data");
        } finally {
            setLoading(false);
        }
    };

    const fetchBookingClients = async (instructorId) => {
        try {
            const q = query(collection(db, "Bookings"), where("instructor_id", "==", instructorId));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                setBookingClients([]);
                return;
            }

            const bookingsData = [];
            const studentPromises = [];
            const classPromises = [];

            // Collect all bookings and prepare promises for batch processing
            querySnapshot.docs.forEach(docSnapshot => {
                const booking = { id: docSnapshot.id, ...docSnapshot.data() };
                bookingsData.push(booking);

                if (booking.student_id) {
                    const studentRef = firestoreDoc(db, "Users", booking.student_id);
                    studentPromises.push(
                        getDoc(studentRef).then(studentSnap => ({
                            bookingId: booking.id,
                            studentDetails: studentSnap.exists() ? studentSnap.data() : {}
                        }))
                    );
                }

                if (booking.class_id) {
                    const classRef = firestoreDoc(db, "classes", booking.class_id);
                    classPromises.push(
                        getDoc(classRef).then(classSnap => ({
                            bookingId: booking.id,
                            classDetails: classSnap.exists() ? classSnap.data() : {}
                        }))
                    );
                }
            });

            // Wait for all promises to resolve
            const [studentResults, classResults] = await Promise.all([
                Promise.all(studentPromises),
                Promise.all(classPromises)
            ]);

            // Create lookup maps for efficient data merging
            const studentMap = new Map(studentResults.map(r => [r.bookingId, r.studentDetails]));
            const classMap = new Map(classResults.map(r => [r.bookingId, r.classDetails]));

            // Merge all data
            const enrichedBookings = bookingsData.map(booking => ({
                ...booking,
                studentDetails: studentMap.get(booking.id) || {},
                classDetails: classMap.get(booking.id) || {}
            }));

            // Group by client and calculate totals
            const clientsMap = new Map();
            
            enrichedBookings.forEach(booking => {
                const email = getClientEmail(booking);
                const price = parsePrice(booking.price);
                
                if (email) {
                    const emailKey = email.toLowerCase().trim();
                    
                    if (clientsMap.has(emailKey)) {
                        const existing = clientsMap.get(emailKey);
                        existing.totalSales += price;
                        existing.bookingCount += 1;
                        existing.allBookings.push({
                            id: booking.id,
                            price: price,
                            startTime: booking.startTime,
                            classDetails: booking.classDetails
                        });
                        
                        // Keep the most recent booking for display
                        if (new Date(booking.startTime) > new Date(existing.startTime)) {
                            existing.startTime = booking.startTime;
                            existing.classDetails = booking.classDetails;
                        }
                    } else {
                        clientsMap.set(emailKey, {
                            ...booking,
                            totalSales: price,
                            bookingCount: 1,
                            normalizedEmail: emailKey,
                            allBookings: [{
                                id: booking.id,
                                price: price,
                                startTime: booking.startTime,
                                classDetails: booking.classDetails
                            }]
                        });
                    }
                } else {
                    // Handle clients without email using unique identifier
                    const uniqueKey = `no-email-${booking.id}-${Date.now()}`;
                    clientsMap.set(uniqueKey, {
                        ...booking,
                        totalSales: price,
                        bookingCount: 1,
                        normalizedEmail: null,
                        allBookings: [{
                            id: booking.id,
                            price: price,
                            startTime: booking.startTime,
                            classDetails: booking.classDetails
                        }]
                    });
                }
            });

            const sortedClients = Array.from(clientsMap.values())
                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
            
            setBookingClients(sortedClients);
        } catch (error) {
            console.error("Error fetching booking clients:", error);
            throw error;
        }
    };

    const fetchExternalClients = async (instructorId) => {
        try {
            const q = query(collection(db, "external-clients"), where("instructor_id", "==", instructorId));
            const querySnapshot = await getDocs(q);
            const clients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExternalClients(clients);
        } catch (error) {
            console.error("Error fetching external clients:", error);
            throw error;
        }
    };

    // Client management functions
    const addExternalClient = async () => {
        if (!newClient.firstName || !newClient.email) {
            toast.error("First name and email are required");
            return;
        }

        try {
            const totalSalesValue = parseFloat(newClient.totalSales) || 0;
            
            await addDoc(collection(db, "external-clients"), {
                firstName: newClient.firstName,
                lastName: newClient.lastName,
                email: newClient.email,
                totalSales: totalSalesValue,
                instructor_id: id,
                createdAt: Timestamp.now(),
                source: "manual"
            });
            
            toast.success("Client added successfully");
            setShowAddModal(false);
            setNewClient({ firstName: "", lastName: "", email: "", totalSales: "" });
            await fetchExternalClients(id);
        } catch (error) {
            console.error("Error adding client:", error);
            toast.error("Failed to add client");
        }
    };

    const handleFileImport = async () => {
        if (!importFile) {
            toast.error("Please select a file to import");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                let clients = [];
                
                if (importFile.name.endsWith('.csv')) {
                    const lines = text.split('\n').filter(line => line.trim());
                    if (lines.length === 0) {
                        toast.error("CSV file is empty");
                        return;
                    }
                    
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        const client = {};
                        
                        headers.forEach((header, index) => {
                            if (header.includes('first') || header.includes('fname')) {
                                client.firstName = values[index] || '';
                            } else if (header.includes('last') || header.includes('lname')) {
                                client.lastName = values[index] || '';
                            } else if (header.includes('email')) {
                                client.email = values[index] || '';
                            } else if (header.includes('phone')) {
                                client.phone = values[index] || '';
                            } else if (header.includes('total sales') || header.includes('sales')) {
                                // Parse sales amount, removing currency symbols and converting to number
                                const salesValue = values[index] || '0';
                                const cleanedSales = salesValue.replace(/[^0-9.-]/g, '');
                                console.log("Cleaned sales value:", cleanedSales);
                                client.totalSales = parseFloat(cleanedSales) || 0;
                            }
                        });
                        
                        if (client.email && client.firstName) {
                            clients.push(client);
                        }
                    }
                } else {
                    toast.error("Please upload a CSV file");
                    return;
                }
                
                if (clients.length === 0) {
                    toast.error("No valid clients found in CSV file");
                    return;
                }
                
                // Add clients to Firestore
                const batch = clients.map(client => 
                    addDoc(collection(db, "external-clients"), {
                        firstName: client.firstName,
                        lastName: client.lastName,
                        email: client.email,
                        phone: client.phone || '',
                        totalSales: client.totalSales || 0,
                        instructor_id: id,
                        createdAt: Timestamp.now(),
                        source: "import"
                    })
                );
                
                await Promise.all(batch);
                toast.success(`${clients.length} clients imported successfully`);
                setShowImportModal(false);
                setImportFile(null);
                await fetchExternalClients(id);
                
            } catch (error) {
                console.error("Error importing clients:", error);
                toast.error("Failed to import clients");
            }
        };
        
        reader.readAsText(importFile);
    };

    // Unified client list with memoization for performance
    const unifiedClientList = useMemo(() => {
        const allClientsMap = new Map();
        
        // Add booking clients first (they have priority)
        bookingClients.forEach(client => {
            const email = getClientEmail(client);
            if (email) {
                const emailKey = email.toLowerCase().trim();
                allClientsMap.set(emailKey, {
                    ...client,
                    source: 'booking',
                    normalizedEmail: emailKey
                });
            } else {
                const uniqueKey = `booking-${client.id}`;
                allClientsMap.set(uniqueKey, {
                    ...client,
                    source: 'booking',
                    normalizedEmail: null
                });
            }
        });
        
        // Add external clients and merge sales with existing booking clients
        externalClients.forEach(client => {
            const email = client.email;
            if (email) {
                const emailKey = email.toLowerCase().trim();
                if (allClientsMap.has(emailKey)) {
                    // Merge external client sales with existing booking client
                    const existingClient = allClientsMap.get(emailKey);
                    existingClient.totalSales = (existingClient.totalSales || 0) + (client.totalSales || 0);
                    existingClient.hasExternalSales = true;
                } else {
                    // Add as new external client
                    allClientsMap.set(emailKey, {
                        id: client.id,
                        student_name: getClientName(client),
                        studentDetails: { email: client.email },
                        groupEmails: [client.email],
                        totalSales: client.totalSales || 0,
                        bookingCount: 0,
                        startTime: client.createdAt?.toDate?.() || new Date(),
                        isExternal: true,
                        source: 'external',
                        normalizedEmail: emailKey
                    });
                }
            } else {
                // Handle external clients without email
                const uniqueKey = `external-${client.id}`;
                allClientsMap.set(uniqueKey, {
                    id: client.id,
                    student_name: getClientName(client),
                    studentDetails: { email: '' },
                    groupEmails: [],
                    totalSales: client.totalSales || 0,
                    bookingCount: 0,
                    startTime: client.createdAt?.toDate?.() || new Date(),
                    isExternal: true,
                    source: 'external',
                    normalizedEmail: null
                });
            }
        });
        
        return Array.from(allClientsMap.values());
    }, [bookingClients, externalClients]);

    // Filtered and sorted data with memoization
    const filteredData = useMemo(() => {
        return unifiedClientList.filter(client => {
            const name = getClientName(client);
            const email = getClientEmail(client) || '';
            const search = searchTerm.toLowerCase();
            
            // Text search filter
            const matchesSearch = name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
            if (!matchesSearch) return false;
            
            // Source filter
            if (filters.source !== 'all') {
                if (filters.source === 'booking' && client.source !== 'booking') return false;
                if (filters.source === 'external' && client.source !== 'external') return false;
                if (filters.source === 'manual' && client.source !== 'external') return false;
                if (filters.source === 'import' && !client.source?.includes('external')) return false;
            }
            
            // Sales range filter
            const totalSales = client.totalSales || 0;
            if (filters.salesRange !== 'all') {
                if (filters.salesRange === 'none' && totalSales > 0) return false;
                if (filters.salesRange === 'low' && (totalSales === 0 || totalSales > 100)) return false;
                if (filters.salesRange === 'medium' && (totalSales <= 100 || totalSales > 500)) return false;
                if (filters.salesRange === 'high' && totalSales <= 500) return false;
            }
            
            // Bookings filter
            if (filters.hasBookings !== 'all') {
                const hasBookings = (client.bookingCount || 0) > 0;
                if (filters.hasBookings === 'yes' && !hasBookings) return false;
                if (filters.hasBookings === 'no' && hasBookings) return false;
            }
            
            // Date range filter
            if (filters.dateRange !== 'all') {
                const clientDate = new Date(client.startTime);
                const now = new Date();
                const daysDiff = Math.floor((now - clientDate) / (1000 * 60 * 60 * 24));
                
                if (filters.dateRange === 'last30' && daysDiff > 30) return false;
                if (filters.dateRange === 'last90' && daysDiff > 90) return false;
                if (filters.dateRange === 'last365' && daysDiff > 365) return false;
            }
            
            return true;
        }).sort((a, b) => {
            switch (sortBy) {
                case SORT_OPTIONS.NEWEST:
                    return new Date(b.startTime) - new Date(a.startTime);
                case SORT_OPTIONS.OLDEST:
                    return new Date(a.startTime) - new Date(b.startTime);
                case SORT_OPTIONS.SALES_HIGH:
                    return (b.totalSales || 0) - (a.totalSales || 0);
                case SORT_OPTIONS.SALES_LOW:
                    return (a.totalSales || 0) - (b.totalSales || 0);
                default:
                    return 0;
            }
        });
    }, [unifiedClientList, searchTerm, sortBy, filters]);

    // Statistics with memoization
    const statistics = useMemo(() => {
        const totalClients = unifiedClientList.length;
        const totalRevenue = unifiedClientList.reduce((sum, client) => sum + (client.totalSales || 0), 0);
        const avgRevenuePerClient = totalClients > 0 ? totalRevenue / totalClients : 0;
        
        return { totalClients, totalRevenue, avgRevenuePerClient };
    }, [unifiedClientList]);

    // Export functionality
    const exportToCSV = () => {
        // Helper function to escape CSV values properly
        const escapeCsvValue = (value) => {
            const stringValue = String(value || '');
            // If the value contains comma, newline, or quote, wrap it in quotes and escape internal quotes
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const csvData = filteredData.map(client => {
            const fullName = getClientName(client);
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            return {
                firstName: firstName,
                lastName: lastName,
                email: getClientEmail(client) || '',
                phone: '', // Empty since we don't store phone numbers for most clients
                sales: client.totalSales || 0,
                bookings: client.bookingCount || 0,
                source: client.source || 'unknown'
            };
        });
        
        const csvContent = [
            'First Name,Last Name,Email,Phone,Total Sales (CA$),Total Bookings,Source',
            ...csvData.map(c => 
                `${escapeCsvValue(c.firstName)},${escapeCsvValue(c.lastName)},${escapeCsvValue(c.email)},${escapeCsvValue(c.phone)},${escapeCsvValue(c.sales)},${escapeCsvValue(c.bookings)},${escapeCsvValue(c.source)}`
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pocketclass-clients.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Head>
                <title>PocketClass - Clients</title>
                <meta name="description" content="Manage your clients and students" />
                <link rel="icon" href="/pc_favicon.ico" />
            </Head>
            <NewHeader />
            
            <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                                Clients 
                                <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
                                    {statistics.totalClients}
                                </span>
                            </h1>
                            <p className="text-gray-600 mt-1 text-sm sm:text-base">
                                View, add, edit and manage your client's details. 
                                <span className="text-[#E63F2B] cursor-pointer hover:underline ml-1">
                                    Learn more
                                </span>
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setShowOptions(!showOptions)}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                                >
                                    Options
                                    <ChevronDownIcon className="w-4 h-4" />
                                </button>
                                
                                {showOptions && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                        <button
                                            onClick={() => {
                                                setShowImportModal(true);
                                                setShowOptions(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
                                        >
                                            <UploadIcon className="w-4 h-4" />
                                            Import clients
                                        </button>
                                        
                                        <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Export
                                        </div>
                                        <button
                                            onClick={() => {
                                                exportToCSV();
                                                setShowOptions(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                                        >
                                            <DocumentIcon className="w-4 h-4" />
                                            CSV
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="w-full sm:w-auto bg-[#E63F2B] text-white px-6 py-2 rounded-lg hover:bg-[#D63426] transition-colors font-medium text-sm sm:text-base"
                            >
                                Add Client
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Clients</p>
                                    <p className="text-2xl font-bold text-gray-900">{statistics.totalClients}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <UserCircleIcon className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                    <p className="text-2xl font-bold text-[#E63F2B]">CA$ {statistics.totalRevenue.toFixed(2)}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Avg. Revenue per Client</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        CA$ {statistics.avgRevenuePerClient.toFixed(2)}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Import Banner */}
                    <div className="bg-gradient-to-r from-[#E63F2B]/5 to-[#FF6B5A]/5 border border-[#E63F2B]/20 rounded-xl p-4 md:p-6 mb-6">
                        <div className="flex flex-col md:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#E63F2B] to-[#FF6B5A] rounded-full flex items-center justify-center flex-shrink-0">
                                    <UploadIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Import clients</h3>
                                    <p className="text-xs sm:text-sm text-gray-600">
                                        Import your client list in minutes to streamline your client management and track sales performance
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="w-full sm:w-auto bg-white border border-[#E63F2B] text-[#E63F2B] px-4 py-2 rounded-lg hover:bg-[#E63F2B] hover:text-white transition-colors font-medium text-sm whitespace-nowrap"
                            >
                                Start now
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                    <div className="p-4 md:p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div className="flex-1 relative order-1">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63F2B] focus:border-transparent text-sm"
                            />
                        </div>
                        
                        <div className="flex gap-3 order-2">
                            <button 
                                onClick={() => setShowFiltersModal(true)}
                                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium min-w-0"
                            >
                                <FilterIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="hidden sm:inline">Filters</span>
                                {Object.values(filters).some(filter => filter !== 'all') && (
                                    <span className="bg-[#E63F2B] text-white text-xs px-2 py-1 rounded-full">
                                        {Object.values(filters).filter(filter => filter !== 'all').length}
                                    </span>
                                )}
                            </button>
                            
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63F2B] focus:border-transparent text-sm font-medium min-w-[140px] sm:min-w-[200px]"
                            >
                                <option value={SORT_OPTIONS.NEWEST}>Newest</option>
                                <option value={SORT_OPTIONS.OLDEST}>Oldest</option>
                                <option value={SORT_OPTIONS.SALES_HIGH}>Sales ↓</option>
                                <option value={SORT_OPTIONS.SALES_LOW}>Sales ↑</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    {loading ? (
                        <div className="p-8">
                            <div className="animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-16 bg-gray-100 rounded"></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table Header - Hidden on mobile */}
                            <div className="hidden lg:block border-b border-gray-200 px-4 sm:px-6 py-4">
                                <div className="grid grid-cols-8 gap-4 text-sm font-semibold text-gray-700">
                                    <div className="col-span-4">Client Name</div>
                                    <div className="col-span-2">Total Sales</div>
                                    <div className="col-span-2">Joined Date</div>
                                </div>
                            </div>

                            {/* Table Body - Responsive */}
                            <div className="divide-y divide-gray-100">
                                {filteredData.length === 0 ? (
                                    <div className="p-6 sm:p-8 lg:p-12 text-center text-gray-500">
                                        <UserCircleIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                                        <p className="text-gray-500 text-sm sm:text-base">Try adjusting your search or add your first client.</p>
                                    </div>
                                ) : (
                                    filteredData.map((client, index) => (
                                        <div key={client.id || index} className="p-3 sm:p-4 lg:px-6 lg:py-4 hover:bg-gray-50/50 transition-colors">
                                            {/* Desktop Layout */}
                                            <div className="hidden lg:grid grid-cols-8 gap-4 items-center">
                                                <div className="col-span-4 flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-[#E63F2B] to-[#FF6B5A] rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0">
                                                        {getClientName(client)[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-gray-900 truncate">
                                                            {getClientName(client)}
                                                        </div>
                                                        <div className="text-sm text-gray-500 truncate">
                                                            {getClientEmail(client) || 'No email provided'}
                                                        </div>
                                                        {client.bookingCount > 0 && (
                                                            <div className="text-xs text-[#E63F2B] font-medium">
                                                                {client.bookingCount} booking{client.bookingCount !== 1 ? 's' : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="col-span-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-semibold text-gray-900">
                                                            CA$ {(client.totalSales || 0).toFixed(2)}
                                                        </span>
                                                        {client.totalSales > 0 && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                Paying
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="col-span-2">
                                                    <div className="text-sm text-gray-900">
                                                        {formatDate(client.startTime)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mobile & Tablet Layout */}
                                            <div className="lg:hidden">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-[#E63F2B] to-[#FF6B5A] rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0">
                                                        {getClientName(client)[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium text-gray-900 text-sm sm:text-base leading-tight">
                                                                    {getClientName(client)}
                                                                </div>
                                                                <div className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
                                                                    {getClientEmail(client) || 'No email provided'}
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <div className="font-semibold text-gray-900 text-sm sm:text-base">
                                                                    CA$ {(client.totalSales || 0).toFixed(2)}
                                                                </div>
                                                                {client.totalSales > 0 && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 mt-1">
                                                                        Paying
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                                                            <div className="flex items-center gap-2">
                                                                {client.bookingCount > 0 && (
                                                                    <span className="text-xs text-[#E63F2B] font-medium bg-red-50 px-2 py-1 rounded-full">
                                                                        {client.bookingCount} booking{client.bookingCount !== 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-gray-400">
                                                                    {client.source === 'booking' ? '📅 Platform' : '📝 External'}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 font-medium">
                                                                {formatDate(client.startTime)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Table Footer */}
                            <div className="border-t border-gray-200 px-4 sm:px-6 py-4 bg-gray-50/50">
                                <div className="flex flex-col md:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="text-sm text-gray-600">
                                        Showing {filteredData.length} of {statistics.totalClients} clients
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">
                                        Total Revenue: <span className="text-[#E63F2B]">CA$ {statistics.totalRevenue.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Add Client Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Client</h2>
                            <p className="text-sm text-gray-600 mt-1">Add a client to track their bookings and sales</p>
                        </div>
                        
                        <div className="p-4 sm:p-6">
                            {/* Profile Image */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#E63F2B] to-[#FF6B5A] rounded-full flex items-center justify-center">
                                    <UserCircleIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 text-sm sm:text-base">Client Profile</h3>
                                    <p className="text-xs sm:text-sm text-gray-500">Basic information for your client</p>
                                </div>
                            </div>
                            
                            {/* Form Fields */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            First Name *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. John"
                                            value={newClient.firstName}
                                            onChange={(e) => setNewClient({...newClient, firstName: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63F2B] focus:border-transparent text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Doe"
                                            value={newClient.lastName}
                                            onChange={(e) => setNewClient({...newClient, lastName: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63F2B] focus:border-transparent text-sm"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="john.doe@example.com"
                                        value={newClient.email}
                                        onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63F2B] focus:border-transparent text-sm"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Total Sales (CA$)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        value={newClient.totalSales}
                                        onChange={(e) => setNewClient({...newClient, totalSales: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63F2B] focus:border-transparent text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Optional: Enter existing sales for this client</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addExternalClient}
                                    className="flex-1 px-4 py-2 bg-[#E63F2B] text-white rounded-lg hover:bg-[#D63426] transition-colors font-medium text-sm"
                                >
                                    Add Client
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters Modal */}
            {showFiltersModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Filter Clients</h2>
                                <p className="text-sm text-gray-500 mt-1">Refine your client list with filters</p>
                            </div>
                            <button
                                onClick={() => setShowFiltersModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Source Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Client Source
                                </label>
                                <div className="space-y-2">
                                    {[
                                        { value: 'all', label: 'All Sources' },
                                        { value: 'booking', label: 'Booking Platform' },
                                        { value: 'external', label: 'External (Manual + Import)' }
                                    ].map(option => (
                                        <label key={option.value} className="flex items-center">
                                            <input
                                                type="radio"
                                                name="source"
                                                value={option.value}
                                                checked={filters.source === option.value}
                                                onChange={(e) => setFilters({...filters, source: e.target.value})}
                                                className="mr-3 text-[#E63F2B] focus:ring-[#E63F2B]"
                                            />
                                            <span className="text-sm text-gray-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sales Range Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Sales Range (CA$)
                                </label>
                                <div className="space-y-2">
                                    {[
                                        { value: 'all', label: 'All Amounts' },
                                        { value: 'none', label: 'No Sales ($0)' },
                                        { value: 'low', label: 'Low ($0.01 - $100)' },
                                        { value: 'medium', label: 'Medium ($101 - $500)' },
                                        { value: 'high', label: 'High ($500+)' }
                                    ].map(option => (
                                        <label key={option.value} className="flex items-center">
                                            <input
                                                type="radio"
                                                name="salesRange"
                                                value={option.value}
                                                checked={filters.salesRange === option.value}
                                                onChange={(e) => setFilters({...filters, salesRange: e.target.value})}
                                                className="mr-3 text-[#E63F2B] focus:ring-[#E63F2B]"
                                            />
                                            <span className="text-sm text-gray-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Bookings Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Has Bookings
                                </label>
                                <div className="space-y-2">
                                    {[
                                        { value: 'all', label: 'All Clients' },
                                        { value: 'yes', label: 'With Bookings' },
                                        { value: 'no', label: 'Without Bookings' }
                                    ].map(option => (
                                        <label key={option.value} className="flex items-center">
                                            <input
                                                type="radio"
                                                name="hasBookings"
                                                value={option.value}
                                                checked={filters.hasBookings === option.value}
                                                onChange={(e) => setFilters({...filters, hasBookings: e.target.value})}
                                                className="mr-3 text-[#E63F2B] focus:ring-[#E63F2B]"
                                            />
                                            <span className="text-sm text-gray-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Added Date
                                </label>
                                <div className="space-y-2">
                                    {[
                                        { value: 'all', label: 'All Time' },
                                        { value: 'last30', label: 'Last 30 Days' },
                                        { value: 'last90', label: 'Last 90 Days' },
                                        { value: 'last365', label: 'Last Year' }
                                    ].map(option => (
                                        <label key={option.value} className="flex items-center">
                                            <input
                                                type="radio"
                                                name="dateRange"
                                                value={option.value}
                                                checked={filters.dateRange === option.value}
                                                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                                                className="mr-3 text-[#E63F2B] focus:ring-[#E63F2B]"
                                            />
                                            <span className="text-sm text-gray-700">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    setFilters({
                                        source: 'all',
                                        salesRange: 'all',
                                        hasBookings: 'all',
                                        dateRange: 'all'
                                    });
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setShowFiltersModal(false)}
                                className="flex-1 px-4 py-2 bg-[#E63F2B] text-white rounded-lg hover:bg-[#D63426] transition-colors font-medium text-sm"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Import Clients</h2>
                                <p className="text-sm text-gray-500 mt-1">Upload a CSV file to import multiple clients</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportFile(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6">
                            <div className="text-center">
                                <div 
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 hover:border-[#E63F2B] hover:bg-[#E63F2B]/5 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#E63F2B] to-[#FF6B5A] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                                        <UploadIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                    </div>
                                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                                        {importFile ? importFile.name : 'Upload CSV File'}
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        Click to browse or drag and drop your CSV file here
                                    </p>
                                </div>
                                
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="hidden"
                                />
                                
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <div className="text-xs text-blue-700 font-medium mb-1">CSV Format Requirements:</div>
                                    <div className="text-xs text-blue-600">
                                        Include columns: <strong>First Name, Last Name, Email</strong> (required)<br/>
                                        Optional: <strong>Phone, Total Sales (CA$)</strong>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            setShowImportModal(false);
                                            setImportFile(null);
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleFileImport}
                                        disabled={!importFile}
                                        className="flex-1 px-4 py-2 bg-[#E63F2B] text-white rounded-lg hover:bg-[#D63426] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                                    >
                                        Import Clients
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyStudents;
