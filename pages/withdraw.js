import React, { useEffect, useFetch } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
  const [currentMonthEarnings, setCurrentMonthEarnings] = React.useState(0);
  const [previousMonthEarnings, setPreviousMonthEarnings] = React.useState(0);
  const [chartData, setChartData] = React.useState({
    labels: [],
    datasets: [
      {
        label: 'Funds Transferred',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  });

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

    // Calculate monthly earnings
    const now = moment();
    const thirtyDaysAgo = moment().subtract(30, 'days');
    const sixtyDaysAgo = moment().subtract(60, 'days');

    const currentMonthTotal = bookingsData
      .filter(booking => moment(booking.startTime).isBetween(thirtyDaysAgo, now))
      .reduce((sum, booking) => sum + (booking.pendingAmount || 0), 0);

    const previousMonthTotal = bookingsData
      .filter(booking => moment(booking.startTime).isBetween(sixtyDaysAgo, thirtyDaysAgo))
      .reduce((sum, booking) => sum + (booking.pendingAmount || 0), 0);

    setCurrentMonthEarnings(currentMonthTotal / 100);
    setPreviousMonthEarnings(previousMonthTotal / 100);

    // Update chart data when bookings data is processed
    if (bookingsData) {
      const sortedBookings = [...bookingsData].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      const labels = sortedBookings.map(booking => moment(booking.startTime).format('MMM DD'));
      const data = sortedBookings.map(booking => booking.pendingAmount / 100);

      setChartData({
        labels,
        datasets: [
          {
            label: 'Funds Transferred',
            data,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }
        ]
      });
    }

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

  const exportToXLSX = () => {
    const data = bookingsData.map(booking => ({
      Date: moment(booking.startTime).format("DD-MM-YY / hh:mm A"),
      Amount: `$${(booking.pendingAmount / 100).toFixed(2)}`,
      Type: moment(booking.startTime).format("YY DD MM") === moment().format("YY DD MM") && !booking.isTransfered
        ? "Available"
        : booking.isTransfered
          ? "Sent to Stripe"
          : "Pending"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "transactions.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text("Transaction History", 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${moment().format("DD-MM-YYYY HH:mm")}`, 14, 22);

    const data = bookingsData.map(booking => [
      moment(booking.startTime).format("DD-MM-YY / hh:mm A"),
      `$${(booking.pendingAmount / 100).toFixed(2)}`,
      moment(booking.startTime).format("YY DD MM") === moment().format("YY DD MM") && !booking.isTransfered
        ? "Available"
        : booking.isTransfered
          ? "Sent to Stripe"
          : "Pending"
    ]);

    doc.autoTable({
      head: [['Date', 'Amount', 'Type']],
      body: data,
      startY: 30,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
    });

    doc.save("transactions.pdf");
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
                  <div className="flex flex-col gap-4 items-center md:flex-row">
                    {/* Chart Section - Takes 2/3 of the space */}
                    <div className="w-full md:w-2/3 bg-white p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">Funds Transfer History</h3>
                      <div className="h-[300px]">
                        <Line 
                          data={chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                              },
                              title: {
                                display: true,
                                text: 'Funds Transferred Over Time'
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Funds Section - Takes 1/3 of the space */}
                    <div className="w-full md:w-1/3 flex flex-col gap-4">
                      <div className="bg-gray-100 p-4 py-3 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-gray-700">
                          Total Funds
                        </p>
                        <h3 className="text-2xl font-bold text-blue-500">
                          {"$" + (futurePayments + pendingPayments + accountBalance)}
                        </h3>
                      </div>
                      <div className="bg-gray-100 p-4 py-3 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-gray-700">
                          Earnings This Month
                        </p>
                        <h3 className="text-2xl font-bold text-green-500">
                          {"$" + currentMonthEarnings.toFixed(2)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {previousMonthEarnings > 0 ? (
                            <span className={currentMonthEarnings >= previousMonthEarnings ? "text-green-500" : "text-red-500"}>
                              {((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings * 100).toFixed(1)}% vs last month
                            </span>
                          ) : (
                            <span className="text-gray-500"></span>
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-100 p-4 py-3 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-gray-700">
                          Pending Funds
                        </p>
                        <h3 className="text-2xl font-bold text-gray-500">
                          {"$" + futurePayments}
                        </h3>
                      </div>
                      <div className="bg-gray-100 p-4 py-3 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-gray-700">
                          Sent to Stripe
                        </p>
                        <h3 className="text-2xl font-bold text-blue-500">
                          {"$" + accountBalance}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Notification Section */}
                  <div className="mt-4 bg-logo-red text-white px-4 py-2 rounded-lg">
                    <div className="flex items-center text-base">
                      <InformationCircleIcon className="h-5 w-5 mr-2" />
                      <p>
                        Available Funds will be sent to Stripe at the end of the day(12 AM UTC).
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <h4 className="text-3xl font-extrabold text-center py-5">
                    My Balance
                  </h4>
                  <div className="relative">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      Export
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10">
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            exportToXLSX();
                            setIsOpen(false);
                          }}
                        >
                          Export to XLSX
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            exportToPDF();
                            setIsOpen(false);
                          }}
                        >
                          Export to PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
