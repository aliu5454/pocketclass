"use client";

import Head from "next/head";
import React from "react";
import Footer from "../../components/Footer";
import dynamic from "next/dynamic";
import { categories } from "../../utils/categories";
import { useDropzone } from "react-dropzone";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { useFormik } from 'formik';
import { classSchema } from "../../Validation/createClass";
import imageCompression from "browser-image-compression";

const LocationMap = dynamic(() => import("../../components/LocationMap"), {
  ssr: false,
});

import { useRouter } from "next/router";
import { auth, db, storage } from "../../firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState, useMemo } from "react";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import NewHeader from "../../components/NewHeader";
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

const SortableImage = ({ image, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  console.log("Image src:", image.src);
  console.log("Image type:", image.type);

  const isVideo = image.type?.startsWith("video/") || 
                 (typeof image.src === 'string' && (
                   /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(image.src) ||
                   /%2F.*video/i.test(image.src) ||
                   /SampleVideo/i.test(image.src)
                 ));

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
      {isVideo ? (
        <video src={image.src} className="object-cover w-full h-48 rounded-lg border" />
      ) : (
        <img
          src={image.src}
          alt={`Preview ${image.name}`}
          className="w-full h-48 object-cover rounded-lg border"
        />
      )}
      <div
        {...listeners}
        className="absolute bottom-0 h-full w-full px-2 py-1 rounded shadow cursor-grab z-10"
      />
    </div>
  );
};

export default function UpdateClass() {
  const [form, setForm] = useState({
    Name: "",
    Category: "",
    SubCategory: "",
    Address: "",
    Price: "",
    Pricing: "",
    Images: [],
    Mode: "Offline",
    About: "",
    Experience: "",
    Description: "",
    FunFact: "",
    groupSize: "",
    groupPrice: "",
    latitude: "",
    longitude: "",
  });
  const [packages, setPackages] = useState([]);
  const [addressError, setAddressError] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [loadedImgs, setLoadedImgs] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, userLoading] = useAuthState(auth);
  const [imageError, setImageError] = useState(null);
  const stablePreviewImages = useMemo(() => previewImages, [previewImages]);

  const router = useRouter();
  const { id } = router.query;

  const formik = useFormik({
    initialValues: {
      class_name: '',
      category: '',
      sub_category: '',
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
    validationSchema: classSchema,  // Use Yup validation schema
    validateOnChange: true,  // Ensure validation happens on each change
    validateOnBlur: true,    // Ensure validation happens on blur
  });

  useEffect(() => {
    const fetchClass = async () => {
      if (id) {
        const docRef = doc(db, "classes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const classData = docSnap.data();
          setForm(classData);
          setPackages(classData.Packages || []);
          const typedImages = classData.Images.map((url) => {
            const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
            return {
              src: url,
              name: url,
              type: isVideo ? "video" : "image",
            };
          });
          setPreviewImages(typedImages);
          setLoadedImgs(classData.Images);
          console.log(typedImages)
          formik.setValues({
          class_name: classData.Name || '',
          category: classData.Category || '',
          sub_category: classData.SubCategory || '',
          mode_of_class: classData.Mode || '',
          description: classData.Description || '',
          price: classData.Price || '',
          pricing: classData.Pricing || '',
          groupSize: classData.groupSize || '',
          groupPrice: classData.groupPrice || '',
          experience: classData.Experience || '',
          about: classData.About || '',
          funfact: classData.FunFact || '',
          // Package fields if needed
        });
        } else {
          toast.error("Class not found");
          router.push("/");
        }
      }
    };
    fetchClass();
  }, [id, router]);

  const formatDate = () => {
    const date = new Date();
    return date.toDateString();
  };

  const updateClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    const docRef = doc(db, "classes", id);
    for (let pkg of packages) {
      if (!pkg.Name || !pkg.num_sessions || !pkg.Price) {
        toast.error("Please fill all package fields");
        setLoading(false);
        return;
      }
    }

    try {
      // First update with existing data and loaded images
      await updateDoc(docRef, {
        ...form,
        Images: loadedImgs,
        Packages: packages,
        updatedAt: serverTimestamp(),
      });

      // Keep track of upload promises
      const uploadPromises = uploadedFiles.map(async (img, index) => {
        const fileRef = ref(
          storage,
          `${Math.floor(Math.random() * (9999999 - 1000000 + 1) + 1000000) +
          "-" +
          img.name
          }`
        );

        const uploadResult = await uploadBytes(fileRef, img);
        const url = await getDownloadURL(
          ref(storage, uploadResult.metadata.fullPath)
        );
        return url;
      });

      // Wait for all uploads to complete
      const newImageUrls = await Promise.all(uploadPromises);

      // Get the final image order from previewImages
      const finalImageOrder = previewImages
        .map((img) => {
          if (loadedImgs.includes(img.src)) {
            return img.src; // Return URL for previously loaded images
          } else {
            // Find the corresponding new URL for uploaded files
            const fileIndex = uploadedFiles.findIndex(
              (file) => file.name === img.name
            );
            return fileIndex !== -1 ? newImageUrls[fileIndex] : null;
          }
        })
        .filter(Boolean);

      // Update with final image order
      await updateDoc(docRef, {
        Images: finalImageOrder,
      });

      toast.success("Class updated successfully");
      router.push("/");
    } catch (err) {
      console.error(err);
      toast.error("Error updating class");
    }
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      previewImages.forEach(img => {
        if (img.src.startsWith("blob:")) {
          URL.revokeObjectURL(img.src);
        }
      });
    };
  }, [previewImages]);

  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    onDrop: (acceptedFiles) => {
      const newPreviews = acceptedFiles.map((file) => {
        const existing = uploadedFiles.find((f) => f.name === file.name);
        if (existing) return null;

        return {
          src: URL.createObjectURL(file),
          name: file.name,
          type: file.type,
          file,
        };
      }).filter(Boolean);

      setUploadedFiles((prev) => [...prev, ...acceptedFiles]);
      setPreviewImages((prev) => [...prev, ...newPreviews]);
    },
    accept: {
      'image/*': [],
      'video/*': []
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true,
    onDropRejected: (fileRejections) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          switch (error.code) {
            case "file-too-large":
              toast.error(`${file.name} is too large. Max size is 5MB`);
              break;
            case "file-invalid-type":
              toast.error(`${file.name} is not a supported image format`);
              break;
            default:
              toast.error(`Error uploading ${file.name}: ${error.message}`);
          }
        });
      });
    },
  });

  const RemoveImg = (e, identifier) => {
    e.preventDefault();
    e.stopPropagation();
    const isLoadedImage = loadedImgs.includes(identifier);

    if (isLoadedImage) {
      setLoadedImgs(loadedImgs.filter((img) => img !== identifier));
    } else {
      setUploadedFiles(
        uploadedFiles.filter((file) => file.name !== identifier)
      );
    }
    setPreviewImages(
      previewImages.filter((img) => (img.name || img.src) !== identifier)
    );
    setForm((prev) => ({
      ...prev,
      Images: isLoadedImage
        ? prev.Images.filter((img) => img !== identifier)
        : prev.Images.filter((file) => file.name !== identifier),
    }));
  };

  const handleInputChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCoordinates = (lng, lat, address) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      Address: address,
    }));
  };

  useEffect(() => {
    if (form.Images.length > 0) {
      setImageError(null); // Clear error if images are present
    }
    const totalSize = form.Images.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) { // 10MB
      setImageError("Total size of all images must be less than or equal to 10MB");
      setLoading(false);
      return;
    }
  }, [form.Images]);

  const addNewPackage = (e) => {
    e.preventDefault();
    setPackages([
      ...packages,
      { Name: "", Price: 0, num_sessions: 0, Discount: 0 },
    ]);
  };

  const removePackage = (index) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const inputStyle =
    "border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = previewImages.findIndex(
        (img) => (img.name || img.src) === active.id
      );
      const newIndex = previewImages.findIndex(
        (img) => (img.name || img.src) === over.id
      );

      const newPreviewImages = arrayMove(previewImages, oldIndex, newIndex);
      setPreviewImages(newPreviewImages);

      // Update loadedImgs order
      const newLoadedImgs = newPreviewImages
        .filter((img) => loadedImgs.includes(img.src))
        .map((img) => img.src);
      setLoadedImgs(newLoadedImgs);

      // Update uploadedFiles order
      const newUploadedFiles = newPreviewImages
        .filter((img) => uploadedFiles.some((file) => file.name === img.name))
        .map((img) => uploadedFiles.find((file) => file.name === img.name))
        .filter(Boolean);
      setUploadedFiles(newUploadedFiles);
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
        <title>Update Class</title>
        <meta name="Update Class" content="Update A Class To Teach Students" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>
      <NewHeader />
      <div className="max-w-7xl mx-auto px-6 py-6  min-h-[80vh]  md:px-16">
        <h1 className="text-4xl font-extrabold text-center py-5 pb-3">
          Edit this Class
        </h1>
        <div>
          <p className="text-center text-gray-500 pb-5 text-lg">
            {" "}
            {formatDate()}{" "}
          </p>
        </div>

        <div className="formContainer mt-10">
          <form className="flex gap-6 flex-col justify-center items-center">
            {/* <div className="text-3xl w-full max-w-[750px] font-bold">
              About Class
            </div> */}
            <div className="w-full flex flex-row gap-4 max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Class Name</label>
                <input
                  required
                  name="className"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="e.g., Beginner Tennis for Adults"
                  type={"text"}
                  value={form.Name}
                  onBlur={formik.handleBlur}
                  onChange={(e) => {
                    formik.handleChange(e);
                    setForm({ ...form, Name: e.target.value })
                  }}
                />
                {!form.Name && (
                  <div className="text-red-500 text-sm">{formik.errors.className}</div>
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
                    setForm({ ...form, Category: e.target.value })
                  }
                  }
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
                {!(
                  categories.find((category) => category.name === form.Category)
                ) && (
                    <div className="text-red-500 text-sm">Invalid Category selected</div>
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
                    setForm({ ...form, SubCategory: e.target.value })
                  }
                  }
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
                {!(
                  categories.find((category) => category.name === form.Category)
                    ?.subCategories.some((sub) => sub.name === form.SubCategory)
                ) && (
                    <div className="text-red-500 text-sm">Invalid Sub Category selected</div>
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
                    setForm({ ...form, Mode: e.target.value })
                  }}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">In Person</option>
                </select>
                {formik.touched.mode_of_class && formik.errors.mode_of_class && (
                  <div className="text-red-500 text-sm">{formik.errors.mode_of_class}</div>
                )}
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
                    setForm({ ...form, Description: e.target.value })
                  }
                  }
                />
                {((formik.touched.description && formik.errors.description) || !form.Description || form.Description.trim() === "") && (
                  <div className="text-red-500 text-sm">Description is required</div>
                )}
              </div>
            </div>
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Price Per Hour</label>
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
                    setForm({ ...form, Price: e.target.value })
                  }}
                />
                {(formik.touched.price && formik.errors.price) || !/^\d+$/.test(form.Price) ? (
                  <div className="text-red-500 text-sm">
                    {formik.errors.price || "Price must be a single amount"}
                  </div>
                ) : null}
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
                    setForm({ ...form, Pricing: e.target.value })
                  }
                  }
                />
                {formik.touched.pricing && formik.errors.pricing && (
                  <div className="text-red-500 text-sm">{formik.errors.pricing}</div>
                )}
                {((formik.touched.pricing && formik.errors.pricing) || !form.Pricing || form.Pricing.trim() === "") && (
                  <div className="text-red-500 text-sm">Pricing description is required</div>
                )}
              </div>
            </div>
            {/* <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
                <label className="text-lg font-bold">Max Group Size</label>
                <input
                  required
                  name="groupSize"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="e.g., 2-4"
                  type={"number"}
                  value={form.groupSize}
                  onChange={(e) =>
                    setForm({ ...form, groupSize: e.target.value })
                  }
                />
              </div>

              <div className="flex-grow">
                <label className="text-lg font-bold">
                  Group Price Per Person
                </label>
                <input
                  required
                  name="groupPrice"
                  className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                  placeholder="e.g., $30"
                  type={"number"}
                  value={form.groupPrice}
                  onChange={(e) =>
                    setForm({ ...form, groupPrice: e.target.value })
                  }
                />
              </div>
            </div> */}
            <div className="w-full max-w-[750px]">
              <div className="text-lg font-bold w-full pb-1">Images</div>
              <div className="text-base text-gray-500  w-full pb-6">
                Upload high-quality images of your class setup or teaching
                environment. Studies show that engaging visuals can
                significantly enhance student interest and enrollment. <br></br>
                <br></br>
                <b>Pro Tip:</b> Use bright, clear photos that highlight the
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
                    Click to upload files or Drag & Drop
                  </p>
                  <p className="text-gray-500 text-base">
                    files(10MB max)
                  </p>
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
                items={stablePreviewImages.map((img) => img.name || img.src)}
                strategy={rectSortingStrategy}
              >
                <div className="grid md:grid-cols-2 grid-cols-1 w-full max-w-[750px] gap-4 mt-4 ">
                  {stablePreviewImages.map((preview) => (
                    <SortableImage
                      key={preview.name || preview.src}
                      image={preview}
                      onRemove={RemoveImg}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {/* <div className="text-xl w-full max-w-[750px] font-bold">
              About Instructor
            </div> */}
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
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
                    setForm({ ...form, Experience: e.target.value })
                  }
                  }
                />
                {((formik.touched.Experience && formik.errors.Experience) || !form.Experience || form.Experience.trim() === "") && (
                  <div className="text-red-500 text-sm">Experience is required</div>
                )}
              </div>
            </div>
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
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
                    setForm({ ...form, About: e.target.value })
                  }}
                />
                {((formik.touched.about && formik.errors.about) || !form.About || form.About.trim() === "") && (
                  <div className="text-red-500 text-sm">About is required</div>
                )}
              </div>
            </div>
            <div className="flex flex-row gap-4 w-full max-w-[750px]">
              <div className="flex-grow">
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
                    setForm({ ...form, FunFact: e.target.value })
                  }
                  }
                />
                {/* {formik.touched.funfact && formik.errors.funfact && (
                  <div className="text-red-500 text-sm">{formik.errors.funfact}</div>
                )} */}
                {((formik.touched.funfact && formik.errors.funfact) || !form.FunFact || form.FunFact.trim() === "") && (
                  <div className="text-red-500 text-sm">Fun Fact is required</div>
                )}
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
                  readOnly
                  value={form.Address}
                  className="w-full border-0 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
                />
                {addressError && (
                  <div className="text-red-500 text-sm">{addressError}</div>
                )}
              </div>
            </div>
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
              {packages.map((pkg, idx) => (
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
                              i === idx ? { ...p, Discount: e.target.value } : p
                            )
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-row justify-between items-center">
                      <label className="text-lg font-bold">Package Price</label>
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
                onClick={updateClass}
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
                  "Update Class"
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
