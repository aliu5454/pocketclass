import { useRouter } from "next/router";
import React from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Login from "./Login";
import LoginForm from "../components/LoginForm"
import Register from "./Register";
import { auth } from "/firebaseConfig"
import { onAuthStateChanged } from "firebase/auth";
import Home from "./home";

export default function Account() {
  const [user, setUser] = React.useState(null);
  const [authState, setAuthState] = React.useState(null);

  React.useEffect(() => {
    const unSubscribeAuth = onAuthStateChanged(auth,
      async authenticatedUser => {
        if (authenticatedUser) {
          setUser(authenticatedUser.email);
          setAuthState('home');
        } else {
          setUser(null);
          setAuthState('login');
        }
      })

    return unSubscribeAuth;
  }, [user])

  // if(authState === null) return <div><Header /><Footer /></div>
  if (authState === 'login') return <div><Header /><Login setAuthState={setAuthState} setUser={setUser} /><Footer /></div>
  if (authState === 'register') return <div><Header /><Register setAuthState={setAuthState} setUser={setUser} /><Footer /></div>
  if (user) return <Home user={user} setAuthState={setAuthState} setUser={setUser} />
}