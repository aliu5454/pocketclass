"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { toast } from "react-toastify";
import {
  CalendarIcon,
  CurrencyDollarIcon,
  StarIcon,
} from "@heroicons/react/outline";
import dynamic from "next/dynamic";

// Import React Quill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

// Custom styles for Quill editor
const quillModules = {
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image", "video"],
  ],
  clipboard: {
    // toggle to add extra line breaks when pasting HTML:
    matchVisual: false,
  },
  imageResize: {
    modules: ["Resize", "DisplaySize"],
  },
};

// Custom inline styles for Quill container
const quillEditorStyles = {
  container: {
    marginBottom: "1rem",
  },
  editor: {
    fontSize: "14px",
    lineHeight: "1.5",
    overflow: "auto",
  },
};

// Rich content view styles
const richContentStyles = `
  .rich-text-content {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }
  .rich-text-content h1, .rich-text-content h2, .rich-text-content h3, 
  .rich-text-content h4, .rich-text-content h5, .rich-text-content h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
  }
  .rich-text-content h1 { font-size: 2em; }
  .rich-text-content h2 { font-size: 1.5em; }
  .rich-text-content h3 { font-size: 1.25em; }
  .rich-text-content p { margin-bottom: 1em; }
  .rich-text-content img { 
    max-width: 100%; 
    height: auto;
    margin: 1em 0;
    border-radius: 4px;
  }
  .rich-text-content blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1em;
    margin-left: 0;
    color: #6b7280;
  }
  .rich-text-content pre {
    background-color: #f9fafb;
    padding: 1em;
    border-radius: 4px;
    overflow: auto;
  }
  .rich-text-content ul, .rich-text-content ol {
    padding-left: 2em;
    margin-bottom: 1em;
  }
  .rich-text-content a {
    color: #E63F2B;
    text-decoration: underline;
  }
  .rich-text-content a:hover {
    text-decoration: none;
  }
    .ql-tooltip {
  z-index: 9999; /* Ensure it's above everything */
  transform: none !important; /* Reset any transforms */
}

.ql-tooltip[data-mode="link"],
.ql-tooltip[data-mode="video"] {
  left: unset !important;
}
`;

// Helper component to render HTML content safely
const RichTextContent = ({ html }) => {
  return (
    <div
      className="rich-text-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "indent",
  "link",
  "image",
  "video",
  "align",
  "color",
  "background",
  "font",
  "size",
  "script",
  "blockquote",
  "code-block",
];

const ClientDetailsPanel = ({ selectedClient, onBack, instructorId }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [isViewNoteModalOpen, setIsViewNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [clientBookings, setClientBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSummarizingNote, setIsSummarizingNote] = useState(false);

  const router = useRouter();
  // Helper functions
  useEffect(() => {
    const loadImageResize = async () => {
      if (typeof window !== "undefined") {
        const RQ = await import("react-quill");
        const Quill = RQ.Quill || RQ.default?.Quill; // Fallbacks for various exports

        if (Quill && !Quill?.imports?.["modules/imageResize"]) {
          const ImageResize = (await import("quill-image-resize-module-react"))
            .default;
          Quill.register("modules/imageResize", ImageResize);
        }

      }
    };

    loadImageResize();
  }, []);

  useEffect(() => {
    // Get Reviews for the selected client
    const fetchReviews = async () => {
      if (!selectedClient) return;
      try {
        console.log("Fetching reviews for client:", selectedClient);
        const reviewsQuery = query(
          collection(db, "Reviews"),
          where("userId", "==", selectedClient.student_id)
        );
        // Filter revews which classId matches the classes booked by the client
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const filteredReviews = reviewsData
          .filter((review) =>
            selectedClient.allBookings?.some(
              (booking) =>
                booking.classDetails?.id === review.classID &&
                review.classID !== undefined
            )
          )
          .map((review) => {
            const matchingBooking = selectedClient.allBookings.find(
              (booking) => booking.classDetails?.id === review.classID
            );
            return {
              ...review,
              className: matchingBooking?.classDetails?.Name || "Unknown Class",
            };
          });
        setReviews(filteredReviews);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };
    if (selectedClient) {
      fetchReviews();
    }
  }, [selectedClient]);
  const getClientName = (client) => {
    if (!client) return "Unknown Client";

    if (client.studentDetails?.firstName || client.studentDetails?.lastName) {
      return `${client.studentDetails.firstName || ""} ${
        client.studentDetails.lastName || ""
      }`.trim();
    }

    if (client.firstName || client.lastName) {
      return `${client.firstName || ""} ${client.lastName || ""}`.trim();
    }

    const email = getClientEmail(client);
    return email ? email.split("@")[0] : "Unknown Client";
  };

  const getClientEmail = (client) => {
    if (!client) return "";
    return (
      client.studentDetails?.email || client.email || client.studentEmail || ""
    );
  };

  const getClientPhone = (client) => {
    if (!client) return "";
    return (
      client.studentDetails?.phoneNumber ||
      client.phoneNumber ||
      client.phone ||
      ""
    );
  };

  // Load client notes
  useEffect(() => {
    if (selectedClient && activeTab === "notes") {
      loadClientNotes();
    }
  }, [selectedClient, activeTab]);

  const loadClientNotes = async () => {
    setIsLoadingNotes(true);
    try {
      const clientEmail = getClientEmail(selectedClient);
      if (!clientEmail) {
        setNotes([]);
        return;
      }

      const notesRef = doc(
        db,
        "client-notes",
        `${instructorId}_${clientEmail.toLowerCase().trim()}`
      );
      const notesSnap = await getDoc(notesRef);

      if (notesSnap.exists()) {
        const notesData = notesSnap.data().notes || [];
        setNotes(Array.isArray(notesData) ? notesData : []);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error("Error loading client notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    setIsSavingNote(true);
    try {
      const clientEmail = getClientEmail(selectedClient);
      if (!clientEmail) {
        toast.error("Cannot save note: No email address found");
        return;
      }

      const noteId = Date.now().toString();
      const note = {
        id: noteId,
        title: newNoteTitle.trim() || "Untitled",
        text: newNote.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedNotes = [...notes, note];

      const notesRef = doc(
        db,
        "client-notes",
        `${instructorId}_${clientEmail.toLowerCase().trim()}`
      );
      await setDoc(
        notesRef,
        {
          instructorId,
          clientEmail: clientEmail.toLowerCase().trim(),
          clientName: getClientName(selectedClient),
          notes: updatedNotes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setNotes(updatedNotes);
      setNewNote("");
      setNewNoteTitle("");
      setIsNoteModalOpen(false);
      toast.success("Note added successfully");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const updateNote = async (noteId, newText, newTitle) => {
    if (!newText.trim()) return;

    setIsSavingNote(true);
    try {
      const clientEmail = getClientEmail(selectedClient);
      if (!clientEmail) {
        toast.error("Cannot update note: No email address found");
        return;
      }

      const updatedNotes = notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              title: newTitle.trim() || "Untitled",
              text: newText.trim(),
              updatedAt: new Date().toISOString(),
            }
          : note
      );

      const notesRef = doc(
        db,
        "client-notes",
        `${instructorId}_${clientEmail.toLowerCase().trim()}`
      );
      await setDoc(
        notesRef,
        {
          instructorId,
          clientEmail: clientEmail.toLowerCase().trim(),
          clientName: getClientName(selectedClient),
          notes: updatedNotes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setNotes(updatedNotes);
      setEditingNoteId(null);
      setEditingNoteText("");
      setEditingNoteTitle("");
      setIsNoteModalOpen(false);
      toast.success("Note updated successfully");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    setIsSavingNote(true);
    try {
      const clientEmail = getClientEmail(selectedClient);
      if (!clientEmail) {
        toast.error("Cannot delete note: No email address found");
        return;
      }

      const updatedNotes = notes.filter((note) => note.id !== noteId);

      const notesRef = doc(
        db,
        "client-notes",
        `${instructorId}_${clientEmail.toLowerCase().trim()}`
      );
      await setDoc(
        notesRef,
        {
          instructorId,
          clientEmail: clientEmail.toLowerCase().trim(),
          clientName: getClientName(selectedClient),
          notes: updatedNotes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setNotes(updatedNotes);
      toast.success("Note deleted successfully");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
    setEditingNoteTitle(note.title || "Untitled");
    setIsNoteModalOpen(true);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
    setEditingNoteTitle("");
    setIsNoteModalOpen(false);
  };

  const openNewNoteModal = () => {
    setNewNote("");
    setNewNoteTitle("");
    setIsNoteModalOpen(true);
  };

  const openViewNoteModal = (note) => {
    setViewingNote(note);
    setIsViewNoteModalOpen(true);
  };

  const closeViewNoteModal = () => {
    setViewingNote(null);
    setIsViewNoteModalOpen(false);
  };

  const formatDate = (dateInput) => {
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatDateTime = (dateInput) => {
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // AI functions
  const generateNoteTitle = async () => {
    const text = editingNoteId ? editingNoteText : newNote;
    if (!text.trim()) {
      toast.error("Please add some content to generate a title");
      return;
    }

    setIsGeneratingTitle(true);
    try {
      // Remove and store img/iframe elements from current text
      const imgElements = text.match(/<img[^>]*>/g) || [];
      const iframeElements = text.match(/<iframe[^>]*><\/iframe>/g) || [];
      const cleanedText = text.replace(/<img[^>]*>/g, "").replace(/<iframe[^>]*><\/iframe>/g, "");
      const response = await fetch('/api/ai/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleanedText }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate title');
      }

      const data = await response.json();
      
      if (editingNoteId) {
        setEditingNoteTitle(data.title);
      } else {
        setNewNoteTitle(data.title);
      }
      
      toast.success('Title generated successfully');
    } catch (error) {
      console.error('Error generating title:', error);
      toast.error('Failed to generate title');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const summarizeNote = async () => {
    const text = editingNoteId ? editingNoteText : newNote;
    if (!text.trim()) {
      toast.error("Please add some content to summarize");
      return;
    }

    setIsSummarizingNote(true);
    try {
      // Remove and store img/iframe elements from current text
      const imgElements = text.match(/<img[^>]*>/g) || [];
      const iframeElements = text.match(/<iframe[^>]*><\/iframe>/g) || [];
      const cleanedText = text.replace(/<img[^>]*>/g, "").replace(/<iframe[^>]*><\/iframe>/g, "");
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleanedText }),
      });

      if (!response.ok) {
        throw new Error('Failed to summarize note');
      }

      const data = await response.json();
      
      if (editingNoteId) {
        data.summary = data.summary + imgElements.join("") + iframeElements.join("");
        setEditingNoteText(data.summary);
      } else {
        data.summary = data.summary + imgElements.join("") + iframeElements.join("");
        setNewNote(data.summary);
      }
      
      toast.success('Note summarized successfully');
    } catch (error) {
      console.error('Error summarizing note:', error);
      toast.error('Failed to summarize note');
    } finally {
      setIsSummarizingNote(false);
    }
  };

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto mb-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <p>Select a client to view details</p>
        </div>
      </div>
    );
  }

  const clientName = getClientName(selectedClient);
  const clientEmail = getClientEmail(selectedClient);
  const clientPhone = getClientPhone(selectedClient);

  return (
    <div className="bg-white max-h-screen h-full flex flex-col lg:grid lg:grid-cols-5">
      <style dangerouslySetInnerHTML={{ __html: richContentStyles }} />
      {/* Left Panel - Client Information (Desktop) */}
      <div className="hidden lg:block lg:col-span-2 border-r border-gray-200 max-h-screen overflow-y-auto">
        {/* Mobile Header with back button (shown on mobile) */}
        <div className="border-b border-gray-200 p-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Clients
          </button>
        </div>

        {/* Client Profile */}
        <div className="p-6 mt-4">
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#E63F2B] to-[#FF6B5A] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {clientName}
            </h1>
            {clientEmail && <p className="text-gray-600 mb-1">{clientEmail}</p>}
            {clientPhone && (
              <p className="text-gray-500 text-sm">{clientPhone}</p>
            )}
          </div>

          {/* Statistics Cards */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Sales
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    CA$ {(selectedClient.totalSales || 0).toFixed(2)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Bookings
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedClient.bookingCount || 0}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Avg. per Booking
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    CA${" "}
                    {selectedClient.bookingCount > 0
                      ? (
                          (selectedClient.totalSales || 0) /
                          selectedClient.bookingCount
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <StarIcon className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Client Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Client Since
                </p>
                <p className="text-gray-900">
                  {formatDate(selectedClient.startTime)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Source</p>
                <p className="text-gray-900 capitalize">
                  {selectedClient.source === "booking"
                    ? "Platform Booking"
                    : "External/Manual"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Tab Content (Desktop) and Full Panel (Mobile) */}
      <div className="flex flex-col max-h-screen lg:col-span-3">
        {/* Mobile Header - Only shown on mobile/tablet */}
        <div className="lg:hidden border-b border-gray-200 p-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Clients
            </button>
          </div>

          {/* Mobile Client Profile Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#E63F2B] to-[#FF6B5A] rounded-full flex items-center justify-center text-white text-xl font-bold">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{clientName}</h1>
              {clientEmail && (
                <p className="text-gray-600 text-sm">{clientEmail}</p>
              )}
              {clientPhone && (
                <p className="text-gray-500 text-sm">{clientPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-xl font-bold text-gray-900">
                CA$ {(selectedClient.totalSales || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 px-4 lg:px-6">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview" },
              {
                id: "bookings",
                label: "Bookings",
                count: selectedClient.bookingCount || 0,
              },
              { id: "notes", label: "Notes" },
              { id: "reviews", label: "Reviews" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-[#E63F2B] text-[#E63F2B]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Client Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Sales
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        CA$ {(selectedClient.totalSales || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Bookings
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedClient.bookingCount || 0}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Avg. per Booking
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        CA${" "}
                        {selectedClient.bookingCount > 0
                          ? (
                              (selectedClient.totalSales || 0) /
                              selectedClient.bookingCount
                            ).toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <StarIcon className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Full Name
                    </p>
                    <p className="text-gray-900">{clientName}</p>
                  </div>
                  {clientEmail && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Email Address
                      </p>
                      <p className="text-gray-900">{clientEmail}</p>
                    </div>
                  )}
                  {clientPhone && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Phone Number
                      </p>
                      <p className="text-gray-900">{clientPhone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Client Since
                    </p>
                    <p className="text-gray-900">
                      {formatDate(selectedClient.startTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Source
                    </p>
                    <p className="text-gray-900 capitalize">
                      {selectedClient.source === "booking"
                        ? "Platform Booking"
                        : "External/Manual"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "bookings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Booking History
                </h3>
                <span className="text-sm text-gray-500">
                  {selectedClient.bookingCount || 0} total bookings
                </span>
              </div>

              {selectedClient.allBookings?.length > 0 ? (
                <div className="space-y-4">
                  {selectedClient.allBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {booking.classDetails?.Name || "Class Booking"}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDateTime(booking.startTime)}
                          </p>
                          {booking.classDetails?.Address && (
                            <p className="text-sm text-gray-500 mt-1">
                              📍 {booking.classDetails.Address}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            CA$ {(parseFloat(booking.price) || 0).toFixed(2)}
                          </p>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {booking.status || "Booked"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500">
                    No bookings found for this client
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Client Notes
                </h3>
                <span className="text-sm text-gray-500">
                  {notes.length} note{notes.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Add New Note Button */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700">
                    Client Notes
                  </h4>
                  <button
                    onClick={openNewNoteModal}
                    className="px-4 py-2 bg-[#E63F2B] text-white rounded-lg hover:bg-[#D63426] transition-colors text-sm font-medium"
                  >
                    Add New Note
                  </button>
                </div>
              </div>

              {/* Note Modal */}
              {isNoteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 mt-0" style={{
                  marginTop: "0px", // Ensure modal is centered vertically
                }}>
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-[80vw] max-h-[90vh] flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        {editingNoteId ? "Edit Note" : "New Note"}
                      </h3>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto">
                      {/* Title Input with Generate button */}
                      <div className="flex gap-3 mb-4 flex-col md:flex-row">
                        <input
                          type="text"
                          value={editingNoteId ? editingNoteTitle : newNoteTitle}
                          onChange={(e) =>
                            editingNoteId
                              ? setEditingNoteTitle(e.target.value)
                              : setNewNoteTitle(e.target.value)
                          }
                          placeholder="Untitled"
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63F2B] focus:border-transparent"
                          autoFocus
                        />
                        <button
                          onClick={generateNoteTitle}
                          disabled={isGeneratingTitle}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-400"
                        >
                          {isGeneratingTitle ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Generating...
                            </span>
                          ) : (
                            "Generate Title"
                          )}
                        </button>
                      </div>

                      {/* Quill Editor */}
                      <div style={quillEditorStyles.container} className="mb-4">
                        <ReactQuill
                          theme="snow"
                          value={editingNoteId ? editingNoteText : newNote}
                          onChange={
                            editingNoteId ? setEditingNoteText : setNewNote
                          }
                          className="h-full"
                          style={quillEditorStyles.editor}
                          modules={quillModules}
                          formats={quillFormats}
                          placeholder="Write your note content here..."
                        />
                      </div>
                    </div>

                    <div className="p-4 border-t border-gray-200 flex flex-col md:flex-row gap-3 justify-between">
                      <div className="space-x-2">
                        <button
                          onClick={summarizeNote}
                          disabled={isSummarizingNote}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {isSummarizingNote ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Summarizing...
                            </span>
                          ) : (
                            "Refine & Summarize"
                          )}
                        </button>
                      </div>
                      
                      <div className="space-x-2">
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (editingNoteId) {
                              updateNote(
                                editingNoteId,
                                editingNoteText,
                                editingNoteTitle
                              );
                            } else {
                              addNote();
                            }
                          }}
                          disabled={
                            !(editingNoteId ? editingNoteText : newNote).trim() ||
                            isSavingNote
                          }
                          className="px-4 py-2 bg-[#E63F2B] text-white rounded-lg hover:bg-[#D63426] disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {isSavingNote
                            ? "Saving..."
                            : editingNoteId
                            ? "Update Note"
                            : "Add Note"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Notes List */}
              {isLoadingNotes ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 h-24 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : notes.length > 0 ? (
                <div className="space-y-4">
                  {notes
                    .sort(
                      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    )
                    .map((note) => (
                      <div
                        key={note.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-logo-red text-gray-900 hover:text-logo-red"
                        onClick={() => startEditing(note)}
                      >
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => openViewNoteModal(note)}
                            >
                              <h4 className="text-base font-medium">
                                {note.title || "Untitled"}
                              </h4>
                            </div>
                            <div className="flex items-center gap-1 ml-4">
                              <button
                                onClick={() => startEditing(note)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit note"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNote(note.id);
                                }}
                                disabled={isSavingNote}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Delete note"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              Created:{" "}
                              {note.createdAt
                                ? formatDate(note.createdAt)
                                : "Unknown"}
                            </span>
                            {note.updatedAt &&
                              new Date(note.updatedAt).getTime() !==
                                new Date(note.createdAt).getTime() && (
                                <span>
                                  Updated: {formatDate(note.updatedAt)}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500">No notes yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add your first note about this client above
                  </p>
                </div>
              )}

              <div className="text-xs text-gray-400 border-t border-gray-200 pt-4">
                Notes are private and only visible to you
              </div>
            </div>
          )}

          {activeTab === "reviews" &&
            (reviews.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Client Reviews
                </h3>
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">
                          {review.className || "Class Review"}
                        </p>
                        <p className="text-gray-900">{review.review}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatDate(review.createdAt.toDate().toISOString())}
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                            (review.qualityRating +
                              review.safetyRating +
                              review.recommendRating) /
                              3 >=
                            4
                              ? "bg-green-100 text-green-800"
                              : (review.qualityRating +
                                  review.safetyRating +
                                  review.recommendRating) /
                                  3 ===
                                3
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {(review.qualityRating +
                            review.safetyRating +
                            review.recommendRating) /
                            3}{" "}
                          Stars
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="w-12 h-12 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-500">
                  No reviews found for this client
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsPanel;
