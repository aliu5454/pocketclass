import React from "react";
import Footer from "/components/Footer";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import LargeCard from "/components/LargeCard";
import NewHeader from "../../components/NewHeader";
import "../../styles/Instructorguide.module.css";
import { useState, useRef, useEffect } from "react";
import VideoPlayer from "../../components/VideoPlayer";

export default function InstructorGuide() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  // Video player states
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [videoThumbnails, setVideoThumbnails] = useState({});
  const videoRefs = useRef({});

  const videos = [
    {
      id: 'step1',
      title: 'Set Up Your Instructor Profile',
      src: '/tutorials/Step1.mp4',
      description: 'Learn how to create and optimize your instructor profile on PocketClass'
    },
    {
      id: 'step2',
      title: 'Create Your Class',
      src: '/tutorials/Step2.mp4',
      description: 'Step-by-step guide to creating and publishing your first class'
    },
    {
      id: 'step3',
      title: 'Manage Your Schedule',
      src: '/tutorials/Step3.mp4',
      description: 'How to set your availability and manage your class schedule'
    },
    {
      id: 'step4',
      title: 'Receive Payments through Stripe',
      src: '/tutorials/Step4.mp4',
      description: 'Learn how to set up secure payments and get paid through Stripe'
    }
  ];

  const features = [
    {
      title: "Message Automations",
      description: "Automate key reminders, birthday vouchers, and rebooking nudges — fully customizable.",
      icon: (
        <svg viewBox="0 0 64 64" className="w-16 h-16">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            {/* Chat bubble */}
            <path d="M48 16H16c-4 0-8 4-8 8v16c0 4 4 8 8 8h8l8 8 8-8h8c4 0 8-4 8-8V24c0-4-4-8-8-8z" className="fill-blue-50" />
            {/* Clock */}
            <circle cx="32" cy="28" r="6" className="fill-white" />
            <path d="M32 25v3l2 2" />
            {/* Magic wand */}
            <path d="M42 10l2 2-6 6-2-2z" className="stroke-purple-500" />
            <circle cx="44" cy="8" r="1" className="fill-purple-500" />
            <circle cx="46" cy="12" r="1" className="fill-purple-500" />
            <circle cx="40" cy="12" r="1" className="fill-purple-500" />
          </g>
        </svg>
      )
    },
    {
      title: "AI Notes & Progress Tracking",
      description: "Easily track student progress, and let AI turn messy notes into concise, searchable records.",
      icon: (
        <svg viewBox="0 0 64 64" className="w-16 h-16">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            {/* Notepad */}
            <rect x="18" y="12" width="28" height="36" rx="2" className="fill-yellow-50" />
            <path d="M24 20h16M24 28h12M24 36h16" />
            {/* AI sparkles */}
            <circle cx="12" cy="16" r="2" className="fill-blue-400" />
            <circle cx="52" cy="24" r="2" className="fill-purple-400" />
            <circle cx="52" cy="40" r="2" className="fill-green-400" />
            <circle cx="12" cy="44" r="2" className="fill-pink-400" />
            {/* Lines connecting sparkles */}
            <path d="M14 16l4 4M50 26l-4 4M50 38l-4-4M14 42l4-4" className="stroke-gray-300 stroke-1" />
          </g>
        </svg>
      )
    },
    {
      title: "Smart Calendar & Integrations",
      description: "Set availability, accept real-time bookings, and sync across platforms.",
      icon: (
        <svg viewBox="0 0 64 64" className="w-16 h-16">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            {/* Calendar */}
            <rect x="12" y="16" width="40" height="32" rx="2" className="fill-green-50" />
            <path d="M12 24h40" />
            <path d="M20 12v8M44 12v8" />
            <circle cx="24" cy="32" r="2" className="fill-logo-red" />
            <circle cx="32" cy="32" r="1" className="fill-gray-400" />
            <circle cx="40" cy="32" r="1" className="fill-gray-400" />
            <circle cx="24" cy="40" r="1" className="fill-gray-400" />
            <circle cx="32" cy="40" r="1" className="fill-gray-400" />
            {/* Connection lines */}
            <path d="M54 20c4 0 8 0 8 4v8c0 4-4 4-8 4" className="stroke-blue-500" />
            <text x="56" y="30" className="text-xs font-bold fill-blue-500">G</text>
          </g>
        </svg>
      )
    },
    {
      title: "Custom Class Pages with Payments",
      description: "Create beautiful class pages where students can book and pay instantly.",
      icon: (
        <svg viewBox="0 0 64 64" className="w-16 h-16">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            {/* Laptop */}
            <rect x="12" y="20" width="40" height="24" rx="2" className="fill-gray-50" />
            <rect x="8" y="44" width="48" height="4" rx="2" className="fill-gray-200" />
            {/* Book Now button */}
            <rect x="22" y="28" width="20" height="8" rx="4" className="fill-logo-red stroke-logo-red" />
            <text x="32" y="34" textAnchor="middle" className="text-xs fill-white font-bold">Book</text>
            {/* Credit card */}
            <rect x="46" y="16" width="12" height="8" rx="1" className="fill-blue-100 stroke-blue-400" />
            <path d="M48 18h8M48 20h4" className="stroke-blue-400" />
          </g>
        </svg>
      )
    },
    {
      title: "Retention & Sales Tools",
      description: "Tiered reputation, loyalty programs, and analytics to keep students coming back.",
      icon: (
        <svg viewBox="0 0 64 64" className="w-16 h-16">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            {/* Chart with upward arrow */}
            <path d="M12 48L24 36L36 40L48 24L52 28" className="stroke-green-500 strokeWidth-3" />
            <path d="M48 28l4-4v4h-4" className="fill-green-500" />
            {/* Student avatars */}
            <circle cx="16" cy="12" r="4" className="fill-blue-200" />
            <circle cx="28" cy="8" r="4" className="fill-pink-200" />
            <circle cx="40" cy="12" r="4" className="fill-purple-200" />
            <circle cx="52" cy="8" r="4" className="fill-green-200" />
            {/* Connection lines */}
            <path d="M16 16l8 16M28 12l8 20M40 16l8 16M52 12l-4 8" className="stroke-gray-300 stroke-1" />
          </g>
        </svg>
      )
    }
  ];

  const testimonials = [
    {
      id: 1,
      quote: "PocketClass transformed how I run my yoga studio. The automated reminders and easy booking system have increased my class attendance by 40%.",
      name: "Sarah Chen",
      title: "Yoga Instructor",
      avatar: "https://cdn.prod.website-files.com/67c1d30d11d3d1eef8282474/67fc1f607b9984abe648899b_1722477119043-2.avif",

    },
    {
      id: 2,
      quote: "The payment integration is seamless, and I love how the AI helps me track my students' progress. It's like having a personal assistant.",
      name: "Marcus Rodriguez",
      title: "Guitar Teacher",
      avatar: "https://cdn.prod.website-files.com/67c1d30d11d3d1eef8282474/6800446f6a42673e8571e537_jesse_zhang_decagon.avif",

    },
    {
      id: 3,
      quote: "Managing multiple instructors and classes used to be chaos. PocketClass brought everything together in one beautiful platform.",
      name: "Emma Thompson",
      title: "Dance Studio Owner",
      avatar: "https://cdn.prod.website-files.com/67c1d30d11d3d1eef8282474/67fc21b8a8421e53648583e1_Hannah%20Chapiro%20Headshot.avif",


    }
  ];

  const displayIndex = hoveredIndex !== null ? hoveredIndex : activeIndex;
  const currentTestimonial = testimonials[displayIndex];


  const renderDesktopLayout = () => {
    const elements = [];

    testimonials.forEach((testimonial, index) => {
      // Add the image
      elements.push(
        <div
          key={`image-${testimonial.id}`}
          className={`cursor-pointer transition-all duration-300 ease-in-out relative overflow-hidden ${index === displayIndex
              ? 'w-80' // Fixed width for image when active
              : 'flex-1' // Equal flex for inactive images
            }`}
          onClick={() => setActiveIndex(index)}
          onMouseEnter={() => setHoveredIndex(index)}
        >
          {/* Image Section */}
          <div className="relative h-full w-full">
            <img
              src={testimonial.avatar}
              alt={testimonial.name}
              className="w-full h-full object-cover"
            />


            {/* Overlay for inactive images */}
            {index !== displayIndex && (
              <div className="absolute inset-0 bg-black bg-opacity-30 transition-opacity duration-300" />
            )}
          </div>
        </div>
      );

      // Add testimonial after this image if it's the hovered/active one
      // For the last image, testimonial goes at the end
      if (index === displayIndex) {
        elements.push(
          <div
            key={`testimonial-${testimonial.id}`}
            className="flex-1 bg-gray-50 p-8 flex flex-col justify-center min-w-96 border-l border-gray-100"
          >
            <div className={`transition-opacity duration-300 ${displayIndex !== null ? 'opacity-100' : 'opacity-0'}`}>
              <blockquote className="text-xl lg:text-2xl font-semibold text-gray-900 leading-relaxed mb-8">
                "{currentTestimonial.quote}"
              </blockquote>
              <div className="space-y-2 border-t border-gray-200 pt-6">
                <div className="text-lg font-bold text-gray-900">
                  {currentTestimonial.name}
                </div>
                <div className="text-gray-600 font-medium">
                  {currentTestimonial.title}
                </div>
              </div>
            </div>
          </div>
        );
      }
    });

    return elements;
  };

  // Generate video thumbnail from video element
  const generateThumbnail = (videoElement, videoId) => {
    if (!videoElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
    setVideoThumbnails(prev => ({
      ...prev,
      [videoId]: thumbnailUrl
    }));
  };

  // Handle video metadata load
  const handleVideoLoad = (videoId) => {
    const videoElement = videoRefs.current[videoId];
    if (videoElement) {
      // Seek to 2 seconds to get a more representative frame
      videoElement.currentTime = 2;
      videoElement.addEventListener('seeked', () => {
        generateThumbnail(videoElement, videoId);
      }, { once: true });
    }
  };

  useEffect(() => {
    // Load thumbnails for all videos
    videos.forEach(video => {
      if (video.src) {
        const videoElement = videoRefs.current[video.id];
        if (videoElement) {
          videoElement.addEventListener('loadedmetadata', () => handleVideoLoad(video.id));
        }
      }
    });
  }, []);

  const openVideo = (video) => {
    if (video.src) {
      setSelectedVideo(video);
      setIsVideoPlayerOpen(true);
    }
  };

  const closeVideo = () => {
    setIsVideoPlayerOpen(false);
    setSelectedVideo(null);
  };

  return (
    <div className="bg-white">
      <Head>
        <title>Grow Your Coaching Business with PocketClass</title>
        <meta
          name="description"
          content="All-in-one scheduling, payments, marketing, and student retention tools — built for sport, music, and art instructors."
        />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.05)_50%,transparent_75%,transparent_100%)]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-24 sm:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Grow Your{' '}
                <span className="text-logo-red">Coaching Business</span>{' '}
                with PocketClass
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                All-in-one scheduling, payments, marketing, and student retention tools —
                built for sport, music, and art instructors.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/instructor-onboarding">
                  <button className="bg-logo-red text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-red-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
                    Create Your Instructor Profile
                  </button>
                </Link>
                <button className="bg-white text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200">
                  See How It Works
                </button>
              </div>
              <div className="mt-8 flex items-center space-x-8 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Free to start</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Setup in 10 minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No monthly fees</span>
                </div>
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="relative lg:h-[600px] flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                {/* Central instructor figure */}
                <div className="relative z-5 bg-white rounded-2xl p-6 shadow-xl border border-gray-100 mx-8 my-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-logo-red rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold">
                      👨‍🏫
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Your Teaching Hub</h3>
                    <p className="text-gray-600 mt-1 text-sm">Everything you need in one place</p>
                  </div>
                </div>

                {/* Floating icons around the instructor */}
                <div className="absolute -top-4 -left-4 w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg animate-float">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>

                <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center shadow-lg animate-float-delayed">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                </div>

                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center shadow-lg animate-float">
                  <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                </div>

                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center shadow-lg animate-float-delayed">
                  <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional tools that help you focus on what you do best — teaching
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-logo-red mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-logo-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Process Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Instructor Verification Process
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We want to make sure our platform contains respected, verified, and
              trust-worthy instructors to provide the safest, most valuable,
              greatest experience for our students.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Skill */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Skill Verification</h3>
              <p className="text-gray-600 leading-relaxed">
                We verify that you have adept skill and knowledge to teach your chosen subject.
                Certifications or licenses will accelerate this process.
              </p>
            </div>

            {/* Experience */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Experience Review</h3>
              <p className="text-gray-600 leading-relaxed">
                We verify your proficient experience in teaching through video calls,
                portfolio review, and one required reference from a previous student or colleague.
              </p>
            </div>

            {/* Infrastructure */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Infrastructure Check</h3>
              <p className="text-gray-600 leading-relaxed">
                You must provide information on planned equipment and proposed locations
                for your teaching to ensure quality learning experiences.
              </p>
            </div>

            {/* Safety */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Safety & Background</h3>
              <p className="text-gray-600 leading-relaxed">
                We conduct a standard background check and require valid government
                issued identification to ensure student safety and platform integrity.
              </p>
            </div>
          </div>

          {/* Process Flow */}
          <div className="mt-20 bg-white rounded-3xl p-8 lg:p-12 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
              Verification Methodology & Process
            </h3>
            <p className="text-center text-gray-600 mb-12 text-lg">
              Before we help you connect with passionate and curious students in your area, we'd love to know more about you!
            </p>

            <div className="flex flex-col lg:flex-row items-center justify-between space-y-8 lg:space-y-0 lg:space-x-8">
              {/* Step 1 */}
              <div className="flex-1 text-center">
                <div className="w-12 h-12 bg-logo-red text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  1
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Submit Application</h4>
                <p className="text-gray-600 text-sm">Complete your instructor profile with credentials and experience</p>
              </div>

              {/* Arrow */}
              <div className="hidden lg:block">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Step 2 */}
              <div className="flex-1 text-center">
                <div className="w-12 h-12 bg-logo-red text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  2
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Review Process</h4>
                <p className="text-gray-600 text-sm">We verify your skills, experience, and conduct background checks</p>
              </div>

              {/* Arrow */}
              <div className="hidden lg:block">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Step 3 */}
              <div className="flex-1 text-center">
                <div className="w-12 h-12 bg-logo-red text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  3
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Start Teaching</h4>
                <p className="text-gray-600 text-sm">Get approved and begin connecting with students in your area</p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link href="/instructor-onboarding">
                <button className="bg-logo-red text-white px-8 py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors duration-200">
                  Begin Verification Process
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Video Tutorial Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get started in minutes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Watch these quick walkthroughs to learn how to set up your PocketClass profile,
              schedule classes, and start earning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {videos.map((video, index) => (
              <div key={video.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-logo-red text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {video.title}
                    </h3>
                  </div>

                  <div className="relative mb-4">
                    {video.src ? (
                      <>
                        <video
                          ref={el => videoRefs.current[video.id] = el}
                          src={video.src}
                          preload="metadata"
                          className="hidden"
                          muted
                        />

                        <div
                          className="relative aspect-video cursor-pointer group rounded-lg overflow-hidden"
                          onClick={() => openVideo(video)}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-logo-red to-red-600">
                            {videoThumbnails[video.id] && (
                              <img
                                src={videoThumbnails[video.id]}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300" />
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                              <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-gray-500 text-center">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">Coming Soon</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm leading-relaxed">{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Hear what our customers have to say about us
            </h2>
          </div>

          {/* Desktop Layout - Dynamic Positioning */}
          <div className="hidden lg:block">
            <div
              className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-7xl mx-auto"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex h-96">
                {renderDesktopLayout()}
              </div>
            </div>
          </div>

          {/* Tablet Layout - Keep your existing code */}
          <div className="hidden md:block lg:hidden">
            <div
              className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Profile Images Row */}
              <div className="flex h-48">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.id}
                    className={`cursor-pointer transition-all duration-300 ease-in-out relative overflow-hidden ${index === displayIndex ? 'flex-1' : 'w-32'
                      }`}
                    onClick={() => setActiveIndex(index)}
                    onMouseEnter={() => setHoveredIndex(index)}
                  >
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute bottom-2 left-2 bg-white rounded shadow-sm px-2 py-1">
                      <img
                        src={testimonial.companyLogo}
                        alt={testimonial.company}
                        className="h-4 object-contain"
                      />
                    </div>

                    {index !== displayIndex && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 transition-opacity duration-300" />
                    )}
                  </div>
                ))}
              </div>

              {/* Active Testimonial */}
              <div className="p-8 bg-gray-50">
                <blockquote className="text-xl font-semibold text-gray-900 leading-relaxed mb-6">
                  "{currentTestimonial.quote}"
                </blockquote>
                <div className="space-y-1 border-t border-gray-200 pt-4">
                  <div className="font-bold text-gray-900 text-lg">
                    {currentTestimonial.name}
                  </div>
                  <div className="text-gray-600 font-medium">
                    {currentTestimonial.title}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout - Keep your existing code */}
          <div className="md:hidden">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Profile Images Row */}
              <div className="flex h-32">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.id}
                    className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${index === displayIndex ? 'flex-1' : 'w-20'
                      }`}
                    onClick={() => setActiveIndex(index)}
                    onTouchStart={() => setHoveredIndex(index)}
                    onTouchEnd={() => setHoveredIndex(null)}
                  >
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute bottom-1 left-1 bg-white rounded shadow-sm px-1 py-0.5">
                      <img
                        src={testimonial.companyLogo}
                        alt={testimonial.company}
                        className="h-3 object-contain"
                      />
                    </div>

                    {index !== displayIndex && (
                      <div className="absolute inset-0 bg-black bg-opacity-40" />
                    )}
                  </div>
                ))}
              </div>

              {/* Active Testimonial */}
              <div className="p-6 bg-gray-50">
                <blockquote className="text-lg font-semibold text-gray-900 leading-relaxed mb-4">
                  "{currentTestimonial.quote}"
                </blockquote>
                <div className="space-y-1 border-t border-gray-200 pt-4">
                  <div className="font-bold text-gray-900">
                    {currentTestimonial.name}
                  </div>
                  <div className="text-gray-600 text-sm font-medium">
                    {currentTestimonial.title}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center mt-12 space-x-3">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${index === activeIndex
                    ? 'bg-gray-900 scale-110'
                    : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                aria-label={`Show testimonial from ${testimonials[index].name}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-br from-logo-red to-red-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.1)_50%,transparent_75%,transparent_100%)]"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Your students are waiting — start teaching on PocketClass today
          </h2>
          <p className="text-xl mb-8 text-red-100">
            Join thousands of instructors who've already transformed their teaching business
          </p>
          <Link href="/instructor-onboarding">
            <button className="bg-white text-logo-red px-10 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
              Sign Up Free
            </button>
          </Link>
          <p className="mt-4 text-red-100 text-sm">
            No setup fees • Cancel anytime • Start earning immediately
          </p>
        </div>
      </section>

      <Footer />

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          isOpen={isVideoPlayerOpen}
          onClose={closeVideo}
          videoSrc={selectedVideo.src}
          title={selectedVideo.title}
        />
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite 1.5s;
        }
      `}</style>
    </div>
  );
}
