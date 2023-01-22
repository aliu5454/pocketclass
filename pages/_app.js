import '../styles/globals.css'
import '../styles/classHeading.css'
import 'react-toastify/dist/ReactToastify.css';
import ProgressBar from '@badrap/bar-of-progress';
import Router from 'next/router';
import { ToastContainer } from 'react-toastify';

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

  return <Component {...pageProps} />
}

export default MyApp
