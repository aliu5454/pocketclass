import Head from "next/head";
import * as React from "react";
import { useRouter } from "next/router";
import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, storage } from "../../firebaseConfig";
import { toast, ToastContainer } from "react-toastify";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import NewHeader from "../../components/NewHeader";
import { useDropzone } from "react-dropzone";
import { CropperRef, Cropper, CircleStencil } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import {
  PencilIcon,
  UserIcon,
  PhoneIcon,
  CakeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  PhotographIcon,
  SaveIcon,
  CloudUploadIcon,
} from "@heroicons/react/solid";

function UpdateProfile() {
  const [userData, setUserData] = useState();
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [droppedFile, setDroppedFile] = useState(null);
  const cropperRef = React.useRef(null);
  const [showCropper, setShowCropper] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const router = useRouter();
  const { id } = router.query;

  const getUserInfo = async (id) => {
    const docRef = doc(db, "Users", id);
    const data = await getDoc(docRef);
    setUserData(data.data());
  };

  useEffect(() => {
    if (id) {
      getUserInfo(id);
    }
  }, [id]);

  // Handle page-wide drag events
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragActive(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setDragCounter((prev) => prev - 1);
      if (dragCounter <= 1) {
        setIsDragActive(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragActive(false);
      setDragCounter(0);
    };

    // Add event listeners to document
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [dragCounter]);

  useEffect(() => {
    if (droppedFile && showCropper && cropperRef.current) {
      setTimeout(() => {
        cropperRef.current.refresh?.();
        const canvas = cropperRef.current.getCanvas?.();
        if (canvas && canvas.focus) {
          canvas.focus();
        }
        document.getElementById("cropper").click();
        console.log("Clicked");
      }, 500);
    }
  }, [droppedFile, showCropper]);

  const validateFields = (data) => {
    const errors = {};
    const missingFields = [];

    if (!data.firstName) {
      errors.firstName = "First Name is required";
      missingFields.push("First Name");
    }
    if (!data.lastName) {
      errors.lastName = "Last Name is required";
      missingFields.push("Last Name");
    }
    if (!data.gender && (userData?.isInstructor || router.query.onboarding)) {
      errors.gender = "Gender is required";
      missingFields.push("Gender");
    }
    if (
      !data.phoneNumber &&
      (userData?.isInstructor || router.query.onboarding)
    ) {
      errors.phoneNumber = "Phone Number is required";
      missingFields.push("Phone Number");
    }
    if (!data.dob && (userData?.isInstructor || router.query.onboarding)) {
      errors.dob = "Date of Birth is required";
      missingFields.push("Date of Birth");
    }
    if (
      !data.profileDescription &&
      (userData?.isInstructor || router.query.onboarding)
    ) {
      errors.profileDescription = "Description is required";
      missingFields.push("Profile Description");
    }
    if (
      !droppedFile?.name &&
      !userData.profileImage &&
      (userData?.isInstructor || router.query.onboarding)
    ) {
      errors.droppedFile = "Image is required";
      missingFields.push("Profile Image");
    }

    return { errors, missingFields };
  };

  const onDrop = (acceptedFiles) => {
    const imageFile = acceptedFiles.find((file) =>
      file.type.startsWith("image/")
    );
    if (imageFile) {
      setDroppedFile(imageFile);
      setShowCropper(true);
    }
    setIsDragActive(false);
    setDragCounter(0);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: "image/*",
    noClick: true, // Disable click on the full page dropzone
    noKeyboard: true, // Disable keyboard events
  });

  // Separate dropzone for click functionality
  const {
    getRootProps: getClickableRootProps,
    getInputProps: getClickableInputProps,
  } = useDropzone({
    onDrop,
    accept: "image/*",
  });

  const onUpdateHandle = async (e) => {
    e.preventDefault();
    console.log("Update Profile Form Submitted");
    setHasAttemptedSubmit(true);

    // Check if image is required and missing
    if (!userData.profileImage && !droppedFile) {
      toast.error("Please upload your profile picture before submitting", {
        toastId: "missing-image-toast",
      });
      return;
    }

    const data = {
      firstName: e.target.firstName.value,
      lastName: e.target.lastName.value,
      gender: e.target.gender.value,
      phoneNumber: e.target.phoneNumber.value,
      dob: e.target.dob.value,
      profileDescription: e.target.profileDescription.value,
    };

    const { errors, missingFields } = validateFields(data);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      
      // Show specific toast message about what's missing
      if (missingFields.length === 1) {
        toast.error(`Please fill in the missing field: ${missingFields[0]}`, {
          toastId: "missing-field-toast",
        });
      } else if (missingFields.length === 2) {
        toast.error(`Please fill in the missing fields: ${missingFields.join(" and ")}`, {
          toastId: "missing-fields-toast",
        });
      } else if (missingFields.length > 2) {
        const lastField = missingFields.pop();
        toast.error(`Please fill in the missing fields: ${missingFields.join(", ")}, and ${lastField}`, {
          toastId: "missing-fields-toast",
        });
      }
      
      return;
    }

    setFormErrors({});
    setLoading(true);

    let imageURI = "";
    if (droppedFile) {
      const fileRef = ref(
        storage,
        `images/userImages/${Date.now()}-${droppedFile.name}`
      );
      const uploadResult = await uploadBytes(fileRef, droppedFile);
      const imageURL = await getDownloadURL(uploadResult.ref);
      imageURI = imageURL;
    }

    if (!imageURI) {
      imageURI = userData.profileImage || "";
    }

    // Check if this is a complete profile update that should activate instructor status
    const isProfileComplete =
      data.firstName &&
      data.lastName &&
      data.gender &&
      data.phoneNumber &&
      data.dob &&
      data.profileDescription &&
      imageURI;

    const updateData = {
      ...data,
      profileImage: imageURI,
      updatedAt: serverTimestamp(),
    };

    // If profile is complete and user came from instructor onboarding, activate instructor status
    if (
      isProfileComplete &&
      (router.query.from === "instructor-onboarding" ||
        userData?.pendingInstructor)
    ) {
      updateData.isInstructor = true;
      updateData.pendingInstructor = false;
    }

    await updateDoc(doc(db, "Users", id), updateData);

    toast.success("Profile updated successfully", {
      toastId: "success-toast",
    });

    setLoading(false);

    // Redirect back to instructor onboarding if user came from there
    if (router.query.from === "instructor-onboarding") {
      window.location.href = "/instructor-onboarding";
    } else {
      router.push(`/profile/${id}`);
    }
  };

  if (!id || !userData) {
    return (
      <section className="flex justify-center items-center min-h-[100vh]">
        <Image
          priority={true}
          src="/Rolling-1s-200px.svg"
          width={60}
          height={60}
          alt="Loading"
        />
      </section>
    );
  }

  const onCancel = () => {
    setDroppedFile(null);
  };

  const onSave = () => {
    if (cropperRef.current) {
      const coordinates = cropperRef.current.getCoordinates();
      const canvas = cropperRef.current.getCanvas();
      const croppedImageDataURL = canvas?.toDataURL();

      if (croppedImageDataURL) {
        const byteString = atob(croppedImageDataURL.split(",")[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uintArray = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
          uintArray[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([uintArray], { type: "image/jpeg" });
        const file = new File([blob], droppedFile.name, { type: "image/jpeg" });

        setShowCropper(false);
        setDroppedFile(file);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Update Profile</title>
        <meta name="description" content="Update your profile" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      {/* Full Page Drop Overlay - Only shows when dragging */}
      {isDragActive && (
        <div
          {...getRootProps()}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] backdrop-blur-sm"
        >
          <input {...getInputProps()} />
          <div className="bg-white rounded-3xl p-12 text-center shadow-2xl border-4 border-dashed border-logo-red">
            <CloudUploadIcon className="w-20 h-20 text-logo-red mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Drop your image here
            </h3>
            <p className="text-gray-600">
              Release to upload your profile image
            </p>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {droppedFile && showCropper && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[10001]">
          <div className="bg-white rounded-2xl shadow-2xl p-6" tabIndex={0}>
            <Cropper
              src={droppedFile ? URL.createObjectURL(droppedFile) : null}
              className={"cropper"}
              ref={cropperRef}
              tabIndex={0}
              canvas="false"
              transition="true"
              maxWidth={1200}
              maxHeight={1200}
              stencilComponent={CircleStencil}
              onReady={() => {
                const tryFocus = () => {
                  const canvas = cropperRef.current?.getCanvas?.();
                  if (canvas && typeof canvas.focus === "function") {
                    canvas.focus();
                    console.log("✅ Canvas focused programmatically");
                  } else {
                    console.warn("❌ Canvas not focusable");
                  }
                };

                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    tryFocus();
                  });
                });
              }}
            />
            <div className="flex justify-center gap-3 mt-6">
              <button
                className="px-6 py-2 border-2 border-logo-red text-logo-red rounded-lg hover:bg-logo-red hover:text-white transition-colors duration-200 font-medium"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-logo-red text-white rounded-lg hover:bg-logo-red/90 transition-colors duration-200 font-medium"
                onClick={onSave}
              >
                Save
              </button>
              <button
                id="cropper"
                onClick={() => console.log("Button manually clicked")}
                className="hidden"
              >
                Click Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Update Profile</h1>
            <p className="text-gray-600 mt-2">
              Update your personal information and settings
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={onUpdateHandle} className="space-y-8">
              {/* Profile Image Section */}
              <div className="text-center pb-8 border-b border-gray-100">
                <div className="relative inline-block mb-6">
                  {userData.profileImage || droppedFile ? (
                    <img
                      src={
                        droppedFile
                          ? URL.createObjectURL(droppedFile)
                          : userData.profileImage
                      }
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
                      alt="Profile"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-logo-red flex items-center justify-center border-4 border-gray-100">
                      <span className="text-white text-2xl font-bold">
                        {userData.firstName?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                  <div
                    {...getClickableRootProps()}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-logo-red rounded-full border-4 border-white flex items-center justify-center cursor-pointer hover:bg-logo-red/90 transition-colors duration-200"
                  >
                    <input {...getClickableInputProps()} />
                    <PencilIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-gray-500 text-sm">
                  Drop an image file or click on the edit icon to update your
                  profile picture
                </p>

                {hasAttemptedSubmit && !userData.profileImage && !droppedFile && (
                  <p className="text-red-500 text-sm mt-2">
                    Please upload your profile picture
                  </p>
                )}
                {formErrors.droppedFile && (
                  <p className="text-red-500 text-sm mt-2">
                    {formErrors.droppedFile}
                  </p>
                )}
              </div>

                
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <UserIcon className="w-5 h-5 text-logo-red mr-2" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      defaultValue={userData?.firstName}
                      name="firstName"
                      className={`w-full border-2 rounded-xl p-3 bg-white focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red transition-colors duration-200 ${
                        formErrors.firstName
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                      placeholder="Enter your first name"
                    />
                    {formErrors.firstName && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      defaultValue={userData?.lastName}
                      name="lastName"
                      className={`w-full border-2 rounded-xl p-3 bg-white focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red transition-colors duration-200 ${
                        formErrors.lastName
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                      placeholder="Enter your last name"
                    />
                    {formErrors.lastName && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.lastName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <CakeIcon className="w-4 h-4 text-gray-500 mr-1" />
                      Date of Birth
                    </label>
                    <input
                      defaultValue={userData?.dob}
                      name="dob"
                      type="date"
                      className={`w-full border-2 rounded-xl p-3 bg-white focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red transition-colors duration-200 ${
                        formErrors.dob ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    {formErrors.dob && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.dob}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <UserGroupIcon className="w-4 h-4 text-gray-500 mr-1" />
                      Gender
                    </label>
                    <select
                      name="gender"
                      className={`w-full border-2 rounded-xl p-3 bg-white focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red transition-colors duration-200 ${
                        formErrors.gender ? "border-red-500" : "border-gray-200"
                      }`}
                      defaultValue={userData?.gender}
                    >
                      <option value="" hidden>
                        {userData?.gender || "Select Gender"}
                      </option>
                      <option value="woman">Woman</option>
                      <option value="man">Man</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="prefer-not-to-say">
                        Prefer not to say
                      </option>
                    </select>
                    {formErrors.gender && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.gender}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <PhoneIcon className="w-5 h-5 text-logo-red mr-2" />
                  Contact Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    defaultValue={userData?.phoneNumber}
                    name="phoneNumber"
                    className={`w-full border-2 rounded-xl p-3 bg-white focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red transition-colors duration-200 ${
                      formErrors.phoneNumber
                        ? "border-red-500"
                        : "border-gray-200"
                    }`}
                    placeholder="Enter your phone number"
                  />
                  {formErrors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* About Me */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <DocumentTextIcon className="w-5 h-5 text-logo-red mr-2" />
                  About Me
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Description
                  </label>
                  <textarea
                    defaultValue={userData?.profileDescription}
                    name="profileDescription"
                    rows={4}
                    className={`w-full border-2 rounded-xl p-3 bg-white focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red transition-colors duration-200 resize-none ${
                      formErrors.profileDescription
                        ? "border-red-500"
                        : "border-gray-200"
                    }`}
                    placeholder="Tell others about yourself, your interests, and what makes you unique..."
                  />
                  {formErrors.profileDescription && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.profileDescription}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>

                  {!loading ? (
                    <button
                      type="submit"
                      className="px-8 py-3 bg-logo-red text-white rounded-xl hover:bg-logo-red/90 transition-colors duration-200 font-medium flex items-center"
                    >
                      <SaveIcon className="w-5 h-5 mr-2" />
                      Update Profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-8 py-3 bg-logo-red/50 text-white rounded-xl font-medium flex items-center cursor-not-allowed"
                    >
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Updating...
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </>
  );
}

export default UpdateProfile;
