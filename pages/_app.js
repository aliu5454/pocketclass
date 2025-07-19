import "../styles/globals.css";
import "../styles/classHeading.css";
import "../styles/calendar.css";
import "../styles/stickyFooter.css";
import "react-toastify/dist/ReactToastify.css";
import ProgressBar from "@badrap/bar-of-progress";
import Router from "next/router";
import Script from "next/script";
import { ToastContainer } from "react-toastify";
import NewHeader from "../components/NewHeader";
import InstructorSideBar from "../components/instructorSideBar";
import { useEffect } from "react";
import { useRouter } from "next/router";

const progress = new ProgressBar({
  size: 4,
  color: "#E73F2B",
  className: "z-50",
  delay: 100,
});

Router.events.on("routeChangeStart", progress.start);
Router.events.on("routeChangeComplete", progress.finish);
Router.events.on("routeChangeError", progress.finish);

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  useEffect(()=>{
    console.log(router.pathname)
    console.log
  },[router.asPath])
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
        rel="stylesheet"
      />

      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-HLDMXN1VRR"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-HLDMXN1VRR');
        `}
      </Script>
      <NewHeader isHome={router.pathname==="/"} />
      <div className="flex">
        <InstructorSideBar />
        <div className="flex-1 min-w-0 pb-16 lg:pb-0">
          <Component {...pageProps} />
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
    </>
  );
}

export default MyApp;
