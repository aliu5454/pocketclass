import { useRouter } from 'next/router';
import React from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import {format} from 'date-fns';
import InfoCard from '../components/InfoCard';
import Mapper from '../components/Mapper';

function Search({searchResults}) {
    const router = useRouter();
    const {location, startDate, endDate, noOfGuests} = router.query;
    const formattedStartDate = format(new Date(startDate),'dd MMMM yy');
    const formattedEndDate = format(new Date(endDate),'dd MMMM yy');
    const range = `${formattedStartDate} to ${formattedEndDate}`;
  return (
    <div>
        <Header placeholder ={`${location} | ${range} | ${noOfGuests} guests`}/>

        <main className='flex'>
            <section className='flex-grow pt-14 px-6'>
                <p className='text-xs text-gray-500'>300+ Classes | {range} - for {noOfGuests} student(s)</p>
                <h1 className='text-3xl font-semibold mt-2 mb-6'>"{location}" Classes</h1>

                <div className='hidden md:inline-flex mb-5 space-x-3 text-gray-800 whitespace-nowrap'>
                    <p className='button'>Class categories</p>
                    <p className='button'>Price</p>
                    <p className='button'>More filters</p>
                </div>

                <div className='flex flex-col'>
                    {searchResults?.map(({img, location, title, description, star, price, total}) => (
                        <InfoCard 
                        key={img} // should have an id
                        img={img}
                        location={location}
                        title={title}
                        description={description}
                        star={star}
                        price={price}
                        total={total}
                        />
                        )
                    )}
                </div>
            </section>

            <section className='hidden xl:inline-flex xl:min-w-[600px]'>
                <Mapper />
            </section>
        </main>

        <Footer />
    </div>
  )
}

export default Search;

export async function getServerSideProps() {
    const searchResults = await fetch('https://links.papareact.com/isz').then(res => res.json());

    return {
        props: {
            searchResults,
        }
    }
}