import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import Head from "next/head";
import Link from "next/link";

export default function MindbodyInit() {
  const [siteId, setSiteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, userLoading] = useAuthState(auth);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [activationCode, setActivationCode] = useState("");
  const [activationUrl, setActivationUrl] = useState("");

  // Check if user is logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login?redirect=mindbody-init");
    }
    if (user && !userLoading) {
      const fetchUserData = async () => {
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.mindbodySite) {
            router.push(`/api/mindbody-auth?siteId=${encodeURIComponent(userData.mindbodySite)}`);
          }
        }
      }
      fetchUserData();
    }
  }, [user, userLoading, router]);

  const handleSiteIdSubmit = async (e) => {
    e.preventDefault();
    if (!siteId.trim()) {
      setError("Please enter a valid Site ID");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get Activation Code
      const response = await fetch(`/api/mindbody/getActivationCode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteID: siteId.trim(),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Mindbody API Error:", errorData);
        setError(errorData.Message || "Failed to fetch activation code");
        setLoading(false);
        return;
      }
      const data = await response.json();

      // Save site ID to user profile
      await updateDoc(doc(db, "Users", user.uid), {
        mindbodySite: siteId.trim(),
      });

      // Update state with activation code and URL
      setActivationCode(data.data?.ActivationCode || "");
      setActivationUrl(data.data?.ActivationLink || "");

      setLoading(false);
      setError(null);
      setStep(2); // Move to activation code step
    } catch (err) {
      console.error("Error saving Site ID:", err);
      setError("Failed to save your Site ID. Please try again.");
      setLoading(false);
    }
  };

  const handleContinueToAuth = () => {
    const oauthUrl = `/api/mindbody-auth?siteId=${encodeURIComponent(
      siteId.trim()
    )}`;
    console.log("Redirecting to Mindbody OAuth:", oauthUrl);
    window.location.href = oauthUrl;
  };

  if (userLoading) {
    return (
      <div className="flex min-h-screen justify-center items-center bg-gray-50">
        <div className="w-full max-w-md p-8 rounded-xl">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded w-full mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Connect Mindbody | PocketClass</title>
        <meta
          name="description"
          content="Connect your Mindbody account to PocketClass"
        />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Connect Mindbody
            </h1>
            <p className="mt-3 text-lg text-gray-500">
              Integrate your Mindbody business with PocketClass
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <div className="flex items-center mb-4 sm:mb-0">
                <div
                  className={`w-10 h-10 ${
                    step === 1 ? "bg-logo-red" : "bg-gray-200"
                  } text-white rounded-full flex items-center justify-center font-bold`}
                >
                  1
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${
                      step === 1 ? "text-logo-red" : "text-gray-500"
                    }`}
                  >
                    Input Site ID
                  </p>
                </div>
              </div>
              <div className="hidden sm:block w-full max-w-[80px] border-t border-gray-300"></div>
              <div className="flex items-center mb-4 sm:mb-0">
                <div
                  className={`w-10 h-10 ${
                    step === 2 ? "bg-logo-red" : "bg-gray-200"
                  } ${step === 2 ? "text-white" : "text-gray-500"} rounded-full flex items-center justify-center font-bold`}
                >
                  2
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${
                      step === 2 ? "text-logo-red" : "text-gray-500"
                    }`}
                  >
                    Approve Access
                  </p>
                </div>
              </div>
              <div className="hidden sm:block w-full max-w-[80px] border-t border-gray-300"></div>
              <div className="flex items-center mb-4 sm:mb-0">
                <div
                  className={`w-10 h-10 ${
                    step === 3 ? "bg-logo-red" : "bg-gray-200"
                  } ${step === 3 ? "text-white" : "text-gray-500"} rounded-full flex items-center justify-center font-bold`}
                >
                  3
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${
                      step === 3 ? "text-logo-red" : "text-gray-500"
                    }`}
                  >
                    Connect Staff Account
                  </p>
                </div>
              </div>
              <div className="hidden sm:block w-full max-w-[80px] border-t border-gray-300"></div>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 ${
                    step === 4 ? "bg-logo-red" : "bg-gray-200"
                  } ${step === 4 ? "text-white" : "text-gray-500"} rounded-full flex items-center justify-center font-bold`}
                >
                  4
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${
                      step === 4 ? "text-logo-red" : "text-gray-500"
                    }`}
                  >
                    Import Classes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {step === 1 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-red-50 border-b border-red-100">
                <h2 className="text-lg font-medium text-logo-red">
                  Step 1: Enter Your Mindbody Site ID
                </h2>
                <p className="mt-1 text-sm text-red-600">
                  We need your Site ID to connect to your Mindbody account
                </p>
              </div>
              <form onSubmit={handleSiteIdSubmit} className="px-4 py-5 sm:p-6">
                <div className="mb-6">
                  <label
                    htmlFor="siteId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Mindbody Site ID
                  </label>
                  <input
                    type="text"
                    id="siteId"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    placeholder="Enter your Mindbody Site ID"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-logo-red focus:border-logo-red sm:text-sm"
                    required
                  />
                </div>

                {error && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">
                    How to find your Site ID:
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    <li>Log in to your Mindbody Business account</li>
                    <li>Go to the Account Settings or Settings menu</li>
                    <li>Select "Business Information" or "Business Details"</li>
                    <li>
                      Look for "Site ID" or "Business ID" in your account details
                    </li>
                  </ol>
                  <div className="mt-3 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-amber-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="ml-2 text-xs text-amber-600">
                      If you can't find your Site ID, please contact your Mindbody
                      administrator
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href="/dashboard"
                    className="text-sm text-logo-red hover:text-red-700"
                  >
                    Back to Dashboard
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-logo-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-logo-red ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      "Get Activation Code"
                    )}
                  </button>
                </div>
              </form>

              <div className="px-4 py-3 sm:px-6 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                <p>
                  By connecting Mindbody, you authorize PocketClass to access your
                  business information and synchronize class data between
                  platforms.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-red-50 border-b border-red-100">
                <h2 className="text-lg font-medium text-logo-red">
                  Step 2: Set Up API Integration in Mindbody
                </h2>
                <p className="mt-1 text-sm text-red-600">
                  Use the activation code or link to authorize PocketClass
                </p>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="mb-6">
                  <h3 className="text-base font-medium text-gray-800 mb-2">
                    Your Activation Code:
                  </h3>
                  <div className="flex items-center">
                    <div className="bg-gray-100 py-2 px-4 rounded-md font-mono text-lg border border-gray-300 flex-grow">
                      {activationCode || "No activation code received"}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activationCode);
                        alert("Activation code copied to clipboard!");
                      }}
                      className="ml-2 p-2 text-logo-red hover:text-red-700"
                      title="Copy to clipboard"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-base font-medium text-gray-800 mb-2">
                    Option 1: Click the Activation Link
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Click the button below to open Mindbody and automatically set
                    up the integration:
                  </p>
                  <a
                    href={activationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-logo-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-logo-red"
                  >
                    Open Activation Link
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="ml-2 h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  </a>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-base font-medium text-gray-800 mb-2">
                    Option 2: Enter the Activation Code Manually
                  </h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600">
                    <li>Log in to your Mindbody Business account</li>
                    <li>
                      Go to{" "}
                      <strong>Settings</strong> &gt; <strong>API Integrations</strong>
                    </li>
                    <li>Find the <strong>Add API Integration</strong> section</li>
                    <li>Enter the activation code displayed above</li>
                    <li>Click <strong>Submit</strong></li>
                    <li>Accept the permissions requested by PocketClass</li>
                  </ol>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-yellow-600 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-sm text-yellow-700">
                          <strong>Need help?</strong> For detailed instructions on
                          setting up API integrations, visit:
                        </p>
                        <a
                          href="https://support.mindbodyonline.com/s/article/Setting-up-an-API-integration?language=en_US"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-logo-red hover:text-red-700 font-medium"
                        >
                          Mindbody Support: Setting up an API Integration
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-logo-red hover:text-red-700"
                  >
                    &larr; Back to Site ID
                  </button>
                  <button
                    onClick={handleContinueToAuth}
                    className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-logo-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-logo-red"
                  >
                    I've Completed the Integration
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 sm:px-6 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                <p>
                  After authorizing in Mindbody, you'll continue the connection
                  process to link your staff account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
