import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { ConfirmBookingDetails } from "../../components/ConfirmCLassDetail";
import { BookingSuccess } from "../../components/ClassSuccess";
import NewHeader from "../../components/NewHeader";
import Footer from "../../components/Footer";
import Head from "next/head";

export default function PaymentSuccess() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (router.query.id) {
      setId(router.query.id);
    }
  }, [router.query.id]);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {

        if (!id) {
          console.error("Class ID is undefined.");
          return;
        }

        const docRef = doc(db, "classes", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBookingDetails(docSnap.data());
          console.log(docSnap.data());
        } else {
          console.error("No document found with the given ID.");
          setError("No class details found.");
        }
      } catch (err) {
        console.error("Error fetching class details:", err);
        setError(err.message);
      }
    };

    if (id) fetchBookingDetails();
  }, [id]);

  return (
    <div className="flex overflow-hidden relative flex-col min-h-screen bg-white">
      <Head>
        <title>Class Confirmation</title>
        <meta name="Class Confirmation" content="Your class is live." />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>
      <NewHeader />
      <div className="flex relative flex-col items-center w-full">
        <div className="absolute opacity-30 pointer-events-none bg-[40px_40px] bg-[radial-gradient(circle,#FFE4E1_2px,transparent_2px)] size-full" />
        <BookingSuccess />
        <div className="mx-0 my-12 w-full h-px bg-black bg-opacity-10 max-w-[1191px]" />
        <div className="px-16 py-0 mb-16 w-full max-w-[1183px] max-md:px-8 max-md:py-0 max-sm:px-4 max-sm:py-0">
          <div className="flex gap-14 max-md:flex-col">
            <ConfirmBookingDetails bookingDetails={bookingDetails} id={id} />
          </div>
        </div>
      </div>
      <div className='w-full'>
        <Footer />
      </div>
    </div>
  );
}
