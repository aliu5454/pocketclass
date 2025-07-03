import Head from "next/head";
import * as React from "react";
import { useRouter } from "next/router";
import { arrayUnion, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, storage } from "../../firebaseConfig";
import { toast, ToastContainer } from "react-toastify";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import NewHeader from "../../components/NewHeader";
import { useDropzone } from "react-dropzone";
import { CropperRef, Cropper, CircleStencil } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css'

function UpdateProfile() {
  const [userData, setUserData] = useState();
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [droppedFile, setDroppedFile] = useState(null);
  const cropperRef = React.useRef(null);
  const [showCropper, setShowCropper] = useState(false);

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

  useEffect(() => {
    if (droppedFile && showCropper && cropperRef.current) {
      setTimeout(() => {
        cropperRef.current.refresh?.();

        const canvas = cropperRef.current.getCanvas?.();
        if (canvas && canvas.focus) {
          canvas.focus();
        }
        document.getElementById('cropper').click()
        console.log('Clicked')
      }, 500);
    }
  }, [droppedFile, showCropper]);

  const validateFields = (data) => {
    const errors = {};
    if (!data.firstName) errors.firstName = "First Name is required";
    if (!data.lastName) errors.lastName = "Last Name is required";
    if (!data.gender && userData?.category == "instructor")
      errors.gender = "Gender is required";
    if (!data.phoneNumber && userData?.category == "instructor")
      errors.phoneNumber = "Phone Number is required";
    if (!data.dob && userData?.category == "instructor")
      errors.dob = "Date of Birth is required";
    if (!data.profileDescription && userData?.category == "instructor")
      errors.profileDescription = "Description is required";
    if (
      !droppedFile?.name &&
      (!userData?.images || userData.images.length === 0) &&
      userData?.category == "instructor"
    )
      errors.droppedFile = "Image is required";
    return errors;
  };

  const onDrop = (acceptedFiles) => {
    const imageFile = acceptedFiles.find((file) =>
      file.type.startsWith("image/")
    );
    if (imageFile) {
      setDroppedFile(imageFile);
      setShowCropper(true); // Show the cropper when a file is dropped
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: "image/*",
  });

  const onUpdateHandle = async (e) => {
    e.preventDefault();
    const data = {
      firstName: e.target.firstName.value,
      lastName: e.target.lastName.value,
      gender: e.target.gender.value,
      phoneNumber: e.target.phoneNumber.value,
      dob: e.target.dob.value,
      profileDescription: e.target.profileDescription.value,
    };

    const errors = validateFields(data);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
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
      imageURI = imageURL; // Ensure only one image in the array
    }

    await updateDoc(doc(db, "Users", id), {
      ...data,
      profileImage: imageURI,
      updatedAt: serverTimestamp(),
    });

    toast.success("Profile updated successfully", {
      toastId: "success-toast",
    });

    setLoading(false);
    router.push(`/profile/${id}`);
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
    setDroppedFile(null); // Reset the dropped image state to null
  };

  const onSave = () => {
    if (cropperRef.current) {
      // Get the coordinates and canvas from the Cropper instance
      const coordinates = cropperRef.current.getCoordinates();
      const canvas = cropperRef.current.getCanvas();

      // Get the base64 image data URL of the cropped canvas
      const croppedImageDataURL = canvas?.toDataURL();

      if (croppedImageDataURL) {
        // Create a Blob from the data URL to make it a file object
        const byteString = atob(croppedImageDataURL.split(',')[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uintArray = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
          uintArray[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([uintArray], { type: 'image/jpeg' });
        const file = new File([blob], droppedFile.name, { type: 'image/jpeg' });

        // Now update the droppedFile state with the new file
        setShowCropper(false);
        setDroppedFile(file);

        // Optionally log the cropped file
      }
    } // Close the cropper after saving
  };
  return (
    <>
      <Head>
        <title>Update Profile</title>
        <meta name="description" content="Update your profile" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      <NewHeader />

      {droppedFile && showCropper && (
        <div className="w-full fixed h-full fixed top-0 left-0 bg-transparent md:bg-[rgba(0,0,0,0.6)] overflow-hidden flex justify-center items-center z-[10001]">
          <div className="w-fit h-fit px-4 py-4 h-[600px] bg-white rounded-xl" tabIndex={0}
            onFocus={() => console.log('Wrapper focused')}>
            <Cropper
              src={droppedFile ? URL.createObjectURL(droppedFile) : null}
              className={'cropper'}
              ref={cropperRef}
              tabIndex={0}
              canvas="false"
              transition="true"
              maxWidth={1200}
              maxHeight={1200}
              stencilComponent={CircleStencil}
              onReady={() => {
                // Defer focus until layout is complete and element is visible
                const tryFocus = () => {
                  const canvas = cropperRef.current?.getCanvas?.();
                  if (canvas && typeof canvas.focus === "function") {
                    canvas.focus();
                    console.log("✅ Canvas focused programmatically");
                  } else {
                    console.warn("❌ Canvas not focusable");
                  }
                };

                // Ensure layout is painted — fire after 2 frames
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    tryFocus();
                  });
                });
              }}
            />
            <div className="flex justify-start mt-4 mb-2">
              <button
                className="border-2 border-red-500 text-red-500 px-2 min-w-[70px] py-2 w-[12vw] rounded mr-2"
                onClick={onCancel}>
                Cancel
              </button>
              <button
                className="bg-red-500 text-white py-2 w-[12vw] min-w-[70px] rounded"
                onClick={onSave}>
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

      <div className="px-10 rounded-3xl flex flex-col justify-center items-center mt-10">
        <div className="registrationContainer lg:w-[50%] sm:w-[100%]">
          <h1 className="text-5xl font-semibold text-center">Update Profile</h1>

          <div className="mt-8">
            <form onSubmit={onUpdateHandle}>
              <div className="grid lg:grid-cols-2 lg:gap-2 sm:grid-cols-1">
                <div>
                  <label className="text-medium font-medium">First Name</label>
                  <input
                    defaultValue={userData?.firstName}
                    name="firstName"
                    className={`w-full border-2 text-sm rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red ${formErrors.firstName
                      ? "border-red-500"
                      : "border-gray-100"
                      }`}
                    placeholder="Enter your First name"
                  />
                </div>
                <div>
                  <label className="text-medium font-medium">Last Name</label>
                  <input
                    defaultValue={userData?.lastName}
                    name="lastName"
                    className={`w-full border-2 text-sm rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red ${formErrors.lastName ? "border-red-500" : "border-gray-100"
                      }`}
                    placeholder="Enter your Last Name"
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 lg:gap-2 sm:grid-cols-1">
                <div>
                  <label className="text-medium font-medium">
                    Phone Number
                  </label>
                  <input
                    defaultValue={userData?.phoneNumber}
                    name="phoneNumber"
                    className={`w-full border-2 text-sm rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red ${formErrors.phoneNumber
                      ? "border-red-500"
                      : "border-gray-100"
                      }`}
                    placeholder="Enter your Phone Number"
                  />
                </div>
                <div>
                  <label className="text-medium font-medium">
                    Date of Birth
                  </label>
                  <input
                    defaultValue={userData?.dob}
                    name="dob"
                    type="date"
                    className={`w-full border-2 text-sm rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red ${formErrors.dob ? "border-red-500" : "border-gray-100"
                      }`}
                    placeholder="Enter your Date of Birth"
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 lg:gap-2 sm:grid-cols-1">
                <div>
                  <label className="text-medium font-medium">Gender</label>
                  <select
                    name="gender"
                    className={`w-full border-2 text-sm rounded-xl p-3 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red ${formErrors.gender ? "border-red-500" : "border-gray-100"
                      }`}
                    defaultValue={userData?.gender}
                  >
                    <option value="" hidden>
                      {userData?.gender || "Select Gender"}
                    </option>
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="text-medium font-medium">Image</label>
                  <div
                    {...getRootProps({
                      className: `w-full border-2 text-sm rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red ${formErrors.images ? "border-red-500" : "border-gray-100"
                        }`,
                    })}
                    style={{
                      border: "solid",
                      borderStyle: "dashed",
                      borderColor: formErrors.images ? "red" : `#d4d2d3`,
                      borderRadius: "10px",
                    }}
                    className="border-dashed flex justify-center items-center py-2 border-3 border-gray-200 px-3 cursor-pointer"
                  >
                    <input {...getInputProps()} />
                    {droppedFile ? (
                      <p className="text-center">{droppedFile.name}</p>
                    ) : (
                      <p>Drag & drop or select an Image</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-medium font-medium">Description</label>
                <textarea
                  defaultValue={userData?.profileDescription}
                  name="profileDescription"
                  className={`w-full border-2 text-sm rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red ${formErrors.profileDescription
                    ? "border-red-500"
                    : "border-gray-100"
                    }`}
                  placeholder="Enter a profile description"
                />
              </div>

              <div className="col-span-12 mt-10">
                {!loading ? (
                  <button
                    type="submit"
                    className="w-full py-4 bg-logo-red rounded-xl text-white font-bold text-lg"
                  >
                    Update
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 bg-logo-red rounded-xl text-white font-bold text-lg opacity-50"
                  >
                    Updating...
                  </button>
                )}
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
