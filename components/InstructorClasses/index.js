import React, { useEffect } from "react";
import { Tabs } from "antd";
import InfoCard from "../InfoCard";
import InstructorCard from "./InstructorCard";
import StudentCard from "../StudentClasses/StudentCard";
import moment from "moment";
import { useRouter } from 'next/router'

const InstructorClasses = ({ classes, bookings, bookingsByMe, reviews }) => {
  const [selectedStatus, setSelectedStatus] = React.useState("Bookings");
  const router = useRouter();
  const { bookingId, mode } = router.query;
  const now = new Date();
  // If any two bookings have same start time, then they are reduced to one group booking with array of booking id, student id, paymentIntentId
  const groupedAppointments = bookings.reduce((acc, appointment) => {
    const appointmentStart = new Date(appointment.startTime);
    if (appointmentStart <= now) return acc;
    const existing = acc.find(
      (group) => group.startTime == appointment.startTime
    );
    if (existing) {
      existing.bookingId.push(appointment.id);
      existing.studentId.push(appointment.student_id);
      existing.paymentIntentId.push(appointment.paymentIntentId);
      if (appointment.groupSize && appointment.groupSize > 1) {
        existing.student_name.push(appointment.student_name + " x" + appointment.groupSize);
      } else {
        existing.student_name.push(appointment.student_name);
      }
      existing.payment.push({
        bookingId: appointment.id,
        paymentIntentId: appointment.paymentIntentId,
        studentId: appointment.student_id,
      });
    } else {
      let student_name;
      if (appointment.groupSize && appointment.groupSize > 1) {
        student_name = appointment.student_name + " x" + appointment.groupSize;
      } else {
        student_name = appointment.student_name;
      }
      acc.push({
        ...appointment,
        bookingId: [appointment.id],
        studentId: [appointment.student_id],
        paymentIntentId: [appointment.paymentIntentId],
        student_name: [student_name],
        payment: [
          {
            bookingId: appointment.id,
            paymentIntentId: appointment.paymentIntentId,
            studentId: appointment.student_id,
          },
        ],
      });
    }
    return acc;
  }, []);

  const groupedAppointmentsAfter = bookings.reduce((acc, appointment) => {
    const appointmentStart = new Date(appointment.startTime);
    if (appointmentStart > now) return acc;
    const existing = acc.find(
      (group) => group.startTime == appointment.startTime
    );
    if (existing) {
      existing.bookingId.push(appointment.id);
      existing.studentId.push(appointment.student_id);
      existing.paymentIntentId.push(appointment.paymentIntentId);
      if (appointment.groupSize && appointment.groupSize > 1) {
        existing.student_name.push(appointment.student_name + " x" + appointment.groupSize);
      } else {
        existing.student_name.push(appointment.student_name);
      }
      existing.payment.push({
        bookingId: appointment.id,
        paymentIntentId: appointment.paymentIntentId,
        studentId: appointment.student_id,
      });
    } else {
      let student_name;
      if (appointment.groupSize && appointment.groupSize > 1) {
        student_name = appointment.student_name + " x" + appointment.groupSize;
      } else {
        student_name = appointment.student_name;
      }
      acc.push({
        ...appointment,
        bookingId: [appointment.id],
        studentId: [appointment.student_id],
        paymentIntentId: [appointment.paymentIntentId],
        student_name: [student_name],
        payment: [
          {
            bookingId: appointment.id,
            paymentIntentId: appointment.paymentIntentId,
            studentId: appointment.student_id,
          },
        ],
      });
    }
    return acc;
  }, []);

  const groupedBookingsByMe = bookingsByMe.reduce((acc, appointment) => {
    const existing = acc.find(
      (group) => group.startTime === appointment.startTime
    );
    if (existing) {
      existing.bookingId.push(appointment.id);
      existing.studentId.push(appointment.student_id);
      existing.paymentIntentId.push(appointment.paymentIntentId);
      if (appointment.groupSize && appointment.groupSize > 1) {
        existing.student_name.push(appointment.student_name + " x" + appointment.groupSize);
      } else {
        existing.student_name.push(appointment.student_name);
      }
      existing.payment.push({
        bookingId: appointment.id,
        paymentIntentId: appointment.paymentIntentId,
        studentId: appointment.student_id,
      });
    } else {
      let student_name;
      if (appointment.groupSize && appointment.groupSize > 1) {
        student_name = appointment.student_name + " x" + appointment.groupSize;
      } else {
        student_name = appointment.student_name;
      }
      acc.push({
        ...appointment,
        bookingId: [appointment.id],
        studentId: [appointment.student_id],
        paymentIntentId: [appointment.paymentIntentId],
        student_name: [student_name],
        payment: [
          {
            bookingId: appointment.id,
            paymentIntentId: appointment.paymentIntentId,
            studentId: appointment.student_id,
          },
        ],
      });
    }
    console.log(acc)
    return acc;
  }, []);

  const handleTabChange = (key) => {
    setSelectedStatus(key);
  };
  return (
    <div>
      <Tabs
        style={{ maxWidth: "1450px", width: "100%", margin: "auto" }}
        activeKey={selectedStatus}
        onChange={handleTabChange}
        className="flex justify-center mb-8"
      >
        <Tabs.TabPane tab="Upcoming Bookings" key="Bookings" />
        <Tabs.TabPane tab="Previous Bookings" key="CompletedBookings" />
        <Tabs.TabPane tab="Classes" key="Classes" />
        <Tabs.TabPane tab="Bookings By Me" key="bookingsByMe" />
      </Tabs>

      <div className="max-w-[1450px] mx-auto mb-4">
        {selectedStatus === "Bookings" && groupedAppointments.length !== 0 ? (
          groupedAppointments.map((appointment) => {
            const classData = classes.find(
              (c) => c.id === appointment.class_id
            );
            return classData ? (
              <InstructorCard
                key={appointment.id}
                appointmentId={appointment.bookingId}
                id={classData.id}
                type={
                  classData.SubCategory ? classData.SubCategory : classData.Type
                }
                latitude={classData.latitude}
                name={classData.Name}
                images={classData.Images}
                description={classData.Description}
                longitude={classData.longitude}
                reviews={reviews}
                address={classData.Address}
                price={classData.Price}
                category={classData.category}
                status={appointment.status}
                start={appointment.startTime}
                end={appointment.endTime}
                classCreator={classData.classCreator}
                studentId={appointment.studentId}
                student_name={appointment.student_name}
                paymentIntentId={appointment.paymentIntentId}
                isBooking={true}
                payment={appointment.payment}
              />
            ) : null;
          })
        ) : (
          <p className="text-center text-xl w-full text-logo-red">
            {selectedStatus === "Bookings" ? "No Classes Found" : ""}
          </p>
        )}

        {selectedStatus === "CompletedBookings" && groupedAppointmentsAfter.length !== 0 ? (
          groupedAppointmentsAfter.map((appointment) => {
            const classData = classes.find(
              (c) => c.id === appointment.class_id
            );
            return classData ? (
              <InstructorCard
                key={appointment.id}
                appointmentId={appointment.bookingId}
                id={classData.id}
                type={
                  classData.SubCategory ? classData.SubCategory : classData.Type
                }
                latitude={classData.latitude}
                name={classData.Name}
                images={classData.Images}
                description={classData.Description}
                longitude={classData.longitude}
                reviews={reviews}
                address={classData.Address}
                price={classData.Price}
                category={classData.category}
                status={appointment.status}
                start={appointment.startTime}
                end={appointment.endTime}
                classCreator={classData.classCreator}
                studentId={appointment.studentId}
                student_name={appointment.student_name}
                paymentIntentId={appointment.paymentIntentId}
                isBooking={true}
                payment={appointment.payment}
              />
            ) : null;
          })
        ) : (
          <p className="text-center text-xl w-full text-logo-red">
            {selectedStatus === "CompletedBookings" ? "No Classes Found" : ""}
          </p>
        )}

        {selectedStatus === "bookingsByMe" && groupedBookingsByMe.length !== 0 ? (
          groupedBookingsByMe.map((appointment) => {
            const classData = classes.find(
              (c) => c.id === appointment.class_id
            );
            return classData ? (
              <StudentCard
                key={appointment.id}
                appointmentId={appointment.bookingId[0]}
                id={classData.id}
                type={
                  classData.SubCategory ? classData.SubCategory : classData.Type
                }
                latitude={classData.latitude}
                name={classData.Name}
                images={classData.Images}
                description={classData.Description}
                longitude={classData.longitude}
                reviews={reviews}
                address={classData.Address}
                price={classData.Price}
                category={classData.category}
                status={appointment.status}
                start={appointment.startTime}
                end={appointment.endTime}
                classCreator={classData.classCreator}
                studentId={appointment.studentId}
                paymentMethod={appointment.paymentMethod}
                studentName={appointment.student_name}
                paymentIntentId={appointment.paymentIntentId}
                timezone={appointment.timezone || "America/Toronto"}
                rescheduleBooking={bookingId === appointment.id && mode === "reschedule"}
                cancelBooking={bookingId === appointment.id && mode === "cancel"}
              />
            ) : null;
          })
        ) : (
          <p className="text-center text-xl w-full text-logo-red">
            {selectedStatus === "bookingsByMe" ? "No Classes Found" : ""}
          </p>
        )}

        {/* For Selected Status Classes display classes */}
        {selectedStatus === "Classes" && classes.length !== 0 ? (
          classes.map((classData) => {
            return (
              <InstructorCard
                key={classData.id}
                id={classData.id}
                type={
                  classData.SubCategory ? classData.SubCategory : classData.Type
                }
                latitude={classData.latitude}
                name={classData.Name}
                images={classData.Images}
                description={classData.Description}
                longitude={classData.longitude}
                reviews={reviews}
                address={classData.Address}
                price={classData.Price}
                category={classData.category}
                status={classData.status}
                start={classData.startTime}
                end={classData.endTime}
                classCreator={classData.classCreator}
                isBooking={false}
              />
            );
          })
        ) : (
          <p className="text-center text-xl w-full text-logo-red">
            {selectedStatus === "Classes" ? "No Classes Found" : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default InstructorClasses;
