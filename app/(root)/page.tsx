"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";
import { Interview } from "@/types";

function Home() {
  const [user, setUser] = useState(null);
  const [userInterviews, setUserInterviews] = useState<Interview[]>([]);
  const [allInterview, setAllInterview] = useState<Interview[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser?.id) {
        const [userInterviewsData, allInterviewData] = await Promise.all([
          getInterviewsByUserId(currentUser.id),
          getLatestInterviews({ userId: currentUser.id }),
        ]);
        setUserInterviews(userInterviewsData || []);
        setAllInterview(allInterviewData || []);
      }
    };
    fetchData();
  }, []);

  const handleDelete = (id: string) => {
    setUserInterviews((prev) =>
      prev.filter((interview) => interview.id !== id)
    );
    // Force reload the page after deletion to ensure data is refreshed
    window.location.reload();
  };

  const hasPastInterviews = userInterviews.length > 0;
  const hasUpcomingInterviews = allInterview.length > 0;

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>
            Perfect Your Project Defense with AI-Powered Coaching & Feedback
          </h2>
          <p className="text-lg">
            Practice real defense questions & get instant expert feedback on
            your academic project
          </p>

          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Start Defense Preparation</Link>
          </Button>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Defense Sessions</h2>

        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <p>You haven&apos;t participated in any defense sessions yet</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Available Defense Types</h2>

        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            allInterview.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <p>There are no defense sessions available</p>
          )}
        </div>
      </section>
    </>
  );
}

export default Home;
