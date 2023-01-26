import Head from "next/head";
import Image from "next/image";
import Banner from "../components/Banner";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LargeCard from "../components/LargeCard";
import MediumCard from "../components/MediumCard";
import SmallCard from "../components/SmallCard";
import styles from "../styles/Home.module.css";
import { db } from "../firebaseConfig";
import { collection, getDocs, query } from "firebase/firestore";
import { Router } from "next/router";

export default function Home({ exploreData, cardsData }) {
  const uniqueCategory = [];
  const featuredClasses = cardsData.slice(0, 5);
  exploreData.map((item) => {
    var findItem = uniqueCategory.find((x) => x.type === item.type);
    if (!findItem) uniqueCategory.push(item);
  });

  return (
    <div className="">
      <Head>
        <title>pocketclass</title>
        <meta name="pocketclass" content="All the extracurriculars in your fingertips!" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>
      {/* header */}
      <Header />
      {/* banner */}
      <Banner />

      <main className="max-w-7xl mx-auto px-8 py-8 sm:px-16">
        <section>
          <h2 className="text-4xl font-semibold py-5">
            Explore Classes Nearby
          </h2>
          {/* APIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {uniqueCategory?.map(
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

                <SmallCard
                  key={id}
                  id={id}
                  img={images[0]}
                  type={type}
                  category={category}
                />
              )
            )}
          </div>
        </section>

        <section>
          <h2 className="text-4xl font-semibold py-8 pb-5">Featured Classes</h2>
          <div className="flex space-x-3 overflow-scroll scrollbar-hide p-3">
            {featuredClasses?.map(
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
                <MediumCard
                  key={id}
                  id={id}
                  name={name}
                  img={images[0]}
                  type={type}
                  description={description}
                  ratings={ratings}
                  address={address}
                  price={price}
                  category={category}
                />
              )
            )}
          </div>
        </section>

        <section>
          <LargeCard
            img="https://links.papareact.com/4cj"
            title="Become an Instructor"
            description="Teach your Passion"
            buttonText="I'm Interested"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}

export async function getServerSideProps() {
  var exploreData = [];
  var cardsData = [];

  const q = query(collection(db, "classes"));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
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
    exploreData.push(dataObj);
    cardsData.push(dataObj);
  });

  return {
    props: {
      exploreData,
      cardsData,
    },
  };
}
