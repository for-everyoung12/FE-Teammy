import React from "react";
import { Link } from "react-router-dom";
import { Users, GraduationCap, BarChart3 } from "lucide-react";
import { useTranslation } from "../../hook/useTranslation";
import heroImage from "../../assets/banner.png";

const HeroSection = () => {
  const { t } = useTranslation();

  const headingStyle = {
    background: "linear-gradient(90deg,#3182ED,#43D08A,#3182ED)",
    backgroundSize: "200% 200%",
    backgroundPosition: "0% 50%",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: "heroGradientShift 6s ease-in-out infinite",
  };

  return (
    <div className="relative min-h-[50vh] md:min-h-[65vh] flex items-center justify-center overflow-hidden md:mt-10 lg:mt-10 px-4 sm:px-6 bg-white">
      <style>{`
        @keyframes heroGradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="relative z-10 w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
          <div className="flex flex-col space-y-6 md:space-y-8">
            <h1
              className="!font-sans !font-black text-[32px] sm:text-[42px] md:text-[54px] !leading-[120%] !tracking-tight "
              style={headingStyle}
            >
              {t("heroBuildYourFuture") ||
                "Build your future, one capstone at a time."}
            </h1>
            <p className="!font-sans text-sm sm:text-[16px] md:text-[18px] leading-[24px] sm:leading-[28px] ">
              {t("heroDescription") ||
                "Find teammates across majors, connect with mentors, and manage milestones—so you learn faster and deliver better."}
            </p>

            <div className="flex flex-col gap-4 md:gap-6">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <Link
                  to="/forum"
                  className="!font-sans inline-flex items-center justify-center px-5 md:px-6 py-2.5 rounded-full text-sm md:text-base font-semibold text-white"
                  style={{
                    background: "linear-gradient(90deg,#43D08A,#3182ED)",
                    WebkitBackgroundClip: "border-box",
                  }}
                >
                  <span>{t("startMatching") || "Start Matching"}</span>
                  <span className="ml-2">→</span>
                </Link>
              </div>

              <div className="flex flex-wrap gap-4 md:gap-6 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  <span>{t("hero1000Students") || "1000+ students"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                  <span>{t("hero50Mentors") || "50+ mentors"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                  <span>{t("hero300Projects") || "300+ projects"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <img
              src={heroImage}
              alt="Students collaborating"
              className="w-full h-auto max-w-5xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
