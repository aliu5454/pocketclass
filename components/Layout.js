import { useEffect, useState } from "react";
import NewHeader from "./NewHeader";
// import PageHead from "./PageHead";
// import PageTitle from "./PageTitle";
// import Sidebar from "./sidebar";

const Layout = ({
    headTitle,
    children,
    pageTitle,
    pageTitleSub,
    pageClass,
    parent,
    child,
}) => {
    const [height, setHeight] = useState(0);
    useEffect(() => {
        setHeight(window.screen.height);
    }, []);

    

    return (
        <>
            {/* <PageHead headTitle={"Panoply"} /> */}
            <div id="main-wrapper" className={"pageClass"}>
                {/*  */}

                <div className="content-body" style={{ minHeight: height - 122 }}>
                    <div className="container">
                      
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Layout;
