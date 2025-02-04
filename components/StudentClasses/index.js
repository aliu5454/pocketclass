import React, { useEffect } from 'react'
import { Tabs } from "antd";
import InfoCard from '../InfoCard';
import StudentCard from './StudentCard';
import moment from 'moment';
import { useRouter } from 'next/router';

const StudentClasses = ({ appointments,classDetails,reviews }) => {
    const [selectedStatus, setSelectedStatus] = React.useState("Upcoming");
    const [filteredAppointments, setFilteredAppointments] = React.useState(appointments);

    const router = useRouter();
    const { bookingId, mode } = router.query;
    console.log(bookingId, mode);

    useEffect(() => {
        if (selectedStatus === "All") {
            setFilteredAppointments(appointments);
        } else {
            const filtered = appointments.filter((appointment) => {
                const startDate = moment.utc(appointment.startTime).format("YYYY-MM-DD HH:mm");
                const today = moment().tz(appointment.timezone || "America/Toronto").format("YYYY-MM-DD HH:mm");
                if (selectedStatus === "Upcoming") {
                    return startDate > today;
                } else {
                    return startDate < today;
                }
            });
            setFilteredAppointments(filtered);
        }
    }, [selectedStatus, appointments]);

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
                <Tabs.TabPane tab="Upcoming" key="Upcoming" />
                <Tabs.TabPane tab="Completed" key="Completed" />
            </Tabs>

            <div className='max-w-[1450px] mx-auto mb-4'>
                {filteredAppointments.length !== 0 ? (
                    filteredAppointments.map((appointment) => {
                        const classData = classDetails[appointment.class_id];
                        return classData ? (
                            <StudentCard
                                key={appointment.id}
                                appointmentId={appointment.id}
                                id={classData.id}
                                type={classData.SubCategory?(classData.SubCategory):(classData.Type)}
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
                                studentId={appointment.student_id}
                                paymentIntentId={appointment.paymentIntentId}
                                studentName={appointment.student_name}
                                timezone={appointment.timezone || "America/Toronto"}
                                rescheduleBooking={bookingId === appointment.id && mode === "reschedule"}
                                cancelBooking={bookingId === appointment.id && mode === "cancel"}
                            />
                        ) : null;
                    })
                ) : (
                    <p className="text-center text-xl w-full text-logo-red">
                        No Classes Found
                    </p>
                )}
            </div>
        </div>
    )
}

export default StudentClasses