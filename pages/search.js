import { useRouter } from "next/router";
import React, { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { format } from "date-fns";
import InfoCard from "../components/InfoCard";
import Mapper from "../components/Mapper";
import style from '../styles/Search.module.css';
import { db } from "../firebaseConfig";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useEffect } from "react";



function Search({ searchResults }) {
    const router = useRouter();
    const { searchInput, startDate, endDate, noOfGuests } = router.query;
    const formattedStartDate = format(new Date(startDate), "dd MMMM yy");
    const formattedEndDate = format(new Date(endDate), "dd MMMM yy");
    const range = `${formattedStartDate} to ${formattedEndDate}`;
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(false)



    useEffect(() => {
        setLoading(true)
        return onSnapshot(collection(db, "Reviews"), (snapshot) => {
            setReviews(snapshot.docs.map((doc) => [{ ...doc.data(), "id": doc.id }]))
            setLoading(false)
        })
    }, [])

    return (
        <div>
            <Header placeholder={`${searchInput} | ${range} | ${noOfGuests} guests`} />

            <main className={`flex ${style.wrapper}`}>
                <section className={`w-full pt-14 px-6 ${style.cardContainer}`}>
                    <p className="text-xs text-gray-500">
                        300+ Classes | {range} - for {noOfGuests} student(s)
                    </p>
                    <h1 className="text-3xl font-semibold mt-2 mb-6">
                        "{searchInput}" Classes
                    </h1>

                    <div className="hidden md:inline-flex mb-5 space-x-3 text-gray-800 whitespace-nowrap">
                        <p className="px-4 py-2 shadow-lg border rounded-full cursor-pointer hover: shadow-lg active:scale-95 active:bg-gray-100 transition transform duration-100 ease-out">Class categories</p>
                        <p className="px-4 py-2 shadow-lg border rounded-full cursor-pointer hover: shadow-lg active:scale-95 active:bg-gray-100 transition transform duration-100 ease-out">Price</p>
                        <p className="px-4 py-2 shadow-lg border rounded-full cursor-pointer hover: shadow-lg active:scale-95 active:bg-gray-100 transition transform duration-100 ease-out">More filters</p>
                    </div>

                    {
                        !loading ?
                            <div className="flex flex-col w-[full]">
                                {
                                    searchResults.length !== 0 ?
                                        searchResults?.map(
                                            ({
                                                id,
                                                type,
                                                latitude,
                                                name,
                                                images,
                                                description,
                                                longitude,
                                                ratings,
                                                address,
                                                price,
                                                category
                                            }) => (
                                                <InfoCard
                                                    key={id} // should have an id
                                                    id={id}
                                                    type={type}
                                                    latitude={latitude}
                                                    name={name}
                                                    images={images}
                                                    description={description}
                                                    longitude={longitude}
                                                    reviews={reviews}
                                                    address={address}
                                                    price={price}
                                                    category={category}
                                                />
                                            )
                                        )
                                        :
                                        <p className='text-center  text-2xl font-bold w-full'>No Classes Found</p>
                                }
                            </div>
                            :
                            <p className='text-center mt-20 text-2xl font-bold'>Loading..</p>
                    }
                </section>

                {searchResults.length !== 0 && <section className={`hidden xl:inline-flex xl:min-w-[30%] ${style.mapContainer}`}>
                    <Mapper searchResults={searchResults} />
                </section>}
            </main>

            <Footer />
        </div>
    );
}

export default Search;

export async function getServerSideProps(context) {
    const { searchInput } = context.query;
    var searchResults = [];
    var searchData = []

    if (searchInput !== "all") {
        let q = query(
            collection(db, "classes"),
            where("Type", "==", searchInput),

        );
        var querySnapshot = await getDocs(q);

    } else {
        const q = query(collection(db, "classes"));
        var querySnapshot = await getDocs(q);
    }
    if (querySnapshot.empty) {
        const q = query(collection(db, "classes"));
        var querySnapshot = await getDocs(q);

        querySnapshot.forEach(doc => {
            if (doc.data().Name.toLowerCase().includes(searchInput.toLowerCase())) {
                searchData.push(doc)
            }
        })
    } else {
        console.log("second")
        querySnapshot.forEach(doc => {
            var dataObj = {
                id: doc.id,
                type: doc.data().Type,
                name: doc.data().Name,
                images: doc.data().Images,
                description: doc.data().Description,
                address: doc.data().Address,
                location: doc.data().Location.toJSON(),
                price: doc.data().Price,
                category: doc.data().Category
            };
            searchResults.push(dataObj);
        })
    }

    if (searchData.length !== 0) {
        console.log("first")
        searchData.forEach(doc => {
            var dataObj = {
                id: doc.id,
                type: doc.data().Type,
                name: doc.data().Name,
                images: doc.data().Images,
                description: doc.data().Description,
                address: doc.data().Address,
                location: doc.data().Location.toJSON(),
                price: doc.data().Price,
                category: doc.data().Category
            };
            searchResults.push(dataObj);
        })
    }


    return {
        props: {
            searchResults,
        },
    };
}
