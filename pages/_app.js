import '../styles/globals.css'
import '../styles/classHeading.css'
import 'react-toastify/dist/ReactToastify.css';
import ProgressBar from '@badrap/bar-of-progress';
import Router from 'next/router';
import { ToastContainer } from 'react-toastify';
import Script from 'next/script'

const progress = new ProgressBar({
  size: 4,
  color: '#E73F2B',
  className: 'z-50',
  delay: 100,
});

Router.events.on('routeChangeStart', progress.start);
Router.events.on('routeChangeComplete', progress.finish);
Router.events.on('routeChangeError', progress.finish);

function MyApp({ Component, pageProps }) {
  return (
    <>
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
    <Component {...pageProps} />
  </>
  )
}

export default MyApp
