import React from "react";
import {
  Users,
  UserCheck,
  BarChart3,
  MessageCircle,
  Calendar,
  Star,
  Search,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "../../hook/useTranslation";

const FeaturesSection = () => {
  const { t } = useTranslation();
  const stats = [
    { number: "500+", label: "statsActiveProjects" },
    { number: "2,000+", label: "statsStudents" },
    { number: "95%", label: "statsSuccessRate" },
  ];

  const features = [
    {
      icon: Users,
      title: "featureTeammates",
      desc: "featureTeammatesDesc",
    },
    {
      icon: UserCheck,
      title: "featureMentor",
      desc: "featureMentorDesc",
    },
    {
      icon: BarChart3,
      title: "featureProjectManagementTitle",
      desc: "featureProjectManagementDesc",
    },
    {
      icon: MessageCircle,
      title: "featureCommunication",
      desc: "featureCommunicationDesc",
    },
    {
      icon: Calendar,
      title: "featurePlanSchedule",
      desc: "featurePlanScheduleDesc",
    },
    {
      icon: Star,
      title: "featureEvaluation",
      desc: "featureEvaluationDesc",
    },
  ];

  return (
    <section className="bg-white">
      <div className="w-full h-full bg-gray-100 py-10">
        <div className="max-w-[98rem] mx-auto grid grid-cols-1 md:grid-cols-3 gap-20 text-center">
          {stats.map((item, idx) => (
            <div key={idx}>
              <h2 className="text-[48px] mb-2 font-extrabold bg-gradient-to-r from-[rgb(66,100,215)] to-[rgb(76,205,187)] bg-clip-text text-transparent">
                {item.number}
              </h2>
              <p className="text-gray-600 text-[14px]">
                {t(item.label) || item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center mb-5 py-10">
        <h2
          className="text-[40px] md:text-[48px] font-black mb-4"
          style={{
            background: "linear-gradient(90deg,#3182ED,#43D08A)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t("featuresTitle") || "Key Features"}
        </h2>
        <p className=" text-[16px]">
          {t("featuresSubtitle") ||
            "Everything you need to succeed in your capstone project."}
        </p>
      </div>

      <div className="max-w-[80rem] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-6">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-8 text-center border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col items-center"
            >
              <div className="mb-6">
                <IconComponent className="w-12 h-12 text-gray-900 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t(feature.title) || feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t(feature.desc) || feature.desc}
              </p>
            </div>
          );
        })}
      </div>

      <div className="max-w-6xl mx-auto mt-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a]">
          {t("howItWorks") || "How It Works"}
        </h2>
        <p className="text-gray-500 mt-2">
          {t("howItWorksSubtitle") ||
            "A simple flow to kick-start your capstone journey."}
        </p>

        <div className="relative mt-8">
          <div className="border-t border-gray-200" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6">
            {[
              {
                icon: Users,
                title: "stepLogin",
                desc: "stepLoginDesc",
                bg: "bg-blue-200",
                color: "text-blue-700",
              },
              {
                icon: Search,
                title: "stepSearch",
                desc: "stepSearchDesc",
                bg: "bg-pink-200",
                color: "text-pink-600",
              },
              {
                icon: MessageCircle,
                title: "stepDiscuss",
                desc: "stepDiscussDesc",
                bg: "bg-green-200",
                color: "text-green-700",
              },
              {
                icon: CheckCircle,
                title: "stepBuild",
                desc: "stepBuildDesc",
                bg: "bg-orange-200",
                color: "text-orange-700",
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${s.bg}`}
                  >
                    <Icon className={`w-8 h-8 ${s.color}`} />
                  </div>
                  <h4 className="font-semibold">{t(s.title) || s.title}</h4>
                  <p className="text-sm text-gray-500 mt-2 max-w-[16rem]">
                    {t(s.desc) || s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-20 py-16 px-6 text-center text-white"
        style={{
          background: "linear-gradient(90deg, #4264d7 0%, #43D08A 100%)",
        }}
      >
        <h2 className="text-[40px] md:text-[48px] font-black mb-4">
          {t("ctaReady") || "Ready to start your project?"}
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          {t("ctaDescription") ||
            "Join a vibrant student community to find teammates, mentors, and growth opportunities—today."}
        </p>

        <div className="flex flex-wrap justify-center gap-8 text-sm md:text-base">
          {[
            "ctaBenefitFree",
            "ctaBenefitUI",
            "ctaBenefitSupport",
            "ctaBenefitSecure",
          ].map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>{t(benefit) || benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
