import ClassroomLayout from "../ClassroomLayout";
import Link from "next/link";
import { Button } from "@mui/base";

function ClassroomFooter({ isHome = true }) {
  return (
    <div className="flex justify-start items-stretch flex-col pt-20 pb-4 section-spacing">
      {isHome && <ClassroomLayout />}
      <div className="flex justify-between items-center flex-col md:flex-row gap-10 md:gap-2 w-full md:w-[80%] self-center mt-24 [font-family:Inter,sans-serif] text-base font-semibold text-[#261f22] grow-0 shrink-0 basis-auto m-0 p-0">
        <div className="flex justify-start items-center flex-col md:flex-row gap-1 md:gap-[30px]">
          <p className="hidden md:block">© pocketclass</p>
          <p className="hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150">
            <Link href="/community/about">About</Link>
          </p>
          <p className="hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150">
            <Link href="/community/instructorguide">Guide</Link>
          </p>
          {/* <p className="hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150">
            <Link href="/community/studentguide">Student Guide</Link>
          </p> */}
          <p className="hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150">
            <Link href="https://medium.com/@pocketclass">
              <a target="_blank">Blog</a>
            </Link>
          </p>
          <p className="hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150">
            <Link href={`/support`}>Help</Link>
          </p>
          <p className="hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150">
            <Link href="/community/termsandconditions">
              Terms
            </Link>
          </p>
        </div>
        <div className="flex gap-0.5 md: justify-start items-center flex-col md:flex-row">
          <p className="hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150">
            <Link href={`https://github.com/aliu5454/pocketclass`}><svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 transition-colors duration-200 ease-out hover:fill-logo-red"
              fill="currentColor"
              style={{ color: "#333" }}
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg></Link>
          </p>
          <p className="md:ml-[30px] mt-[10px] md:mt-[0px] hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150">
            <Link href="https://www.instagram.com/pocketclass.ca/">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 transition-colors duration-200 ease-out hover:fill-logo-red"
                fill="black"
                style={{ color: "#c13584" }}
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </Link>
          </p>
        </div>

        <p className="block md:hidden">© pocketclass</p>

        <div className="flex md:hidden gap-4 items-center">
          <Link href="/Login">
            <p className="cursor-pointer [font-family:Inter,sans-serif] text-base font-semibold text-[#261f22] grow-0 shrink-0 basis-auto m-0 p-0">
              Log in
            </p>
          </Link>
          <Link href="/Register">
            <Button className="bg-transparent [font-family:Inter,sans-serif] text-base font-semibold text-[#261f22] min-w-[91px] h-[43px] w-[91px] cursor-pointer block box-border grow-0 shrink-0 basis-auto ml-[31px] rounded-[100px] border-2 border-solid border-[#261f22]">
              Sign up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ClassroomFooter;
