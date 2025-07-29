"use client";

import Head from "next/head";
import Footer from "../components/Footer";
import dynamic from "next/dynamic";
import { categories } from "../utils/categories";
import { useDropzone } from "react-dropzone";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { useFormik } from "formik";
import { classSchema } from "../Validation/createClass";

const MapCoordinates = dynamic(() => import("../components/MapCoordinates"), {
  ssr: false,
});

import { useRouter } from "next/router";
import { auth, db, storage } from "../firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  GeoPoint,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import { set } from "date-fns";
import LocationMap from "../components/LocationMap";
import NewHeader from "../components/NewHeader";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import imageCompression from "browser-image-compression";
import ToggleSwitch from "../components/toggle";
import VideoPlayer from "../components/VideoPlayer";
import { Switch } from "antd";

const SortableImage = ({ image, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: image.name,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  console.log(image);
  const isImage = image.type?.startsWith("image");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative touch-none"
      {...attributes} // only structural attributes
    >
      <button
        type="button"
        className="text-logo-red absolute top-2 right-2 z-20"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(e, image.name);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="#e73f2b"
          viewBox="0 0 30 30"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5 mr-1"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M 14.984375 2.4863281 A 1.0001 1.0001 0 0 0 14 3.5 L 14 4 L 8.5 4 A 1.0001 1.0001 0 0 0 7.4863281 5 L 6 5 A 1.0001 1.0001 0 1 0 6 7 L 24 7 A 1.0001 1.0001 0 1 0 24 5 L 22.513672 5 A 1.0001 1.0001 0 0 0 21.5 4 L 16 4 L 16 3.5 A 1.0001 1.0001 0 0 0 14.984375 2.4863281 z M 6 9 L 7.7929688 24.234375 C 7.9109687 25.241375 8.7633438 26 9.7773438 26 L 20.222656 26 C 21.236656 26 22.088031 25.241375 22.207031 24.234375 L 24 9 L 6 9 z"
          ></path>
        </svg>
      </button>
      {isImage ? (
        <img
          src={image.src}
          alt={`Preview ${image.name}`}
          className="w-full h-48 object-cover rounded-lg border"
        />
      ) : (
        <video src={image.src} className="object-cover rounded-lg w-full h-48" />
      )}

      <div
        {...listeners}
        className="absolute bottom-0 h-full w-full px-2 py-1 rounded shadow cursor-grab z-10"
      ></div>
    </div>
  );
};

export default function CreateClass() {
  const [previewImages, setPreviewImages] = useState([]);
  const [imageError, setImageError] = useState(null);
  const [addressError, setAddressError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [classLoading, setClassLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    Name: "",
    Category: "",
    SubCategory: "",
    Address: "",
    Price: "",
    Mode: "Offline",
    Pricing: "",
    groupSize: "",
    groupPrice: "",
    // Location: { Extra in actual response getting sent..
    //   _lat: "",
    //   _long: "",
    // },
    Images: [],
    About: "",
    Experience: "",
    Description: "",
    FunFact: "",
    TopRated: false,
    classCreator: "",
    status: "pending",
    latitude: "",
    longitude: "",
    firstFree: false,
  });

  const formik = useFormik({
    initialValues: {
      class_name: "",
      category: "",
      sub_category: "",
      mode_of_class: "",
      description: "",
      price: "",
      pricing: "",
      groupSize: "",
      groupPrice: "",
      experience: "",
      about: "",
      funfact: "",
      name: "",
      numberOfSessions: "",
      priceOfCompleteCourse: "",
      discount: "",
      firstFree: false,
    },
    validationSchema: classSchema, // Use Yup validation schema
    validateOnChange: true, // Ensure validation happens on each change
    validateOnBlur: true, // Ensure validation happens on blur
  });

  const addClass = async (e) => {
    e.preventDefault();

    if (
      !form.Name ||
      !form.Category ||
      !form.SubCategory ||
      !form.Price ||
      !form.Pricing ||
      !form.Description
    ) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.Images.length < 1) {
      setImageError("Please upload at least 1 image");
      toast.error("Please upload at least 1 image");
      setLoading(false);
      return;
    }
    if (!form.Address) {
      setAddressError("Please select a location on the map");
      toast.error("Please select a location on the map");
      setLoading(false);
      return;
    }
    const totalSize = form.Images.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      // 10MB
      setImageError(
        "Total size of all images must be less than or equal to 10MB"
      );
      toast.error(
        "Total size of all images must be less than or equal to 10MB"
      );
      setLoading(false);
      return;
    }
    let PackagesToBeAdded = packages;
    if (packages.length === 1) {
      if (
        !packages[0].Name &&
        !packages[0].num_sessions &&
        !packages[0].Price
      ) {
        PackagesToBeAdded = [];
      } else if (
        !packages[0].Name ||
        !packages[0].num_sessions ||
        !packages[0].Price
      ) {
        toast.error("Please fill all package fields");
        setLoading(false);
        return;
      }
    } else if (packages.length > 0) {
      for (let pkg of packages) {
        if (!pkg.Name || !pkg.num_sessions || !pkg.Price) {
          toast.error("Please fill all package fields");
          setLoading(false);
          return;
        }
      }
    }

    setLoading(true);
    try {
      let imagesURL = [];

      // Add initial class document to Firestore
      const addingClass = await addDoc(collection(db, "classes"), {
        ...form,
        Images: imagesURL,
        classCreator: user?.uid,
        Packages: PackagesToBeAdded,
        createdAt: serverTimestamp(),
      });

      // Upload images and get URLs in order
      const uploadPromises = form.Images.map((img, index) => {
        const fileName = `${
          Math.floor(Math.random() * (9999999 - 1000000 + 1) + 1000000) +
          "-" +
          img.name
        }`;
        const fileRef = ref(storage, `images/${fileName}`);
        return uploadBytes(fileRef, img).then((res) =>
          getDownloadURL(ref(storage, res.metadata.fullPath))
        );
      });

      // Wait for all uploads to complete
      imagesURL = await Promise.all(uploadPromises);

      // Update the class document with ordered URLs
      await updateDoc(doc(db, "classes", addingClass.id), {
        Images: imagesURL,
      });

      // Reset form
      setForm({
        Name: "",
        Category: "",
        SubCategory: "",
        Address: "",
        Price: "",
        Pricing: "",
        Mode: "Offline",
        Images: [],
        About: "",
        Experience: "",
        Description: "",
        FunFact: "",
        TopRated: false,
        classCreator: "",
        groupPrice: "",
        groupSize: "",
        status: "pending",
        firstFree: false,
      });
      setPackages([
        {
          Name: "",
          Price: 0,
          num_sessions: 0,
          Discount: 0,
        },
      ]);
      setPreviewImages([]);
      setUploadedFiles([]);

      // Check if user came from instructor onboarding
      if (router.query.from === "instructor-onboarding") {
        router.push("/instructor-onboarding");
      } else {
        router.push("/confirmClass/" + addingClass.id);
      }

      toast.success("Class Added");
    } catch (error) {
      console.error("Error adding class:", error);
      toast.error("Failed to add class. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [packages, setPackages] = useState([
    {
      Name: "",
      Price: 0,
      num_sessions: 0,
      Discount: 0,
    },
  ]);

  const addNewPackage = (e) => {
    e.preventDefault();
    setPackages([
      ...packages,
      {
        Name: "",
        Price: 0,
        num_sessions: 0,
        Discount: 0,
      },
    ]);
  };

  const RemoveImg = (e, name) => {
    e.preventDefault();
    e.stopPropagation();

    // Immediately update all three states
    const filteredImages = previewImages.filter((img) => img.name !== name);
    const filteredFiles = uploadedFiles.filter((file) => file.name !== name);

    setPreviewImages(filteredImages);
    setUploadedFiles(filteredFiles);
    setForm((prev) => ({
      ...prev,
      Images: filteredFiles,
    }));
  };

  const onDrop = async (acceptedFiles) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const previews = acceptedFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            src: reader.result,
            name: file.name,
            type: file.type,
          });
        reader.readAsDataURL(file);
      });
    });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    Promise.all(previews).then((dataURLs) =>
      setPreviewImages((prev) => [...prev, ...dataURLs])
    );
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const compressedFiles = await Promise.all(
      acceptedFiles.map(async (file) => {
        if (file.type.startsWith("image/")) {
          try {
            const compressed = await imageCompression(file, {
              maxSizeMB: 1, // Compress to under 1MB (adjust as needed)
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            return compressed;
          } catch (err) {
            console.error("Image compression failed:", err);
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            return file; // fallback
          }
        } else {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          return file; // No compression for videos
        }
      })
    );

    setUploadedFiles((prev) => [...prev, ...compressedFiles]);
    setForm((prevForm) => ({
      ...prevForm,
      Images: [...prevForm.Images, ...compressedFiles],
    }));
  };

  useEffect(() => {
    if (form.Images.length > 0) {
      setImageError(null); // Clear error if images are present
    }
    const totalSize = form.Images.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      // 10MB
      setImageError(
        "Total size of all images must be less than or equal to 10MB"
      );
      setLoading(false);
      return;
    }
  }, [form.Images]);

  useEffect(() => {
    if (form.Address) {
      setAddressError(null); // Clear error if address is present
    }
  }, [form.Address]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": [],
    },
    multiple: true,
  });
  const formatDate = () => {
    const today = new Date();
    const options = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    let dateString = today.toLocaleDateString("en-US", options);
    dateString = dateString.replace(/(\d+), (\d+)/, "$1 $2");

    return dateString;
  };

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, userLoading] = useAuthState(auth);
  const [showMap, setShowMap] = useState(false);
  const handleCoordinates = (lng, lat, address) => {
    setForm({ ...form, latitude: lat, longitude: lng, Address: address });
  };

  let images = [];
  let imagesURL = [];
  const goToMainPage = () => router.push("/");

  useEffect(() => {
    if (!userLoading && !user) goToMainPage();
  }, [userLoading, user]);

  const SortableImage = ({ image, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({
        id: image.name,
      });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    console.log(image);
    const isImage = image.type?.startsWith("image");

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative touch-none"
        {...attributes} // only structural attributes
      >
        <button
          type="button"
          className="text-logo-red absolute top-2 right-2 z-50"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e, image.name);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="#e73f2b"
            viewBox="0 0 30 30"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 mr-1"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M 14.984375 2.4863281 A 1.0001 1.0001 0 0 0 14 3.5 L 14 4 L 8.5 4 A 1.0001 1.0001 0 0 0 7.4863281 5 L 6 5 A 1.0001 1.0001 0 1 0 6 7 L 24 7 A 1.0001 1.0001 0 1 0 24 5 L 22.513672 5 A 1.0001 1.0001 0 0 0 21.5 4 L 16 4 L 16 3.5 A 1.0001 1.0001 0 0 0 14.984375 2.4863281 z M 6 9 L 7.7929688 24.234375 C 7.9109687 25.241375 8.7633438 26 9.7773438 26 L 20.222656 26 C 21.236656 26 22.088031 25.241375 22.207031 24.234375 L 24 9 L 6 9 z"
            ></path>
          </svg>
        </button>
        {isImage ? (
          <img
            src={image.src}
            alt={`Preview ${image.name}`}
            className="w-full h-48 object-cover rounded-lg border"
          />
        ) : (
          <video src={image.src} className="object-cover w-full h-48" />
        )}

        <div
          {...listeners}
          className="absolute bottom-0 h-full w-full px-2 py-1 rounded shadow cursor-grab z-10"
        ></div>
      </div>
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = previewImages.findIndex((img) => img.name === active.id);
      const newIndex = previewImages.findIndex((img) => img.name === over.id);

      const newPreviewImages = arrayMove(previewImages, oldIndex, newIndex);
      setPreviewImages(newPreviewImages);

      const newUploadedFiles = newPreviewImages
        .map((item) => uploadedFiles.find((file) => file.name === item.name))
        .filter(Boolean);
      setUploadedFiles(newUploadedFiles);

      setForm((prev) => ({
        ...prev,
        Images: newUploadedFiles,
      }));
      setPreviewImages(newPreviewImages);
    }
  };

  return userLoading || !user ? (
    <section className="flex justify-center items-center min-h-[100vh]">
      <Image
        priority={true}
        src="/Rolling-1s-200px.svg"
        width={"60px"}
        height={"60px"}
        alt="Loading"
      />
    </section>
  ) : (
    <div className="mx-auto">
      <Head>
        <title>Create Class</title>
        <meta name="Create Class" content="Create A Class To Teach Students" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>
      <div className="max-w-7xl mx-auto px-6 py-6  min-h-[80vh]  md:px-16">
        <h1 className="text-4xl font-extrabold text-center py-5 pb-3">
          Create Your Class
        </h1>
        <div>
          <p className="text-center text-gray-500 pb-5 text-lg">
            {" "}
            {formatDate()}.{" "}
            <button
              className="text-logo-red"
              onClick={() => setShowModal(true)}
            >
              Watch Guide
            </button>
          </p>
        </div>

        <div className="formContainer mt-10">
          <form
            onSubmit={addClass}
            className="flex gap-6 flex-col justify-center items-center"
          >
            {/* <div className="text-3xl w-full max-w-[750px] font-bold">
              About Class
            </div> */}
            <div className="w-full flex flex-row gap-4 max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Class Name</label>
                <input
                  name="className"
                  type="text"
                  placeholder="e.g., Beginner Tennis for Adults"
                  onBlur={formik.handleBlur}
                  value={form.Name}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, Name: e.target.value });
                  }}
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                />
                {formik.touched.className && formik.errors.className && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.className}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-row gap-4 flex-wrap w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Category</label>
                <select
                  required
                  name="category"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  value={form.Category}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, Category: e.target.value });
                  }}
                >
                  <option value="">Select Category</option>
                  {categories &&
                    categories.length > 0 &&
                    categories.map((category, id) => (
                      <option key={id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                </select>
                {formik.touched.category && formik.errors.category && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.category}
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <label className="text-lg font-bold">Sub Category</label>
                <select
                  required
                  name="subCategory"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  value={form.SubCategory}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, SubCategory: e.target.value });
                  }}
                >
                  <option value="">Select Sub Category</option>
                  {categories &&
                    categories.length > 0 &&
                    categories
                      .find((category) => category.name === form.Category)
                      ?.subCategories.map((subCategory, id) => (
                        <option key={id} value={subCategory.name}>
                          {subCategory.name}
                        </option>
                      ))}
                </select>
                {formik.touched.sub_category && formik.errors.sub_category && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.sub_category}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Mode of Class</label>
                <select
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  value={form.Mode}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, Mode: e.target.value });
                  }}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">In Person</option>
                </select>
                {formik.touched.mode_of_class &&
                  formik.errors.mode_of_class && (
                    <div className="text-red-500 text-sm">
                      {formik.errors.mode_of_class}
                    </div>
                  )}
              </div>
            </div>
            <div>
              <div className="flex flex-row gap-4 w-full max-w-[750px]">
                <div className="flex-grow">
                  <label className="text-lg font-bold">Enable a first free class</label>
                </div>
                <div className="flex items-center">
                  {/* Create a newtoggle here */}
                  <Switch
                    checked={form.firstFree}
                    onChange={(checked) => {
                      formik.setFieldValue("firstFree", checked);
                      setForm({ ...form, firstFree: checked });
                    }}
                    style={{
                      backgroundColor: form.firstFree ? "#E63F2B" : undefined,
                    }}
                    className={`${
                      form.firstFree ? "bg-logo-red" : "bg-gray-200"
                    } relative flex  items-center rounded-full w-11`}
                  >
                    <span className="sr-only">Enable a first free class</span>
                    <span
                      className={`${
                        form.firstFree ? "translate-x-6" : "translate-x-1"
                      } inline-block w-4 h-4 transform bg-white rounded-full transition`}
                    />
                  </Switch>
                </div>
              </div>
              {/* Description of first class free here */}
              <div className="gap-4 text-justify w-full max-w-[750px] text-gray-500 text-sm mt-1">
                Let new students experience your class risk-free! By enabling
                “First Class Free,” you’ll attract more first-time students and
                convert curious browsers into long-term learners. This offer
                only applies to new students booking with you for the first time.
                <br />
                <b>Pro Tip:</b> Instructors who offer a free trial typically see
                2x higher conversion and increased return bookings.
                </div>
            </div>
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Description</label>
                <textarea
                  required
                  name="description"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="Write a brief overview of your class. Highlight what students will learn, the skills they'll develop, or the unique value your class offers. e.g., Learn the basics of tennis, including forehand, backhand, and serving techniques, in a fun and supportive environment."
                  type={"text"}
                  value={form.Description}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, Description: e.target.value });
                  }}
                />
                {formik.touched.description && formik.errors.description && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Price Per Session</label>
                <input
                  required
                  name="price"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="e.g., $50"
                  type={"number"}
                  value={form.Price}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, Price: e.target.value });
                  }}
                />
                {formik.touched.price && formik.errors.price && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.price}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Pricing Description</label>
                <textarea
                  required
                  name="pricing"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="Provide additional pricing details if applicable. e.g., Discounts for group sessions or bulk bookings."
                  value={form.Pricing}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, Pricing: e.target.value });
                  }}
                />
                {formik.touched.pricing && formik.errors.pricing && (
                  <div className="text-red-500 text-sm">
                    {formik.errors.pricing}
                  </div>
                )}
              </div>
            </div>
            <div className="w-full max-w-[750px]">
              <div className="text-lg font-bold w-full pb-1">Media</div>
              <div className="text-base text-gray-500  w-full pb-6">
                Upload high-quality media of your class setup or teaching
                environment. Studies show that engaging visuals can
                significantly enhance student interest and enrollment. <br></br>
                <br></br>
                <b>Pro Tip:</b> Use bright, clear media that highlight the
                unique aspects of your class to attract more students.
              </div>
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-gray-400 rounded-xl p-5 w-full flex flex-col items-center justify-center cursor-pointer hover:border-logo-red"
              >
                <input {...getInputProps()} />
                <div className="flex flex-col py-6 items-center">
                  <img src="/assets/imageUpload.svg" alt="Upload Image" />
                  <p className="text-gray-500 text-base mt-2">
                    {isDragActive
                      ? "Drop the files here"
                      : "Click to upload files or Drag & Drop"}
                  </p>
                  <p className="text-gray-500 text-base">files(10MB max)</p>
                </div>
              </div>
              {imageError && (
                <div className="text-red-500 text-sm">{imageError}</div>
              )}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={previewImages.map((img) => img.name)}
                strategy={rectSortingStrategy}
              >
                <div className="grid md:grid-cols-2 grid-cols-1 w-full max-w-[750px] gap-4 mt-4">
                  {previewImages.map((preview) => (
                    <SortableImage
                      key={preview.name}
                      image={preview}
                      onRemove={RemoveImg}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">
                  Experience (Optional)
                </label>
                <textarea
                  required
                  name="experience"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="Share your teaching or professional experience in this field. e.g., 5+ years as a professional tennis coach with certifications from the National Tennis Association."
                  value={form.Experience}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, Experience: e.target.value });
                  }}
                />
              </div>
            </div>
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">About (Optional)</label>
                <textarea
                  required
                  name="about"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="Introduce yourself to potential students. Share your background, qualifications, and passion for teaching. e.g., I'm a certified tennis coach who loves helping beginners find their rhythm and passion for the sport!"
                  value={form.About}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, About: e.target.value });
                  }}
                />
              </div>
            </div>
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Fun Fact (Optional)</label>
                <textarea
                  required
                  name="funfact"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="Share a fun or interesting fact about yourself! e.g., I once coached a player who went on to compete nationally!"
                  value={form.FunFact}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, FunFact: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="w-full max-w-[750px]">
              <div className="text-xl font-bold mb-4">Location of Lesson</div>
              <LocationMap
                onLocationSelect={({ address, latitude, longitude }) => {
                  setForm((prev) => ({
                    ...prev,
                    Address: address,
                    latitude: latitude,
                    longitude: longitude,
                  }));
                }}
              />
              <div className="mt-4">
                <label className="text-m font-bold">Selected Address</label>
                <input
                  name="address"
                  readOnly
                  onBlur={formik.handleBlur}
                  value={form.Address}
                  onChange={(e) => {
                    formik.handleChange(e);
                  }}
                  className="w-full border-0 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                />
                {addressError && (
                  <div className="text-red-500 text-sm">{addressError}</div>
                )}
              </div>
            </div>
            <ToggleSwitch form={form} setForm={setForm} formik={formik} />
            <div className="w-full max-w-[750px] mt-4 flex flex-wrap gap-2 justify-between items-center">
              <div>
                <div className="text-xl font-bold">Create a Package</div>
                <div className="text-sm text-gray-400 mt-1 font-medium">
                  <b>Optional:</b> Packages encourage students to commit and
                  enable lasting relationships.
                </div>
              </div>
              <button
                onClick={addNewPackage}
                className="bg-logo-red text-white px-4 py-2 rounded-full flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Add Package
              </button>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-[750px]">
              {packages &&
                packages.map((pkg, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-6 rounded-3xl border-gray-200 p-5 px-6 border-[1px] "
                  >
                    <div>
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setPackages((prev) =>
                              prev.filter((_, i) => i !== idx)
                            );
                          }}
                          className="text-sm text-red-500 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                      <div>
                        <label className="text-lg font-bold">Name</label>
                        <input
                          required
                          name={`Name-${idx}`}
                          className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                          placeholder="e.g., Tennis Starter Pack"
                          type={"text"}
                          value={pkg.Name}
                          onChange={(e) =>
                            setPackages((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, Name: e.target.value } : p
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-lg font-bold">
                        Number of Sessions
                      </label>
                      <input
                        required
                        name={`sessions-${idx}`}
                        className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                        placeholder="Number of Sessions in package"
                        type={"text"}
                        value={pkg.num_sessions}
                        onChange={(e) =>
                          setPackages((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? { ...p, num_sessions: e.target.value }
                                : p
                            )
                          )
                        }
                      />
                    </div>
                    <div className="bg-gray-400 h-[1px]"></div>
                    <div className="flex flex-col gap-4">
                      <label className="text-lg font-bold">Total Price</label>
                      <div className="flex flex-wrap flex-row justify-between items-center">
                        <label className="text-base font-bold">
                          Price of complete package
                        </label>
                        <input
                          required
                          name={`price-${idx}`}
                          className="border-2 text-center md:w-auto w-full border-gray-100 text-base rounded-xl p-1 px-4 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                          placeholder="Price"
                          type={"number"}
                          value={pkg.Price}
                          onChange={(e) =>
                            setPackages((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, Price: e.target.value } : p
                              )
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-row flex-wrap justify-between items-center">
                        <label className="text-base font-bold">
                          Discount Percentage
                        </label>
                        <input
                          required
                          name={`discount-${idx}`}
                          className="border-2 text-center md:w-auto w-full border-gray-100 text-base rounded-xl p-1 px-4 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                          placeholder="Discount"
                          type={"number"}
                          value={pkg.Discount}
                          onChange={(e) =>
                            setPackages((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? { ...p, Discount: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-row justify-between items-center">
                        <label className="text-lg font-bold">
                          Package Price
                        </label>
                        <label className="text-lg font-bold">
                          $ {pkg.Price - (pkg.Price * pkg.Discount) / 100}
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="flex flex-row gap-4 w-full mb-4 max-w-[750px]">
              <button
                onClick={addClass}
                disabled={loading}
                type="submit"
                className="bg-logo-red text-white px-8 py-2 rounded-full flex items-center"
              >
                {loading ? (
                  <Image
                    src="/Rolling-1s-200px.svg"
                    width={"20px"}
                    height={"20px"}
                    alt="Loading"
                  />
                ) : (
                  "Create Class"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <VideoPlayer
        isOpen={showModal}
        onClose={setShowModal}
        videoSrc={"/tutorials/Step2.mp4"}
        title={"Create Class Tutorial"}
      />

      <Footer />
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
  );
}
