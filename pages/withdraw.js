import React, { useEffect, useFetch } from "react";

import PaymentSelect from "./../components/PaymentSelect";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { InformationCircleIcon } from "@heroicons/react/outline";
import { auth, db } from "../firebaseConfig";
import Layout from "../components/Layout";
import Head from "next/head";
import Footer from "../components/Footer";
const WithdrawTransaction = dynamic(
  () => import("../components/WithdrawTransaction"),
  { ssr: false }
);
import moment from "moment";
import NewHeader from "../components/NewHeader";
function Balance({ }) {
  const [myBalance, setMyBalance] = React.useState(0);
  const [accountBalance, setAccountBalance] = React.useState(0);
  const [withdrawn, setWithdrawn] = React.useState(0);
  const [futurePayments, setFuturePayments] = React.useState(0);
  const [payouts, setPayouts] = React.useState([]);
  const [transactions, setTransactions] = React.useState([]);
  const [withdrawDisabled, setWithdrawDisabled] = React.useState({
    accountId: "",
    disabled: true,
  });
  const [pendingPayments, setPendingPayments] = React.useState(0);

  const [user, authStateLoading, error] = useAuthState(auth);
  const [isTheUser, setIsTheUser] = React.useState(false);
  const [anyPendingBanks, setAnyPendingBanks] = React.useState(false);
  const [paymentDetails, setPaymentDetails] = React.useState({
    amount: "",
    currency: "CAD",
    accountNumber: "",
  });
  const [currency, setCurrency] = React.useState([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [currencySelected, setCurrencySelected] = React.useState("cad");
  const [pendingAmount, setPendingAmount] = React.useState(0);
  const [bookingsData, setBookingsData] = React.useState(null);
  const fetchEverthing = async () => {
    toast.loading("Loading Balance and Details...");
    //get account from the firebase
    const accountIdRef = doc(db, "Users", user.uid);
    const accountId = await getDoc(accountIdRef);
    const accountNumber = accountId.data().stripeAccountId;
    if (!accountId.data().stripeAccountId) return;
    const account = await fetch("/api/getValidCurrencies", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const pending = await fetch("/api/anyPendingBanks", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const pendingBanks = await pending.json();
    setAnyPendingBanks(pendingBanks.anyPending);
    Promise.all([account, pendingBanks]).finally(() => {
      toast.dismiss();
    });

    let validCurrencies = await account.json();
    if (!Array.isArray(validCurrencies)) {
      console.error("Expected an array of currencies, but got:", validCurrencies);
      validCurrencies = ['$'];
    }
    setPaymentDetails({ ...paymentDetails, accountNumber: accountNumber });
    // console.log(accountNumber);
    //remove duplicates
    validCurrencies = [...new Set(validCurrencies)];
    setCurrency(validCurrencies);
    await updatePayoutsAndBalance(accountNumber);
  };

  useEffect(() => {
    if (!user) return;
    if (!window) return;
    setTimeout(() => {
      void fetchEverthing();
    }, 1000);
  }, [user]);

  const updatePayoutsAndBalance = async (
    accountNumber = paymentDetails.accountNumber
  ) => {
    // console.log(paymentDetails.accountNumber);
    if (!accountNumber) return;
    toast.loading("Loading Balance and Details...");
    let payouts = fetch("/api/getPayouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountId: accountNumber,
      }),
    }).then((res) => {
      res.json().then((payoutsReceived) => {
        if (!Array.isArray(payoutsReceived)) {
          console.error("API error:", payoutsReceived.error || "Unexpected response");
          return; // Or handle error in UI
        }
        let payoutsReceivedObj = payoutsReceived.map((payout) => {
          return {
            ...payout,
            name: user?.name,
            email: user?.email,
            phone: user?.phone,
            location: user?.location,
          };
        });

        let withdrawn = 0;
        payoutsReceived.forEach((payout) => {
          withdrawn += payout.amount;
        });

        setWithdrawn(withdrawn);
        setPayouts(payoutsReceived);
        // console.log(payoutsReceived);
      });
    });
    let getBalanceObject = fetch("/api/getBalanceObj", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountId: accountNumber,
      }),
    });
    getBalanceObject.then((res) => {
      res.json().then((balanceObj) => {
        if (Array.isArray(balanceObj.available) && balanceObj.available.length > 0) {
          setAccountBalance(balanceObj.available[0].amount / 100);
        } else {
          // Handle case where available is not an array or is empty
          setAccountBalance(0); // or some default value
        }

        if (Array.isArray(balanceObj.pending) && balanceObj.pending.length > 0) {
          setPendingAmount(balanceObj.pending[0].amount / 100);
        } else {
          // Handle case where pending is not an array or is empty
          setPendingAmount(0); // or some default value
        }
      });
    });
    let banks = fetch("/api/getApprovedBankAccounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connectedAccountId: accountNumber,
      }),
    }).then((res) => {
      res.json().then((bankAccountsReceived) => {
        let finalItems = Array.isArray(bankAccountsReceived.data)
          ? bankAccountsReceived.data.map((item) => ({
            ...item,
            checked: item.checked ? item.checked : false,
          }))
          : [];
      });
    });

    let getHistory = fetch("/api/getHistory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountId: accountNumber,
      }),
    }).then((res) => {
      res.json().then((history) => {
        setTransactions(history.transactions);
      });
    });
    const bookingsQuery = query(
      collection(db, "Bookings"),
      where("instructor_id", "==", user.uid)
    );

    const bookings = await getDocs(bookingsQuery);
    const filteredBookings = bookings.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const bookingsData = filteredBookings.filter(
      (booking) => booking.status != "Pending"
    );

    const paymentIntentIds = bookingsData.map(
      (booking) => booking.paymentIntentId
    );
    const pendingPayments = await fetch("/api/getPendingPayment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentIntentIds,
      }),
    });
    const pendingPaymentsData = await pendingPayments.json();
    console.log(pendingPaymentsData);
    let totalPendingAmount = 0;
    let totalFuturePayments = 0;
    bookingsData.forEach((booking) => {
      let pendingPayment = pendingPaymentsData?.find(
        (paymentIntent) => paymentIntent?.paymentIntent.id === booking.paymentIntentId
      );

      pendingPayment = pendingPayment?.paymentIntent;


      if (pendingPayment) {
        booking.pendingAmount = pendingPayment.amount;
        if (moment.utc(booking.startTime).format("YY DD MM") === (moment.utc().format("YY DD MM")) && !booking.isTransfered) {
          totalPendingAmount += pendingPayment.amount;
        }
        else if (!booking.isTransfered) {
          totalFuturePayments += pendingPayment.amount;
        }
      }
    });
    bookingsData.sort((a, b) => {
      return new Date(b.startTime) - new Date(a.startTime);
    });
    setFuturePayments(totalFuturePayments / 100);
    setBookingsData(bookingsData);
    setPendingPayments(totalPendingAmount / 100);
    Promise.all([getBalanceObject, banks, payouts, getHistory]).finally(() => {
      toast.dismiss();
    });
  };
  const sendEmail = async (targetEmail, targetSubject, targetText, now) => {
    try {
      const res = await fetch("/api/sendEmail", {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: targetSubject,
          text: `${targetText} \n\nTime:${moment(now)?.format?.(
            "DD-MM-YY / hh:mm A"
          )}`,
          to: targetEmail,
        }),
      });
    } catch (error) {
      console.warn(error);
    }
  };

  const handleWithdraw = async () => {
    const { amount, accountNumber } = paymentDetails;
    let currency = currencySelected;
    toast.loading("Processing Withdrawal");
    // if(amount>accountBalance){
    //     alert("Insufficient balance");
    //     return;
    // }
    // Make an API call to your backend to make the payout
    const payout = await fetch("/api/makePayoutToClient", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        balance: amount,
        account: accountNumber,
        currency: currency,
      }),
    });

    if (payout.status === 200) {
      toast.success("Withdrawal Successful");
      updatePayoutsAndBalance();
      await sendEmail(
        user.email,
        "Withdrawal Successful",
        `You have successfully withdrawn ${amount}$ from your account.`,
        new Date()
      );
    } else {
      let response = await payout.json();
      toast.dismiss();
      toast.error(response.result);
    }
  };

  return (
    <>
      <div className="mx-auto">
        <Head>
          <title>Wallet</title>
          <meta name="description" content="Generated by create next app" />
          <link rel="icon" href="/pc_favicon.ico" />
        </Head>
        <NewHeader />
        <div className="max-w-7xl mx-auto px-4 py-8 min-h-[80vh] lg:px-16">
          <div className="col-lg-6">
            {anyPendingBanks && (
              <div className="alert alert-warning" role="alert">
                Additional information is required to make a withdrawal. Please
                click{" "}
                <button
                  style={{ color: "#0000FF" }}
                  onClick={() => {
                    window.open("https://dashboard.stripe.com/");
                  }}
                >
                  here
                </button>{" "}
                to update your bank details.
              </div>
            )}

            {/* <button
              className='btn btn-primary'
              onClick={() => {
                setIsOpen(true);
              }}
            >
              Add Bank Details
            </button> */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <h1 className="text-3xl font-extrabold text-center py-5 pb-0">
                Wallet Management
              </h1>

              <div className="p-6 pt-2">
                <form action="">
                  <div className="space-y-4 md:space-y-0 md:space-x-4 ">
                    <div className="flex flex-row gap-4 flex-wrap justify-between  bg-white p-6 ">
                      <div className="flex-grow bg-gray-100 p-4 py-3 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-gray-700">
                          Pending Funds
                        </p>
                        <h3 className="text-2xl font-bold text-gray-500">
                          {"$" + futurePayments}
                        </h3>
                      </div>
                      <div className="flex-grow bg-gray-100 p-4 py-3 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-gray-700">
                          Available Funds
                        </p>
                        <h3 className="text-2xl font-bold text-green-500">
                          {"$" + pendingPayments}
                        </h3>
                      </div>
                      <div className="flex-grow bg-gray-100 p-4 py-3 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-gray-700">
                          Sent to Stripe
                        </p>
                        <h3 className="text-2xl font-bold text-blue-500">
                          {"$" + accountBalance}
                        </h3>
                      </div>
                    </div>
                    {/* A Notification saying "Incoming Payments" will be processed at End of Day */}
                    <div className="bg-logo-red text-white px-4 py-2 rounded-lg">
                      <div className="flex items-center text-base">
                        <InformationCircleIcon className="h-5 w-5 mr-2" />
                        <p>
                          Available Funds will be sent to Stripe at the end of the day(12 AM UTC).
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header">
                <h4 className="text-3xl font-extrabold text-center py-5">
                  My Balance
                </h4>
              </div>
              <div className="card-body">
                {!bookingsData ? (
                  <div className="space-y-4">
                    {[...Array(1)].map((_, i) => (
                      <div key={i} className="flex space-x-4 animate-pulse">
                        <div className="h-[50vh] w-full bg-gray-300 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto border-collapse border border-gray-200 shadow-md rounded-lg">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 border border-gray-200">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 border border-gray-200">
                            Amount
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 border border-gray-200">
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookingsData.map((transaction, index) => (
                          <tr
                            key={index}
                            className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              } hover:bg-gray-100`}
                          >
                            <td className="px-4 py-2 text-sm text-nowrap text-gray-800 border border-gray-200">
                              {moment(transaction.startTime).format("DD-MM-YY / hh:mm A")}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-800 border border-gray-200">
                              ${(transaction.pendingAmount / 100).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-800 border border-gray-200 capitalize">
                              {moment(transaction.startTime).format("YY DD MM") === moment().format("YY DD MM") && !transaction.isTransfered
                                ? <div className="bg-green-400 text-white p-2 rounded-lg w-max">Available</div>
                                : transaction.isTransfered
                                  ? <div className="bg-blue-400 text-white p-2 rounded-lg w-max">Sent to Stripe</div>
                                  : <div className="bg-red-400 text-white p-2 rounded-lg w-max">Pending</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!bookingsData || !bookingsData.length > 0 && (
                    <div className="text-center">No Transactions</div>
                  )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
export default Balance;
