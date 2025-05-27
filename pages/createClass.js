"use client";

import Head from "next/head";
import Footer from "../components/Footer";
import dynamic from "next/dynamic";
import { categories } from "../utils/categories";
import { useDropzone } from "react-dropzone";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { useFormik } from 'formik';
import { classSchema } from "../Validation/createClass";
import { useRouter } from "next/router";
import { auth, db, storage } from "../firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState, useCallback } from "react";
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

const LocationMap = dynamic(() => import("../components/LocationMap"), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});
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


const SortableImage = ({ image, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isImage = image.type?.startsWith("image");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative touch-none"
      {...attributes}
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
          />
        </svg>
      </button>
      {isImage ? (
        <img
          src={image.src}
          alt={`Preview ${image.name}`}
          className="w-full h-48 object-cover rounded-lg border"
        />
      ) : (
        <video src={image.src} className="object-cover w-full h-48 rounded-lg border" />
      )}
      <div
        {...listeners}
        className="absolute bottom-0 h-full w-full px-2 py-1 rounded shadow cursor-grab z-10"
      />
    </div>
  );
};

const INITIAL_FORM_STATE = {
  Name: "",
  Category: "",
  SubCategory: "",
  Address: "",
  Price: "",
  Mode: "Offline",
  Pricing: "",
  groupSize: "",
  groupPrice: "",
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
};

const INITIAL_PACKAGE = {
  Name: "",
  Price: 0,
  num_sessions: 0,
  Discount: 0,
};

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

export default function CreateClass() {
  const router = useRouter();
  const [user, userLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [imageError, setImageError] = useState(null);
  const [addressError, setAddressError] = useState(null);
  const [packages, setPackages] = useState([{ ...INITIAL_PACKAGE }]);
  const [form, setForm] = useState({ ...INITIAL_FORM_STATE });

  const formik = useFormik({
    initialValues: {
      class_name: '',
      category: '',
      sub_category: 'Piano',
      mode_of_class: '',
      description: '',
      price: '',
      pricing: '',
      groupSize: '',
      groupPrice: '',
      experience: '',
      about: '',
      funfact: '',
      name: '',
      numberOfSessions: '',
      priceOfCompleteCourse: '',
      discount: '',
    },
    validationSchema: classSchema,
    validateOnChange: true,
    validateOnBlur: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
    }
  }, [userLoading, user, router]);

  // Validate images when they change
  useEffect(() => {
    if (form.Images.length > 0) {
      setImageError(null);
    }

    const totalSize = form.Images.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      setImageError("Total size of all images must be ≤ 10MB");
    }
  }, [form.Images]);

  // Validate address when it changes
  useEffect(() => {
    if (form.Address) {
      setAddressError(null);
    }
  }, [form.Address]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Generate previews
    const previews = await Promise.all(
      acceptedFiles.map(async (file) => {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = () => resolve({
            src: reader.result,
            name: file.name,
            type: file.type,
          });
          reader.readAsDataURL(file);
        });
      })
    );

    setPreviewImages(prev => [...prev, ...previews]);

    // Compress images
    const compressedFiles = await Promise.all(
      acceptedFiles.map(async (file) => {
        if (file.type.startsWith("image/")) {
          try {
            return await imageCompression(file, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
          } catch (err) {
            console.error("Image compression failed:", err);
            return file; // fallback
          }
        }
        return file; // No compression for videos
      })
    );

    setUploadedFiles(prev => [...prev, ...compressedFiles]);
    setForm(prev => ({
      ...prev,
      Images: [...prev.Images, ...compressedFiles],
    }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': []
    },
    multiple: true,
  });

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = previewImages.findIndex(img => img.name === active.id);
    const newIndex = previewImages.findIndex(img => img.name === over.id);

    const reorderedUploadedFiles = arrayMove(uploadedFiles, oldIndex, newIndex);
    const reorderedPreviewImages = arrayMove(previewImages, oldIndex, newIndex);

    setUploadedFiles(reorderedUploadedFiles);
    setPreviewImages(reorderedPreviewImages);
    setForm(prev => ({
      ...prev,
      Images: reorderedUploadedFiles,
    }));
  }, [previewImages, uploadedFiles]);

  const RemoveImg = useCallback((e, name) => {
    e.preventDefault();
    e.stopPropagation();

    setPreviewImages(prev => prev.filter(img => img.name !== name));
    setUploadedFiles(prev => prev.filter(file => file.name !== name));
    setForm(prev => ({
      ...prev,
      Images: prev.Images.filter(file => file.name !== name),
    }));
  }, []);

  const addNewPackage = useCallback((e) => {
    e.preventDefault();
    setPackages(prev => [...prev, { ...INITIAL_PACKAGE }]);
  }, []);

  const validateForm = useCallback(() => {
    if (
      !form.Name ||
      !form.Category ||
      !form.SubCategory ||
      !form.Price ||
      !form.Pricing ||
      !form.About ||
      !form.Experience ||
      !form.Description ||
      !form.FunFact
    ) {
      toast.error("Please fill all required fields");
      return false;
    }

    if (form.Images.length < 1) {
      setImageError("Please upload at least 1 image");
      toast.error("Please upload at least 1 image");
      return false;
    }

    if (!form.Address) {
      setAddressError("Please select a location on the map");
      toast.error("Please select a location on the map");
      return false;
    }

    const totalSize = form.Images.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      setImageError("Total size of all images must be ≤ 10MB");
      toast.error("Total size of all images must be ≤ 10MB");
      return false;
    }

    // Validate packages if any exist
    if (packages.length > 0) {
      for (let pkg of packages) {
        if (pkg.Name || pkg.num_sessions || pkg.Price) {
          if (!pkg.Name || !pkg.num_sessions || !pkg.Price) {
            toast.error("Please fill all package fields");
            return false;
          }
        }
      }
    }

    return true;
  }, [form, packages]);

  const uploadImages = useCallback(async (classId) => {
    const uploadPromises = form.Images.map((img) => {
      const fileName = `${Math.floor(Math.random() * (9999999 - 1000000 + 1) + 1000000)}-${img.name}`;
      const fileRef = ref(storage, `images/${fileName}`);
      return uploadBytes(fileRef, img)
        .then(res => getDownloadURL(ref(storage, res.metadata.fullPath)));
    });

    return await Promise.all(uploadPromises);
  }, [form.Images]);

  const addClass = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Add initial class document
      const classRef = await addDoc(collection(db, "classes"), {
        ...form,
        Images: [],
        classCreator: user?.uid,
        Packages: packages.filter(pkg =>
          pkg.Name && pkg.num_sessions && pkg.Price
        ),
        createdAt: serverTimestamp(),
      });

      // Upload images and get URLs
      const imagesURL = await uploadImages(classRef.id);

      // Update class with image URLs
      await updateDoc(doc(db, "classes", classRef.id), {
        Images: imagesURL,
      });

      // Reset form
      setForm({ ...INITIAL_FORM_STATE });
      setPackages([{ ...INITIAL_PACKAGE }]);
      setPreviewImages([]);
      setUploadedFiles([]);

      // Redirect to new class page
      router.push(`/classes/id=${classRef.id}`);
      toast.success("Class Created Successfully!");
    } catch (error) {
      console.error("Error adding class:", error);
      toast.error("Failed to add class. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [form, packages, user, router, validateForm, uploadImages]);

  if (userLoading || !user) {
    return (
      <section className="flex justify-center items-center min-h-[100vh]">
        <Image
          priority
          src="/Rolling-1s-200px.svg"
          width={60}
          height={60}
          alt="Loading"
        />
      </section>
    );
  }

  return (
    <div className="mx-auto">
      <Head>
        <title>Create Class</title>
        <meta name="description" content="Create A Class To Teach Students" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      <NewHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-[80vh]">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center py-5">
          Create Your Class
        </h1>
        <p className="text-center text-gray-500 pb-5 text-lg">
          {formatDate()}
        </p>

        <div className="formContainer mt-10">
          <form
            onSubmit={addClass}
            className="flex gap-6 flex-col justify-center items-center"
          >
            <div className="w-full max-w-[750px]">
              <label className="text-lg font-bold">Class Name</label>
              <input
                name="className"
                type="text"
                placeholder="e.g., Beginner Tennis for Adults"
                onBlur={formik.handleBlur}
                value={form.Name}
                onChange={(e) => {
                  formik.handleChange(e);
                  setForm(prev => ({ ...prev, Name: e.target.value }));
                }}
                className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
              />
              {formik.touched.className && formik.errors.className && !form.Name && (
                <div className="text-red-500 text-sm">{formik.errors.className}</div>
              )}
            </div>

            {/* Category & Subcategory */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[750px]">
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
                    setForm(prev => ({
                      ...prev,
                      Category: e.target.value,
                      SubCategory: "" // Reset subcategory when category changes
                    }));
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map((category, id) => (
                    <option key={id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {formik.touched.category && formik.errors.category && (
                  <div className="text-red-500 text-sm">{formik.errors.category}</div>
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
                    setForm(prev => ({ ...prev, SubCategory: e.target.value }));
                  }}
                  disabled={!form.Category}
                >
                  <option value="">Select Sub Category</option>
                  {categories
                    .find(category => category.name === form.Category)
                    ?.subCategories.map((subCategory, id) => (
                      <option key={id} value={subCategory.name}>
                        {subCategory.name}
                      </option>
                    ))}
                </select>
                {formik.touched.category && !(
                  categories.find((category) => category.name === form.Category)
                    ?.subCategories.some((sub) => sub.name === form.SubCategory)
                ) && (
                    <div className="text-red-500 text-sm">Please select a valid sub category</div>
                  )}
              </div>
            </div>

            {/* Mode of Class */}
            <div className="w-full max-w-[750px]">
              <label className="text-lg font-bold">Mode of Class</label>
              <select
                className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                value={form.Mode}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  formik.handleChange(e);
                  setForm(prev => ({ ...prev, Mode: e.target.value }));
                }}
              >
                <option value="Online">Online</option>
                <option value="Offline">In Person</option>
              </select>
              {formik.touched.mode_of_class && formik.errors.mode_of_class && (
                <div className="text-red-500 text-sm">{formik.errors.mode_of_class}</div>
              )}
            </div>

            {/* Description */}
            <div className="w-full max-w-[750px]">
              <label className="text-lg font-bold">Description</label>
              <textarea
                required
                name="description"
                className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                placeholder="Write a brief overview of your class. Highlight what students will learn, the skills they'll develop, or the unique value your class offers. e.g., Learn the basics of tennis, including forehand, backhand, and serving techniques, in a fun and supportive environment."
                value={form.Description}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  formik.handleChange(e);
                  setForm(prev => ({ ...prev, Description: e.target.value }));
                }}
                rows={3}
              />
              {formik.touched.description && formik.errors.description && (
                <div className="text-red-500 text-sm">{formik.errors.description}</div>
              )}
            </div>

            {/* Price */}
            <div className="w-full max-w-[750px]">
              <label className="text-lg font-bold">Price Per Session</label>
              <input
                required
                name="price"
                className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                placeholder="e.g., $50"
                type="number"
                min="0"
                step="0.01"
                value={form.Price}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  formik.handleChange(e);
                  setForm(prev => ({ ...prev, Price: e.target.value }));
                }}
              />
              {formik.touched.price && formik.errors.price && (
                <div className="text-red-500 text-sm">{formik.errors.price}</div>
              )}
            </div>

            {/* Pricing Description */}
            <div className="w-full max-w-[750px]">
              <label className="text-lg font-bold">Pricing Description</label>
              <textarea
                required
                name="Pricing"
                className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                placeholder="Provide additional pricing details if applicable. e.g., Discounts for group sessions or bulk bookings."
                value={form.Pricing}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  formik.handleChange(e);
                  setForm(prev => ({ ...prev, Pricing: e.target.value }));
                }}
                rows={2}
              />
              {formik.touched.Pricing && formik.errors.Pricing && (
                <div className="text-red-500 text-sm">{formik.errors.Pricing}</div>
              )}
            </div>

            {/* Media Upload */}
            <div className="w-full max-w-[750px]">
              <div className="text-lg font-bold">Media</div>
              <div className="text-base text-gray-500 pb-6">
                Upload high-quality media of your class setup or teaching environment. Studies show that engaging visuals can significantly enhance student interest and enrollment.
                <br /><br />
                <b>Pro Tip:</b> Use bright, clear media that highlight the unique aspects of your class to attract more students.
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

            {/* Image Gallery */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={previewImages.map(img => img.name)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 w-full max-w-[750px] gap-4 mt-4">
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

            {/* Experience */}
            <div className="w-full max-w-[750px]">
              <label className="text-lg font-bold">Experience</label>
              <textarea
                required
                name="experience"
                className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                placeholder="Share your teaching or professional experience in this field. e.g., 5+ years as a professional tennis coach with certifications from the National Tennis Association."
                value={form.Experience}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  formik.handleChange(e);
                  setForm(prev => ({ ...prev, Experience: e.target.value }));
                }}
                rows={2.5}
              />
              {formik.touched.experience && formik.errors.experience && (
                <div className="text-red-500 text-sm">{formik.errors.experience}</div>
              )}
            </div>

            {/* About */}
            <div className="w-full max-w-[750px]">
              <label className="text-lg font-bold">About</label>
              <textarea
                required
                name="about"
                className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                placeholder="Introduce yourself to potential students. Share your background, qualifications, and passion for teaching. e.g., I'm a certified tennis coach who loves helping beginners find their rhythm and passion for the sport!"
                value={form.About}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  formik.handleChange(e);
                  setForm(prev => ({ ...prev, About: e.target.value }));
                }}
                rows={3}
              />
              {formik.touched.about && formik.errors.about && (
                <div className="text-red-500 text-sm">{formik.errors.about}</div>
              )}
            </div>

            {/* Fun Fact */}
            <div className="w-full max-w-[750px]">
              <label className="text-lg font-bold">Fun Fact</label>
              <textarea
                required
                name="funfact"
                className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                placeholder="Share a fun or interesting fact about yourself! e.g., I once coached a player who went on to compete nationally!"
                value={form.FunFact}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  formik.handleChange(e);
                  setForm(prev => ({ ...prev, FunFact: e.target.value }));
                }}
                rows={2}
              />
              {formik.touched.funfact && formik.errors.funfact && (
                <div className="text-red-500 text-sm">{formik.errors.funfact}</div>
              )}
            </div>

            {/* Location */}
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
                  <b>Optional:</b> Packages encourage student commitment.
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
              {packages && packages.map((pkg, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-6 rounded-3xl border-gray-200 p-5 px-6 border-[1px]"
                >
                  <div>
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setPackages(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="text-sm text-red-500 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                    <div>
                      <label className="text-lg font-bold">Name</label>
                      <input
                        name={`Name-${idx}`}
                        className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                        placeholder="e.g., Tennis Starter Pack"
                        value={pkg.Name}
                        onChange={(e) =>
                          setPackages(prev =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, Name: e.target.value } : p
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-lg font-bold">Number of Sessions</label>
                    <input
                      name={`sessions-${idx}`}
                      className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                      placeholder="Number of Sessions"
                      type="number"
                      min="0"
                      value={pkg.num_sessions}
                      onChange={(e) =>
                        setPackages(prev =>
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
                        name={`price-${idx}`}
                        className="border-2 text-center w-full sm:w-auto border-gray-100 text-base rounded-xl p-1 px-4 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                        placeholder="Price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={pkg.Price}
                        onChange={(e) =>
                          setPackages(prev =>
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
                        className="border-2 text-center w-full sm:w-auto border-gray-100 text-base rounded-xl p-1 px-4 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                        placeholder="Discount"
                        type={"number"}
                        value={pkg.Discount}
                        onChange={(e) =>
                          setPackages((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, Discount: e.target.value } : p
                            )
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-row justify-between items-center">
                      <label className="text-lg font-bold">Package Price</label>
                      <label className="text-lg font-bold">
                        ${(pkg.Price - (pkg.Price * pkg.Discount) / 100).toFixed(2)}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="w-full max-w-[750px] mb-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-logo-red text-white px-8 py-3 rounded-full w-full sm:w-auto"
              >
                {loading ? (
                  <Image
                    src="/Rolling-1s-200px.svg"
                    width={20}
                    height={20}
                    alt="Loading"
                    className="mx-auto"
                  />
                ) : (
                  "Create Class"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

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